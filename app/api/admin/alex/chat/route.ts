import { streamText, tool, generateText, createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { z } from "zod"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAlexSystemPrompt } from "@/lib/admin/alex-system-prompt"
import { getSandraVoice } from "@/lib/admin/get-sandra-voice"
import { saveChatMessage, createNewChat, getOrCreateActiveChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"
import { readFile } from "fs/promises"
import { join } from "path"
import { createBackup, getBackup, restoreFromBackup, getRecentBackups } from "@/lib/admin/alex-backup-manager"
import Anthropic from '@anthropic-ai/sdk'
import { convertToolsToAnthropicFormat, convertMessagesToAnthropicFormat } from "@/lib/admin/anthropic-tool-converter"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// Initialize Resend client - will be null if API key is missing
let resend: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.error("[Alex] ⚠️ Failed to initialize Resend client:", error)
}

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    console.log('[Alex] 📥 POST request received')
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      console.log('[Alex] ❌ Unauthorized - no auth user')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[Alex] ✅ Auth user found:', authUser.id)
    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      console.log('[Alex] ❌ Admin access required - user email:', user?.email)
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log('[Alex] ✅ Admin user verified:', user.email)
    const body = await req.json()
    const { messages, chatId } = body
    
    // ✅ ADD DETAILED LOGGING
    const lastRequestMessage = messages?.[messages.length - 1]
    let lastMessagePreview = 'N/A'
    if (lastRequestMessage?.content) {
      if (typeof lastRequestMessage.content === 'string') {
        lastMessagePreview = lastRequestMessage.content.substring(0, 50)
      } else if (Array.isArray(lastRequestMessage.content)) {
        // Extract text from content array
        const textPart = lastRequestMessage.content.find((p: any) => p.type === 'text')
        if (textPart?.text) {
          lastMessagePreview = textPart.text.substring(0, 50)
        } else {
          lastMessagePreview = `[${lastRequestMessage.content.length} parts]`
        }
      } else {
        lastMessagePreview = String(lastRequestMessage.content).substring(0, 50)
      }
    }
    
    console.log('[Alex] 📨 Request body:', {
      messageCount: messages?.length || 0,
      chatId: chatId ?? 'not provided',
      lastMessagePreview
    })

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages is required and must be a non-empty array" }, { status: 400 })
    }

    // Get or create chat - ALWAYS prioritize provided chatId
    let activeChatId = chatId
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (activeChatId === null || activeChatId === undefined) {
      // ✅ Check for existing active chat first (prevents creating new chat every time)
      // Only use getOrCreateActiveChat if chatId is explicitly not provided
      console.log('[Alex] 🔍 No chatId provided in request body, checking for existing active chat...')
      const existingChat = await getOrCreateActiveChat(user.id)
      activeChatId = existingChat.id
      console.log('[Alex] 🔄 Using existing active chat:', activeChatId, '(title:', existingChat.chat_title, ')')
    } else {
      // ✅ CRITICAL: If chatId is provided, use it - don't call getOrCreateActiveChat
      // This ensures we use the exact chat the user selected, not the "most recent"
      console.log('[Alex] ✅ Using provided chat ID from request body:', activeChatId)
      
      // Verify the chat exists and belongs to this user
      const chatExists = await sql`
        SELECT id FROM admin_agent_chats
        WHERE id = ${activeChatId} AND admin_user_id = ${user.id}
        LIMIT 1
      `
      
      if (chatExists.length === 0) {
        console.log('[Alex] ⚠️ Provided chatId does not exist or does not belong to user, falling back to active chat')
        const existingChat = await getOrCreateActiveChat(user.id)
        activeChatId = existingChat.id
        console.log('[Alex] 🔄 Using fallback active chat:', activeChatId)
      }
    }

    // Process messages - preserve images and text content
    const modelMessages = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
        // Preserve full content structure for images
        if (m.content && Array.isArray(m.content)) {
          // Check if message has images
          const hasImages = m.content.some((p: any) => p && p.type === "image")
          if (hasImages) {
            // Preserve full content array with images for Anthropic
            return {
              role: m.role as "user" | "assistant" | "system",
              content: m.content, // Keep full array with images
            }
          }
        }

        // For text-only messages, extract text content
        let content = ""

        // Extract text from parts if available
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p && p.type === "text")
          if (textParts.length > 0) {
            content = textParts.map((p: any) => p.text || "").join("\n")
          }
        }

        // Fallback to content string
        if (!content && m.content) {
          if (Array.isArray(m.content)) {
            const textParts = m.content.filter((p: any) => p && p.type === "text")
            content = textParts.map((p: any) => p.text || "").join("\n")
          } else {
            content = typeof m.content === "string" ? m.content : String(m.content)
          }
        }

        return {
          role: m.role as "user" | "assistant" | "system",
          content: content.trim(),
        }
      })
      .filter((m: any) => {
        // Filter: keep messages with content (text or images)
        if (Array.isArray(m.content)) {
          // Has images or text parts
          return m.content.length > 0
        }
        return m.content && m.content.length > 0
      })

    // Extract image URLs from user messages (for compose_email tool)
    const extractImageUrls = (message: any): string[] => {
      const urls: string[] = []
      if (Array.isArray(message.content)) {
        message.content.forEach((part: any) => {
          if (part && part.type === "image" && part.image) {
            // Handle different image formats: { image: "url" } or { image: { url: "..." } }
            const imageUrl = typeof part.image === 'string' ? part.image : part.image?.url
            if (imageUrl && typeof imageUrl === 'string') {
              urls.push(imageUrl)
            }
          }
        })
      }
      return urls
    }

    // Collect all image URLs from recent user messages (last 5 messages)
    const recentUserMessages = modelMessages
      .filter((m: any) => m.role === 'user')
      .slice(-5)
    const availableImageUrls = recentUserMessages
      .flatMap((m: any) => extractImageUrls(m))
      .filter((url: string) => url && url.length > 0)

    // Save user message (extract text for database, images are in message content)
    const lastUserMessage = modelMessages[modelMessages.length - 1]
    if (lastUserMessage && lastUserMessage.role === 'user') {
      // Extract text content for database storage
      let textContent = ""
      if (Array.isArray(lastUserMessage.content)) {
        const textParts = lastUserMessage.content.filter((p: any) => p && p.type === "text")
        textContent = textParts.map((p: any) => p.text || "").join("\n")
      } else {
        textContent = typeof lastUserMessage.content === "string" ? lastUserMessage.content : String(lastUserMessage.content || "")
      }
      
      // Always save user messages, even if they only contain images (textContent will be empty)
      // Use a placeholder for image-only messages to ensure they're persisted
      const contentToSave = textContent.trim() || (Array.isArray(lastUserMessage.content) && lastUserMessage.content.some((p: any) => p && p.type === "image") ? "[Image message]" : "")
      
      if (contentToSave) {
        await saveChatMessage(activeChatId, 'user', contentToSave)
      }
    }

    // Helper functions for email tools
    const stripHtml = (html: string): string => {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
        .replace(/<\/p>/gi, '\n\n') // Convert </p> to double newlines
        .replace(/<\/div>/gi, '\n') // Convert </div> to newlines
        .replace(/<\/h[1-6]>/gi, '\n\n') // Convert </h1-6> to double newlines
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'") // Replace &#39; with '
        .replace(/&#x27;/g, "'") // Replace &#x27; with '
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines to double
        .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs to single space
        .replace(/[ \t]*\n[ \t]*/g, '\n') // Clean up spaces around newlines
        .trim()
    }

    const generateSubjectLine = async (intent: string, emailType: string): Promise<string> => {
      try {
        const { text } = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          system: `You are Sandra's email marketing assistant. Generate warm, personal subject lines that match Sandra's voice: friendly, empowering, conversational. Keep it under 50 characters.`,
          prompt: `Generate a subject line for: ${intent}\n\nEmail type: ${emailType}\n\nReturn ONLY the subject line, no quotes, no explanation.`,
          maxOutputTokens: 50,
        })
        return text.trim()
      } catch (error: any) {
        console.error("[Alex] Error generating subject line:", error)
        return `Update from SSELFIE Studio`
      }
    }

    // Load system prompt with Sandra's voice
    let systemPrompt = await getAlexSystemPrompt()
    
    // Add image context to system prompt if images are available
    if (availableImageUrls.length > 0) {
      systemPrompt += `\n\n**IMPORTANT: Image Context**
Sandra has shared ${availableImageUrls.length} image(s) in this conversation. When creating emails using the compose_email tool, you MUST include these image URLs in the imageUrls parameter:
${availableImageUrls.map((url: string, idx: number) => `${idx + 1}. ${url}`).join('\n')}

These images should be included naturally in the email HTML.`
    }

    // Define tools
    const createDatabaseTableTool = tool({
      description: `Create new database table with proper schema. 
      This generates SQL that Sandra must approve before execution.
      Use this when Sandra asks to create a new table or track new data.`,
      parameters: z.object({
        tableName: z.string().describe("Name of the table to create"),
        columns: z.array(
          z.object({
            name: z.string().describe("Column name"),
            type: z.string().describe("Column type (TEXT, INTEGER, TIMESTAMPTZ, JSONB, etc.)"),
            constraints: z.string().optional().describe("Additional constraints (PRIMARY KEY, REFERENCES table(column), NOT NULL, etc.)")
          })
        ).describe("Array of column definitions"),
        indexes: z.array(z.string()).optional().describe("Optional array of CREATE INDEX statements")
      }),
      execute: async ({ tableName, columns, indexes }) => {
        try {
          // Validate table name (prevent SQL injection)
          if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
            return {
              error: "Invalid table name. Use only letters, numbers, and underscores.",
              preview: null
            }
          }

          // Generate SQL
          const columnDefs = columns.map(c => {
            // Validate column name
            if (!/^[a-z_][a-z0-9_]*$/i.test(c.name)) {
              throw new Error(`Invalid column name: ${c.name}`)
            }
            return `  ${c.name} ${c.type}${c.constraints ? ' ' + c.constraints : ''}`
          }).join(',\n')
          
          const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs}\n)`
          
          // Generate index statements
          const indexStatements = indexes || []
          
          // Generate rollback plan
          const rollbackPlan = `DROP TABLE IF EXISTS ${tableName}`
          
          // Generate detailed preview
          const diff = [
            {
              type: "add" as const,
              line: createTableSQL,
              file: `database:${tableName}`
            }
          ]
          
          if (indexStatements.length > 0) {
            indexStatements.forEach((idx: string) => {
              diff.push({
                type: "add" as const,
                line: idx,
                file: `database:${tableName}`
              })
            })
          }

          return {
            success: true,
            preview: "Here's what will change:",
            diff: diff,
            affectedFiles: [`database:${tableName}`],
            rollbackPlan: rollbackPlan,
            needsApproval: true,
            approvalType: "button_click",
            expiresIn: "5 minutes",
            previewSQL: createTableSQL,
            indexStatements: indexStatements,
            executeUrl: `/api/admin/alex/execute-migration`,
            message: `I've generated the SQL to create table "${tableName}". Review it below and approve when ready.`
          }
        } catch (error: any) {
          console.error("[Alex] Error creating table SQL:", error)
          return {
            error: error.message || "Failed to generate table SQL",
            preview: null
          }
        }
      }
    })

    const createApiEndpointTool = tool({
      description: `Create new API endpoint file with proper structure.
      This generates TypeScript code for a Next.js API route that Sandra can review and approve.
      Use this when Sandra asks to create a new API endpoint or add functionality.`,
      parameters: z.object({
        path: z.string().describe("API path without /api prefix, e.g., 'admin/get-inactive-users'"),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe("HTTP method for the endpoint"),
        description: z.string().describe("Description of what this endpoint does"),
        requiresAuth: z.boolean().default(true).describe("Whether the endpoint requires authentication"),
        requiresAdmin: z.boolean().default(false).describe("Whether the endpoint requires admin access")
      }),
      execute: async ({ path, method, description, requiresAuth, requiresAdmin }) => {
        try {
          // Validate path (prevent directory traversal)
          if (!/^[a-z0-9\/_-]+$/i.test(path)) {
            return {
              error: "Invalid path. Use only letters, numbers, slashes, hyphens, and underscores.",
              code: null
            }
          }

          // Generate endpoint code
          const code = `import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
${requiresAuth ? 'import { createServerClient } from "@/lib/supabase/server"' : ''}
${requiresAuth ? 'import { getUserByAuthId } from "@/lib/user-mapping"' : ''}

const sql = neon(process.env.DATABASE_URL!)
${requiresAdmin ? 'const ADMIN_EMAIL = "ssa@ssasocial.com"' : ''}

/**
 * ${description}
 */
export async function ${method}(request: Request) {
  try {
    ${requiresAuth ? `
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    ${requiresAdmin ? `
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    ` : ''}
    ` : ''}
    
    // TODO: Implement your logic here
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Alex] ${path} error:", error)
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    )
  }
}
`
          
          // Generate diff preview
          const diff = [
            {
              type: "add" as const,
              line: `New ${method} endpoint at /api/${path}`,
              file: `app/api/${path}/route.ts`
            }
          ]

          // Split code into lines for better preview
          const codeLines = code.trim().split('\n')
          codeLines.forEach((line: string, idx: number) => {
            if (idx < 10 || idx > codeLines.length - 5) {
              // Show first 10 and last 5 lines
              diff.push({
                type: "add" as const,
                line: line,
                file: `app/api/${path}/route.ts`
              })
            } else if (idx === 10) {
              diff.push({
                type: "add" as const,
                line: `... (${codeLines.length - 15} more lines) ...`,
                file: `app/api/${path}/route.ts`
              })
            }
          })

          return {
            success: true,
            preview: "Here's what will be created:",
            diff: diff,
            affectedFiles: [`app/api/${path}/route.ts`],
            rollbackPlan: `Can delete file: app/api/${path}/route.ts`,
            needsApproval: true,
            approvalType: "button_click",
            expiresIn: "5 minutes",
            filePath: `app/api/${path}/route.ts`,
            code: code.trim(),
            method: method,
            endpoint: `/api/${path}`,
            createUrl: `/api/admin/alex/create-file`,
            message: `I've generated the code for a ${method} endpoint at /api/${path}. Review it below and approve when ready.`
          }
        } catch (error: any) {
          console.error("[Alex] Error creating API endpoint code:", error)
          return {
            error: error.message || "Failed to generate API endpoint code",
            code: null
          }
        }
      }
    })

    const modifyFileTool = tool({
      description: `Modify existing code file with diff preview.
      This reads the current file, shows what will change, and requires approval before applying.
      Use this when Sandra asks to update, fix, or enhance existing code.`,
      parameters: z.object({
        filePath: z.string().describe("Path to the file to modify, e.g., 'app/api/admin/users/route.ts'"),
        changes: z.array(z.object({
          find: z.string().describe("Exact code to find (must match exactly including whitespace)"),
          replace: z.string().describe("Code to replace it with")
        })).describe("Array of find/replace changes to apply"),
        reason: z.string().describe("Reason for these changes")
      }),
      execute: async ({ filePath, changes, reason }) => {
        try {
          // Validate file path
          if (filePath.includes('..') || filePath.includes('//')) {
            return {
              error: "Invalid file path",
              filePath: null
            }
          }

          // Get project root
          const projectRoot = process.cwd()
          const fullPath = join(projectRoot, filePath)

          // Ensure we're within the project directory
          if (!fullPath.startsWith(projectRoot)) {
            return {
              error: "Invalid file path",
              filePath: null
            }
          }

          // Read current file
          let currentContent: string
          try {
            currentContent = await readFile(fullPath, 'utf-8')
          } catch (error: any) {
            return {
              error: `File not found: ${filePath}`,
              filePath: filePath
            }
          }

          // Apply changes
          let newContent = currentContent
          const diffs: Array<{ old: string; new: string }> = []
          const notFound: Array<{ find: string }> = []

          for (const change of changes) {
            if (!newContent.includes(change.find)) {
              notFound.push({ find: change.find.substring(0, 100) + '...' })
              continue
            }

            // Count occurrences to ensure we're replacing the right one
            // Escape special regex characters for safe matching
            const escapedFind = change.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const occurrences = (newContent.match(new RegExp(escapedFind, 'g')) || []).length
            if (occurrences > 1) {
              return {
                error: `Found ${occurrences} occurrences of the code to replace. Please be more specific.`,
                searchedFor: change.find.substring(0, 100) + '...',
                filePath: filePath
              }
            }

            newContent = newContent.replace(change.find, change.replace)

            diffs.push({
              old: change.find,
              new: change.replace
            })
          }

          if (notFound.length > 0) {
            return {
              error: "Some code patterns were not found in the file",
              notFound: notFound,
              filePath: filePath,
              partialDiffs: diffs
            }
          }

          // Generate detailed diff for preview
          const detailedDiff = diffs.map((d, idx) => {
            const oldLines = d.old.split('\n')
            const newLines = d.new.split('\n')
            return {
              changeNumber: idx + 1,
              type: 'modify' as const,
              old: d.old,
              new: d.replace,
              oldLines: oldLines.length,
              newLines: newLines.length,
              file: filePath
            }
          })

          // Create backup info (will be created on approval)
          const timestamp = Date.now()
          const changeId = `change_${timestamp}_${Math.random().toString(36).substring(7)}`

          return {
            success: true,
            filePath: filePath,
            reason: reason,
            diff: detailedDiff,
            preview: {
              before: currentContent.substring(0, 500) + (currentContent.length > 500 ? '...' : ''),
              after: newContent.substring(0, 500) + (newContent.length > 500 ? '...' : ''),
              fullBefore: currentContent,
              fullAfter: newContent
            },
            affectedFiles: [filePath],
            rollbackPlan: `Can revert using change ID: ${changeId}`,
            needsApproval: true,
            approvalType: "button_click",
            expiresIn: "5 minutes",
            changeId: changeId,
            backupPath: `${filePath}.backup.${timestamp}`,
            applyUrl: `/api/admin/alex/apply-file-changes`,
            message: `I've prepared changes to ${filePath}. Review the diff below and approve when ready.`
          }
        } catch (error: any) {
          console.error("[Alex] Error modifying file:", error)
          return {
            error: error.message || "Failed to modify file",
            filePath: filePath
          }
        }
      }
    })

    const addFeatureTool = tool({
      description: `Add complete feature involving multiple files and database changes.
      This creates an implementation plan that Sandra can approve step-by-step.
      Use this when Sandra asks for a new feature that requires:
      - Database tables/schema changes
      - Multiple API endpoints
      - UI components or pages
      - Integration across multiple files`,
      parameters: z.object({
        featureName: z.string().describe("Name of the feature to implement"),
        description: z.string().describe("What this feature does and why it's needed"),
        files: z.array(z.object({
          path: z.string().describe("File path that needs to be created or modified"),
          purpose: z.string().describe("What this file does in the feature")
        })).describe("List of files involved in this feature"),
        databaseChanges: z.boolean().describe("Whether this feature requires database schema changes"),
        apiEndpoints: z.array(z.string()).describe("List of API endpoints needed (e.g., '/api/referrals/create')")
      }),
      execute: async ({ featureName, description, files, databaseChanges, apiEndpoints }) => {
        try {
          // Generate implementation plan
          const steps: Array<{ type: string; description: string; details?: any }> = []
          
          // Phase 1: Database changes
          if (databaseChanges) {
            steps.push({
              type: 'database',
              description: 'Create database tables/schema',
              details: {
                action: 'create_database_table',
                note: 'Will generate SQL for table creation'
              }
            })
          }
          
          // Phase 2: API endpoints
          if (apiEndpoints && apiEndpoints.length > 0) {
            apiEndpoints.forEach((endpoint: string) => {
              const method = endpoint.includes('/create') || endpoint.includes('/add') ? 'POST' :
                           endpoint.includes('/update') || endpoint.includes('/edit') ? 'PUT' :
                           endpoint.includes('/delete') || endpoint.includes('/remove') ? 'DELETE' : 'GET'
              
              steps.push({
                type: 'api',
                description: `Create ${method} ${endpoint} endpoint`,
                details: {
                  action: 'create_api_endpoint',
                  path: endpoint.replace('/api/', ''),
                  method: method
                }
              })
            })
          }
          
          // Phase 3: File modifications/creations
          files.forEach((file: any) => {
            if (file.path.includes('route.ts')) {
              // Already handled as API endpoint
              return
            }
            
            steps.push({
              type: 'file',
              description: `${file.path.includes('component') ? 'Create' : 'Modify'} ${file.path}`,
              details: {
                action: file.path.includes('component') || file.path.includes('page') ? 'create' : 'modify',
                path: file.path,
                purpose: file.purpose
              }
            })
          })
          
          const plan = {
            phase1: databaseChanges ? "Database schema changes" : null,
            phase2: apiEndpoints.length > 0 ? "API endpoint creation" : null,
            phase3: files.length > 0 ? "File creation/modification" : null,
            estimatedTime: `${Math.ceil(steps.length * 2)} minutes`,
            steps: steps,
            totalSteps: steps.length
          }
          
          return {
            success: true,
            featureName: featureName,
            description: description,
            implementationPlan: plan,
            needsApproval: true,
            message: `I've created an implementation plan for "${featureName}". It involves ${steps.length} steps. Would you like me to proceed step-by-step?`,
            canExecuteSequentially: true
          }
        } catch (error: any) {
          console.error("[Alex] Error creating feature plan:", error)
          return {
            error: error.message || "Failed to create feature implementation plan",
            featureName: featureName
          }
        }
      }
    })

    const rollbackChangeTool = tool({
      description: `Undo the last code change by restoring from backup.
      Use this when Sandra wants to revert a change or something went wrong.
      This instantly restores the file to its previous state.`,
      parameters: z.object({
        changeId: z.string().describe("Change ID from the modification to rollback")
      }),
      execute: async ({ changeId }) => {
        try {

          const backup = await getBackup(changeId)
          
          if (!backup) {
            return {
              error: `No backup found for change ID: ${changeId}`,
              success: false
            }
          }

          // Restore from backup
          const result = await restoreFromBackup(backup.changeId)

          return {
            success: true,
            message: result.message || `Rolled back change ${changeId}`,
            restoredTo: new Date(backup.timestamp).toISOString(),
            filePath: backup.filePath,
            changeId: backup.changeId
          }
        } catch (error: any) {
          console.error("[Alex] Error rolling back change:", error)
          return {
            error: error.message || "Failed to rollback change",
            success: false
          }
        }
      }
    })

    // ✅ EMAIL & ANALYTICS TOOLS (Phase 2)
    const checkCampaignStatusTool = tool({
      description: `Check status of email campaigns and get delivery metrics.
  
  Use this when Sandra asks about email performance or delivery status.`,
      
      parameters: z.object({
        campaignId: z.number().optional().describe("Specific campaign ID, or null for recent campaigns"),
        timeframe: z.enum(['today', 'week', 'month', 'all']).optional().describe("Timeframe for campaigns (defaults to week if not specified)")
      }),
      
      execute: async ({ campaignId, timeframe = 'week' }: {
        campaignId?: number
        timeframe?: string
      }) => {
        try {
          let campaigns
          
          if (campaignId) {
            // Get specific campaign
            campaigns = await sql`
              SELECT * FROM admin_email_campaigns 
              WHERE id = ${campaignId}
            `
          } else {
            // Get recent campaigns based on timeframe
            if (timeframe === 'today') {
              campaigns = await sql`
                SELECT * FROM admin_email_campaigns 
                WHERE created_at > NOW() - INTERVAL '1 day'
                ORDER BY created_at DESC
                LIMIT 10
              `
            } else if (timeframe === 'week') {
              campaigns = await sql`
                SELECT * FROM admin_email_campaigns 
                WHERE created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 10
              `
            } else if (timeframe === 'month') {
              campaigns = await sql`
                SELECT * FROM admin_email_campaigns 
                WHERE created_at > NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
                LIMIT 10
              `
            } else {
              campaigns = await sql`
                SELECT * FROM admin_email_campaigns 
                ORDER BY created_at DESC
                LIMIT 10
              `
            }
          }
          
          // For each campaign with resend_broadcast_id, fetch stats from email_logs
          const results = []
          for (const campaign of campaigns) {
            const logs = await sql`
              SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
              FROM email_logs
              WHERE email_type = 'campaign' 
              AND campaign_id = ${campaign.id}
            `
            
            results.push({
              id: campaign.id,
              name: campaign.campaign_name,
              status: campaign.status,
              subject: campaign.subject_line,
              createdAt: campaign.created_at,
              scheduledFor: campaign.scheduled_for,
              broadcastId: campaign.resend_broadcast_id,
              stats: logs[0] || { total: 0, sent: 0, failed: 0 }
            })
          }
          
          return {
            campaigns: results,
            summary: {
              total: results.length,
              sent: results.filter(c => c.status === 'sent').length,
              scheduled: results.filter(c => c.status === 'scheduled').length,
              draft: results.filter(c => c.status === 'draft').length
            }
          }
        } catch (error: any) {
          console.error("[Alex] Error in check_campaign_status tool:", error)
          return {
            error: error.message || "Failed to check campaign status",
            campaigns: [],
            summary: { total: 0, sent: 0, scheduled: 0, draft: 0 }
          }
        }
      }
    } as any)

    const getResendAudienceDataTool = tool({
      description: `Get real-time audience data from Resend including all segments and contact counts.
  
  Use this when Sandra asks about:
  - Her audience size
  - Available segments
  - Who to target
  - Email strategy planning
  
  This gives you live data to make intelligent recommendations.`,
      
      parameters: z.object({
        includeSegmentDetails: z.boolean().optional().describe("Include detailed segment information (defaults to true if not specified)")
      }),
      
      execute: async ({ includeSegmentDetails = true }: {
        includeSegmentDetails?: boolean
      }) => {
        try {
          if (!resend) {
            return { 
              error: "Resend client not initialized. RESEND_API_KEY not configured.",
              fallback: "I couldn't connect to Resend. Let me use database records instead."
            }
          }

          const audienceId = process.env.RESEND_AUDIENCE_ID
          
          if (!audienceId) {
            return { 
              error: "RESEND_AUDIENCE_ID not configured",
              fallback: "I couldn't fetch live data from Resend. Let me use database records instead."
            }
          }
          
          // Get audience details
          const audience = await resend.audiences.get(audienceId)
          
          // Get all contacts to calculate total
          // Use the helper function that handles pagination
          const { getAudienceContacts } = await import("@/lib/resend/get-audience-contacts")
          const contacts = await getAudienceContacts(audienceId)
          
          let segments: any[] = []
          
          if (includeSegmentDetails) {
            // Get known segments from database campaigns
            const knownSegments = await sql`
              SELECT DISTINCT 
                jsonb_extract_path_text(target_audience, 'resend_segment_id') as segment_id,
                jsonb_extract_path_text(target_audience, 'segment_name') as segment_name
              FROM admin_email_campaigns
              WHERE target_audience ? 'resend_segment_id'
                AND jsonb_extract_path_text(target_audience, 'resend_segment_id') IS NOT NULL
            `
            
            // Also check for known segment IDs from environment variables
            const knownSegmentIds = [
              { id: process.env.RESEND_BETA_SEGMENT_ID, name: 'Beta Users' },
              // Add other known segments here if they exist in env vars
            ].filter(s => s.id)
            
            // Combine database segments with env var segments
            const allSegments = new Map()
            
            knownSegments.forEach((s: any) => {
              if (s.segment_id) {
                allSegments.set(s.segment_id, {
                  id: s.segment_id,
                  name: s.segment_name || 'Unknown Segment'
                })
              }
            })
            
            knownSegmentIds.forEach(s => {
              if (s.id) {
                allSegments.set(s.id, {
                  id: s.id,
                  name: s.name
                })
              }
            })
            
            segments = Array.from(allSegments.values())
          }
          
          return {
            audienceId: audience.data?.id || audienceId,
            audienceName: audience.data?.name || 'SSELFIE Audience',
            totalContacts: contacts.length,
            segments: segments,
            summary: `You have ${contacts.length} total contacts in your audience${segments.length > 0 ? ` across ${segments.length} segments` : ''}.`
          }
          
        } catch (error: any) {
          console.error('[Alex] Error fetching Resend audience:', error)
          return {
            error: error.message || "Failed to fetch audience data",
            fallback: "I couldn't fetch live data from Resend. Let me use database records instead."
          }
        }
      }
    } as any)

    const analyzeEmailStrategyTool = tool({
      description: `Analyze Sandra's audience and create intelligent email campaign strategies.
  
  Use this after getting audience data to recommend:
  - Which segments to target
  - What type of campaigns to send
  - Optimal timing
  - Campaign priorities
  
  Be proactive and strategic - Sandra wants AI to help her scale.`,
      
      parameters: z.object({
        audienceData: z.object({
          totalContacts: z.number(),
          segments: z.array(z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            size: z.number().optional()
          }))
        }).describe("Audience data from get_resend_audience_data"),
        
        lastCampaignDays: z.number().optional().describe("Days since last campaign (fetch from database)")
      }),
      
      execute: async ({ audienceData, lastCampaignDays }: {
        audienceData: any
        lastCampaignDays?: number
      }) => {
        try {
          // Get recent campaign history
          const recentCampaigns = await sql`
            SELECT 
              campaign_type,
              target_audience,
              created_at,
              status
            FROM admin_email_campaigns
            WHERE status IN ('sent', 'scheduled')
            ORDER BY created_at DESC
            LIMIT 10
          `
          
          // Parse target_audience JSONB data (may be string or object)
          const parsedCampaigns = recentCampaigns.map((c: any) => {
            let targetAudience = c.target_audience
            // If target_audience is a string, parse it
            if (typeof targetAudience === 'string') {
              try {
                targetAudience = JSON.parse(targetAudience)
              } catch (e) {
                console.error("[Alex] Error parsing target_audience:", e)
                targetAudience = null
              }
            }
            return {
              ...c,
              target_audience: targetAudience
            }
          })
          
          // Calculate days since last email
          const daysSinceLastEmail = lastCampaignDays || (
            parsedCampaigns.length > 0
              ? Math.floor((Date.now() - new Date(parsedCampaigns[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
              : 999
          )
          
          // Build strategic recommendations
          const recommendations: any[] = []
          
          // Check for engagement gap
          if (daysSinceLastEmail > 14) {
            recommendations.push({
              priority: 'urgent',
              type: 'reengagement',
              title: 'Reengagement Campaign Needed',
              reason: `It's been ${daysSinceLastEmail} days since your last email. Your audience needs to hear from you.`,
              targetSegment: audienceData.segments.find((s: any) => s.name?.toLowerCase().includes('cold')) || 
                           { name: 'All contacts', id: null },
              suggestedAction: 'Send a "We miss you" or value-packed newsletter',
              timing: 'This week'
            })
          }
          
          // Check for paid user engagement
          const paidUsersSegment = audienceData.segments.find((s: any) => 
            s.name?.toLowerCase().includes('paid') || 
            s.name?.toLowerCase().includes('studio') ||
            s.name?.toLowerCase().includes('beta')
          )
          
          if (paidUsersSegment) {
            const hasPaidCampaign = parsedCampaigns.some((c: any) => {
              const ta = c.target_audience
              return ta && (
                ta.plan === 'sselfie_studio_membership' ||
                ta.resend_segment_id === paidUsersSegment.id
              )
            })
            
            if (!hasPaidCampaign || daysSinceLastEmail > 7) {
              recommendations.push({
                priority: 'high',
                type: 'nurture',
                title: 'Studio Member Nurture',
                reason: 'Keep your paying members engaged and getting value',
                targetSegment: paidUsersSegment,
                suggestedAction: 'Weekly tips, new features, or success stories',
                timing: 'Weekly schedule'
              })
            }
          }
          
          // Check for freebie follow-ups
          const freebieSegments = audienceData.segments.filter((s: any) => 
            s.name?.toLowerCase().includes('freebie') || 
            s.name?.toLowerCase().includes('guide') ||
            s.name?.toLowerCase().includes('subscriber')
          )
          
          for (const segment of freebieSegments) {
            const hasRecentCampaign = parsedCampaigns.some((c: any) => {
              const ta = c.target_audience
              return ta && ta.resend_segment_id === segment.id &&
                new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            })
            
            if (!hasRecentCampaign) {
              recommendations.push({
                priority: 'medium',
                type: 'conversion',
                title: `${segment.name || 'Freebie Subscribers'} Follow-up`,
                reason: 'Warm leads who downloaded your freebie - prime for conversion',
                targetSegment: segment,
                suggestedAction: 'Nurture sequence showing Studio value',
                timing: 'Within 7 days of download'
              })
            }
          }
          
          // Check for new members without welcome email
          // Query for users created in last 7 days who haven't received welcome email
          const newMembersNeedingWelcome = await sql`
            SELECT COUNT(*)::int as count
            FROM users 
            WHERE created_at > NOW() - INTERVAL '7 days'
            AND email IS NOT NULL
            AND email != ''
            AND email NOT IN (
              SELECT DISTINCT user_email 
              FROM email_logs 
              WHERE email_type = 'welcome' AND status = 'sent'
            )
          `
          
          if (newMembersNeedingWelcome && newMembersNeedingWelcome.length > 0 && newMembersNeedingWelcome[0].count > 0) {
            recommendations.push({
              priority: 'high',
              type: 'welcome',
              title: 'New Member Welcome',
              reason: `${newMembersNeedingWelcome[0].count} new member${newMembersNeedingWelcome[0].count > 1 ? 's' : ''} haven't received a welcome email. They need immediate value and onboarding.`,
              targetSegment: { name: 'New subscribers', id: null },
              suggestedAction: 'Welcome email with quick wins and Studio preview',
              timing: 'Within 24 hours of signup'
            })
          }
          
          return {
            audienceSummary: {
              total: audienceData.totalContacts,
              segments: audienceData.segments.length,
              daysSinceLastEmail
            },
            recommendations: recommendations.sort((a, b) => {
              const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
              return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
            }),
            nextSteps: recommendations.length > 0 
              ? `I recommend starting with: ${recommendations[0].title}. Want me to create that email?`
              : "Your email strategy looks good! Want to create a new campaign?"
          }
        } catch (error: any) {
          console.error("[Alex] Error in analyze_email_strategy tool:", error)
          return {
            error: error.message || "Failed to analyze email strategy",
            recommendations: [],
            nextSteps: "I couldn't analyze your strategy right now. Try again in a moment."
          }
        }
      }
    } as any)

    // Define email composition tools
    const composeEmailSchema = z.object({
      intent: z.string().describe("What Sandra wants to accomplish with this email"),
      emailType: z.enum([
        'welcome',
        'newsletter', 
        'promotional',
        'announcement',
        'nurture',
        'reengagement'
      ]).describe("Type of email to create"),
      subjectLine: z.string().optional().describe("Subject line (generate if not provided)"),
      keyPoints: z.array(z.string()).optional().describe("Main points to include"),
      tone: z.enum(['warm', 'professional', 'excited', 'urgent']).optional().describe("Tone for the email (defaults to warm if not specified)"),
      previousVersion: z.string().optional().describe("Previous email HTML if refining"),
      imageUrls: z.array(z.string()).optional().describe("Array of image URLs to include in the email. These are gallery images Sandra selected. Include them naturally in the email HTML using <img> tags with proper styling."),
      campaignName: z.string().optional().describe("Optional campaign name for generating tracked links. If provided, will be used to create URL-safe campaign slug for UTM parameters.")
    })

    const composeEmailTool = tool({
      description: `Create or refine email content. Returns formatted HTML email.
  
  Use this when Sandra wants to:
  - Create a new email campaign
  - Edit/refine existing email content
  - Generate subject lines
  - Use email templates
  
  IMPORTANT: If Sandra has shared images in this conversation, you MUST include them in the imageUrls parameter.
  
  Examples:
  - "Create a welcome email for new Studio members"
  - "Write a newsletter about the new Maya features"
  - "Make that email warmer and add a PS"`,
      
      parameters: composeEmailSchema,
      
      execute: async ({ intent, emailType, subjectLine, keyPoints, tone = 'warm', previousVersion, imageUrls, campaignName }: {
        intent: string
        emailType: string
        subjectLine?: string
        keyPoints?: string[]
        tone?: string
        previousVersion?: string
        imageUrls?: string[]
        campaignName?: string
      }) => {
        try {
          // Use available image URLs from conversation if not provided
          const finalImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : availableImageUrls
          
          // 1. Get email templates for this type
          const templates = await sql`
            SELECT body_html, subject_line 
            FROM email_template_library 
            WHERE category = ${emailType} AND is_active = true
            LIMIT 1
          `
          
          // 2. Get campaign context for link generation (if available)
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai'
          
          // Generate campaign slug from campaign name (if provided)
          const campaignSlug = campaignName
            ? campaignName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
            : 'email-campaign'
          
          // 3. Get Sandra's full voice and brand guidelines for email composition
          const sandraVoice = await getSandraVoice()
          const pillarsText = sandraVoice.pillars
            .map((p: any) => {
              const name = typeof p === 'string' ? p : p.name || p
              const desc = typeof p === 'object' && p.description ? ` - ${p.description}` : ''
              return `- ${name}${desc}`
            })
            .join('\n    ')
          
          // Format communicationStyle and signatures - handle both string and array types
          const communicationStyleText = Array.isArray(sandraVoice.communicationStyle)
            ? sandraVoice.communicationStyle.join(', ')
            : sandraVoice.communicationStyle
          
          const signaturesText = Array.isArray(sandraVoice.signatures)
            ? sandraVoice.signatures.join(' or ')
            : sandraVoice.signatures
          
          // 3. Use Claude to generate/refine email content with FULL Sandra voice context
          const emailSystemPrompt = `You are Sandra's email marketing assistant for SSELFIE Studio.

**CRITICAL: Write in Sandra's Authentic Voice**

**Sandra's Brand Voice:**
${sandraVoice.voice}

**Communication Style:**
${communicationStyleText}

**Signature Closing:**
${signaturesText}

**Content Pillars:**
${pillarsText}

**Target Audience:**
${sandraVoice.audience}

**Language Style:**
${sandraVoice.languageStyle}

**Brand Vibe:**
${sandraVoice.vibe}

**Voice Rules (MUST FOLLOW):**
1. ALWAYS use Sandra's authentic voice - warm, empowering, friend-to-friend
2. Use signature closing: "${signaturesText}"
3. Reference content pillars when relevant
4. Match the tone: ${tone}, but keep it authentic and personal
5. Use emojis strategically: ✨💋🎯💪🔥 (not excessive)
6. Keep it real - raw and authentic, not corporate
7. Core message: Visibility = Financial Freedom

**Context:**
- SSELFIE Studio helps women entrepreneurs create professional photos with AI
- Audience: Women entrepreneurs, solopreneurs, coaches
- Tone for this email: ${tone}

${previousVersion ? 'Refine the previous version based on Sandra\'s request, maintaining her authentic voice.' : 'Create a compelling email in Sandra\'s voice.'}

${templates[0]?.body_html ? `Template reference (use as inspiration, but write in Sandra's voice): ${templates[0].body_html.substring(0, 500)}` : 'Create from scratch in Sandra\'s voice'}
    
    ${finalImageUrls && finalImageUrls.length > 0 ? `IMPORTANT: Include these images in the email HTML:
    ${finalImageUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n    ')}
    
    Use proper <img> tags with inline styles:
    - width: 100% (or max-width: 600px for container)
    - height: auto
    - display: block
    - style="width: 100%; height: auto; display: block;"
    - Include alt text describing the image
    - Place images naturally in the email flow (hero image at top, supporting images in content)
    - Use table-based layout for email compatibility` : ''}
    
    **CRITICAL: Product Links & Tracking**
    
    When including links in the email, you MUST use the correct product URLs with proper tracking:
    
    **Product Checkout Links (use campaign slug: "${campaignSlug}"):**
    - Studio Membership: \`${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}\`
    - One-Time Session: \`${siteUrl}/studio?checkout=one_time&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}\`
    
    **Landing Pages (use campaign slug: "${campaignSlug}"):**
    - Why Studio: \`${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}\`
    - Homepage: \`${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}\`
    
    **Link Tracking Requirements:**
    1. ALL links must include UTM parameters: \`utm_source=email\`, \`utm_medium=email\`, \`utm_campaign=${campaignSlug}\`, \`utm_content={link_type}\`
    2. Use \`campaign_id={campaign_id}\` as placeholder (will be replaced with actual ID when campaign is scheduled)
    3. Use the campaign slug "${campaignSlug}" for all \`utm_campaign\` parameters
    4. Use appropriate \`utm_content\` values: \`cta_button\` (primary CTA), \`text_link\` (body links), \`footer_link\` (footer), \`image_link\` (image links)
    
    **CRITICAL OUTPUT FORMAT:**
    - Return ONLY raw HTML code (no markdown formatting, no code fences, no explanations)
    - Start directly with <!DOCTYPE html> or <html>
    - Do NOT wrap the HTML in any markdown formatting
    - Do NOT include code fences or markdown syntax anywhere in your response
    - Return pure HTML that can be directly used in email clients
    
    Use proper HTML structure with DOCTYPE, inline styles, and responsive design. Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}`
          
          // Ensure keyPoints is an array before calling .join()
          const keyPointsArray = Array.isArray(keyPoints) ? keyPoints : (keyPoints ? [keyPoints] : [])
          const userPrompt = `${intent}\n\n${keyPointsArray.length > 0 ? `Key points: ${keyPointsArray.join(', ')}\n\n` : ''}${finalImageUrls && finalImageUrls.length > 0 ? `\nImages to include:\n${finalImageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}${previousVersion || ''}`
          
          const { text: emailHtmlRaw } = await generateText({
            model: "anthropic/claude-sonnet-4-20250514",
            system: emailSystemPrompt,
            prompt: userPrompt,
            maxOutputTokens: 2000,
          })
          
          // Clean up the HTML response - remove markdown code blocks if present
          let emailHtml = emailHtmlRaw.trim()
          
          // Remove markdown code blocks (```html ... ``` or ``` ... ```)
          emailHtml = emailHtml.replace(/^```html\s*/i, '')
          emailHtml = emailHtml.replace(/^```\s*/, '')
          emailHtml = emailHtml.replace(/\s*```$/g, '')
          emailHtml = emailHtml.trim()
          
          // Ensure images are properly included if imageUrls were provided
          if (finalImageUrls && finalImageUrls.length > 0) {
            // Check if images are already in the HTML
            const missingImages = finalImageUrls.filter(url => !emailHtml.includes(url))
            
            // If some images are missing, add them at the top as hero images
            if (missingImages.length > 0) {
              console.log(`[Alex] Adding ${missingImages.length} missing images to email HTML`)
              
              // Create simple image HTML for missing images (email-compatible table structure)
              const imageRows = missingImages.map((url, idx) => {
                return `
          <tr>
            <td style="padding: ${idx === 0 ? '0' : '10px'} 0;">
              <img src="${url}" alt="Email image ${idx + 1}" style="width: 100%; max-width: 600px; height: auto; display: block;" />
            </td>
          </tr>`
              }).join('\n')
              
              // Try to insert images into the first table after <body>
              const bodyMatch = emailHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
              if (bodyMatch) {
                const bodyContent = bodyMatch[1]
                // Find the first main table
                const mainTableMatch = bodyContent.match(/(<table[^>]*role=["']presentation["'][^>]*>)/i)
                if (mainTableMatch) {
                  const tableStart = mainTableMatch.index! + mainTableMatch[0].length
                  // Insert images right after the opening table tag
                  emailHtml = emailHtml.substring(0, bodyMatch.index! + bodyMatch[0].indexOf(mainTableMatch[0]) + mainTableMatch[0].length) + 
                    imageRows + 
                    emailHtml.substring(bodyMatch.index! + bodyMatch[0].indexOf(mainTableMatch[0]) + mainTableMatch[0].length)
                } else {
                  // No table found, prepend images wrapped in a table
                  const imageTable = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          ${imageRows}
        </table>`
                  emailHtml = emailHtml.replace(/<body[^>]*>/i, (match) => match + imageTable)
                }
              } else {
                // No body tag found, prepend images at the very start
                const imageTable = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          ${imageRows}
        </table>`
                emailHtml = imageTable + emailHtml
              }
            }
          }
          
          // 3. Generate subject line if not provided
          const finalSubjectLine = subjectLine || await generateSubjectLine(intent, emailType)
          
          // Generate preview text (strip HTML for preview)
          const previewText = stripHtml(emailHtml).substring(0, 200)
          
          return {
            html: emailHtml,
            subjectLine: finalSubjectLine,
            preview: previewText,
            readyToSend: true
          }
        } catch (error: any) {
          console.error("[Alex] Error in compose_email tool:", error)
          return {
            error: error.message || "Failed to compose email",
            html: "",
            subjectLine: "",
            preview: "",
            readyToSend: false
          }
        }
      }
    } as any)

    const scheduleCampaignTool = tool({
      description: `Schedule or send an email campaign. Creates campaign in database and Resend.
  
  Use this when Sandra approves the email and wants to send it.
  
  CRITICAL: Always ask Sandra to confirm:
  1. Who should receive it (segment/audience)
  2. When to send (now or scheduled time)
  
  Before calling this tool.`,
      
      parameters: z.object({
        campaignName: z.string().describe("Name for this campaign"),
        subjectLine: z.string(),
        emailHtml: z.string().describe("The approved email HTML"),
        targetAudience: z.object({
          all_users: z.boolean().optional(),
          plan: z.string().optional(),
          resend_segment_id: z.string().optional(),
          recipients: z.array(z.string()).optional()
        }).describe("Who receives this email"),
        scheduledFor: z.string().optional().describe("ISO datetime to send, or null for immediate"),
        campaignType: z.string()
      }),
      
      execute: async ({ campaignName, subjectLine, emailHtml, targetAudience, scheduledFor, campaignType }: {
        campaignName: string
        subjectLine: string
        emailHtml: string
        targetAudience: any
        scheduledFor?: string
        campaignType: string
      }) => {
        try {
          const bodyText = stripHtml(emailHtml)
          
          const campaignResult = await sql`
            INSERT INTO admin_email_campaigns (
              campaign_name, campaign_type, subject_line,
              body_html, body_text, status, approval_status,
              target_audience, scheduled_for,
              created_by, created_at, updated_at
            ) VALUES (
              ${campaignName}, ${campaignType}, ${subjectLine},
              ${emailHtml}, ${bodyText}, 
              ${scheduledFor ? 'scheduled' : 'draft'}, 'approved',
              ${targetAudience}::jsonb, ${scheduledFor || null},
              ${ADMIN_EMAIL}, NOW(), NOW()
            )
            RETURNING id, campaign_name
          `
          
          // Validate campaign was created
          if (!campaignResult || campaignResult.length === 0 || !campaignResult[0]) {
            console.error("[Alex] Failed to create campaign in database")
            return {
              success: false,
              error: "Failed to create campaign in database. Please try again.",
              campaignId: null,
            }
          }
          
          const campaign = campaignResult[0]
          
          // Replace {campaign_id} placeholder in email HTML with actual campaign ID
          const finalEmailHtml = emailHtml.replace(/{campaign_id}/g, String(campaign.id))
          
          // Generate final body_text from finalEmailHtml (with placeholders replaced)
          const finalBodyText = stripHtml(finalEmailHtml)
          
          // Update database with final HTML and text (with campaign_id replaced)
          // If this UPDATE fails, delete the campaign to prevent broken data
          try {
            await sql`
              UPDATE admin_email_campaigns 
              SET body_html = ${finalEmailHtml}, body_text = ${finalBodyText}
              WHERE id = ${campaign.id}
            `
          } catch (updateError: any) {
            console.error("[Alex] Failed to update campaign with final HTML, rolling back:", updateError)
            // Rollback: delete the campaign to prevent broken data
            await sql`
              DELETE FROM admin_email_campaigns 
              WHERE id = ${campaign.id}
            `
            return {
              success: false,
              error: `Failed to save campaign: ${updateError.message}. Campaign creation was rolled back.`,
              campaignId: null,
            }
          }
          
          // If sending now, create Resend broadcast
          let broadcastId = null
          if (!scheduledFor) {
            if (!resend) {
              return {
                success: false,
                error: "Resend client not initialized. RESEND_API_KEY not configured.",
                campaignId: campaign.id,
              }
            }
            
            // Determine which audience/segment to target
            const targetAudienceId = targetAudience?.resend_segment_id || process.env.RESEND_AUDIENCE_ID
            
            if (!targetAudienceId) {
              return {
                success: false,
                error: targetAudience?.resend_segment_id 
                  ? "Segment ID provided but is invalid"
                  : "RESEND_AUDIENCE_ID not configured",
                campaignId: campaign.id,
              }
            }
            
            try {
              const broadcast = await resend.broadcasts.create({
                audienceId: targetAudienceId,
                from: 'Sandra from SSELFIE <hello@sselfie.ai>',
                subject: subjectLine,
                html: finalEmailHtml
              })
              
              broadcastId = broadcast.data?.id || null
              
              // Update campaign with broadcast ID and status
              await sql`
                UPDATE admin_email_campaigns 
                SET resend_broadcast_id = ${broadcastId}, status = 'sent'
                WHERE id = ${campaign.id}
              `
            } catch (resendError: any) {
              console.error("[Alex] Error creating Resend broadcast:", resendError)
              return {
                success: false,
                error: `Campaign saved but Resend broadcast failed: ${resendError.message}`,
                campaignId: campaign.id,
              }
            }
          }
          
          return {
            success: true,
            campaignId: campaign.id,
            broadcastId,
            message: scheduledFor 
              ? `Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}`
              : `Campaign sent! Check Resend dashboard for delivery status.`,
            resendUrl: broadcastId ? `https://resend.com/broadcasts/${broadcastId}` : null
          }
        } catch (error: any) {
          console.error("[Alex] Error in schedule_campaign tool:", error)
          return {
            success: false,
            error: error.message || "Failed to schedule campaign",
            campaignId: null,
            broadcastId: null,
          }
        }
      }
    } as any)

    // Ensure all tools are properly defined before passing to streamText
    // CRITICAL: All tools MUST use z.object({...}) for parameters
    const tools = {
      create_database_table: createDatabaseTableTool,
      create_api_endpoint: createApiEndpointTool,
      modify_file: modifyFileTool,
      add_feature: addFeatureTool,
      rollback_change: rollbackChangeTool,
      // ✅ Email & Analytics Tools
      compose_email: composeEmailTool,
      schedule_campaign: scheduleCampaignTool,
      check_campaign_status: checkCampaignStatusTool,
      get_resend_audience_data: getResendAudienceDataTool,
      analyze_email_strategy: analyzeEmailStrategyTool,
    }

    // Validate tools are defined
    for (const [name, toolDef] of Object.entries(tools)) {
      if (!toolDef) {
        console.error(`[Alex] Tool ${name} is undefined`)
        return NextResponse.json({ error: `Tool ${name} is not properly defined` }, { status: 500 })
      }
    }

    // SOLUTION: Use Anthropic SDK directly to bypass Vercel Gateway -> Bedrock serialization issues
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
    const hasTools = tools && Object.keys(tools).length > 0
    const useDirectAnthropic = hasAnthropicKey && hasTools
    
    console.log('[Alex] 🔍 Environment check:', {
      hasAnthropicKey,
      hasTools,
      useDirectAnthropic,
      toolCount: hasTools ? Object.keys(tools).length : 0,
    })
    
    if (useDirectAnthropic) {
      console.log('[Alex] 🚀 Using Anthropic SDK directly (bypassing gateway)')
      console.log('[Alex] 📊 About to create stream, activeChatId:', activeChatId)
      
      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      
      // Convert messages and tools to Anthropic format
      const anthropicMessages = convertMessagesToAnthropicFormat(modelMessages)
      const anthropicTools = convertToolsToAnthropicFormat(tools)
      
      // Helper function to process Anthropic stream with tool execution
      async function* processAnthropicStream(stream: any, initialMessages: any[], maxIterations = 5): AsyncGenerator<string | { type: 'tool-result', data: any }> {
        let messages = initialMessages
        let iteration = 0
        
        while (iteration < maxIterations) {
          iteration++
          let currentToolCall: { id: string; name: string; input: string } | null = null
          const toolCalls: Array<{ id: string; name: string; input: any }> = []
          const toolResults: Array<{ tool_use_id: string; name: string; content: any }> = []
          
          for await (const event of stream) {
            // Handle tool use start
            if (event.type === 'content_block_start' && 'content_block' in event && event.content_block && 'type' in event.content_block && event.content_block.type === 'tool_use') {
              const toolUse = event.content_block as any
              currentToolCall = {
                id: toolUse.id,
                name: toolUse.name,
                input: '',
              }
              console.log(`[Alex] 🔧 Tool use started: ${toolUse.name} (${toolUse.id})`)
            }
            
            // Handle tool input JSON deltas
            else if (event.type === 'content_block_delta' && 'delta' in event && event.delta && 'type' in event.delta && event.delta.type === 'input_json_delta' && currentToolCall) {
              const delta = event.delta as any
              currentToolCall.input += delta.partial_json || ''
            }
            
            // Handle tool use stop - execute the tool
            else if (event.type === 'content_block_stop' && currentToolCall) {
              try {
                console.log(`[Alex] 🔧 Tool use complete: ${currentToolCall.name}, executing...`)
                
                // Parse tool input
                let toolInput: any = {}
                try {
                  toolInput = JSON.parse(currentToolCall.input)
                } catch (parseError) {
                  console.error(`[Alex] ❌ Failed to parse tool input for ${currentToolCall.name}:`, currentToolCall.input)
                  toolCalls.push({ id: currentToolCall.id, name: currentToolCall.name, input: {} })
                  toolResults.push({
                    tool_use_id: currentToolCall.id,
                    name: currentToolCall.name,
                    content: { error: 'Invalid tool input format' },
                  })
                  currentToolCall = null
                  continue
                }
                
                // Store tool call info
                toolCalls.push({ id: currentToolCall.id, name: currentToolCall.name, input: toolInput })
                
                // Find and execute the tool
                const tool = tools[currentToolCall.name as keyof typeof tools]
                if (!tool || !tool.execute) {
                  console.error(`[Alex] ❌ Tool not found: ${currentToolCall.name}`)
                  toolResults.push({
                    tool_use_id: currentToolCall.id,
                    name: currentToolCall.name,
                    content: { error: `Tool ${currentToolCall.name} not found` },
                  })
                } else {
                  try {
                    const result = await tool.execute(toolInput)
                    const toolResult = {
                      tool_use_id: currentToolCall.id,
                      name: currentToolCall.name,
                      content: result,
                    }
                    toolResults.push(toolResult)
                    console.log(`[Alex] ✅ Tool ${currentToolCall.name} executed successfully`)
                    
                    // Emit tool-result event for compose_email so client can display preview immediately
                    if (currentToolCall.name === 'compose_email' && result && result.html && result.subjectLine) {
                      // Unescape HTML newlines if present
                      let emailHtml = result.html
                      if (typeof emailHtml === 'string') {
                        emailHtml = emailHtml.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
                      }
                      
                      // Yield tool-result event so client can detect and display email preview
                      yield {
                        type: 'tool-result' as const,
                        data: {
                          toolName: 'compose_email',
                          toolCallId: currentToolCall.id,
                          result: {
                            html: emailHtml,
                            subjectLine: result.subjectLine,
                            preview: result.preview || stripHtml(emailHtml).substring(0, 200) + '...',
                            readyToSend: result.readyToSend || true
                          }
                        }
                      }
                      console.log('[Alex] 📧 Emitted tool-result event for compose_email')
                    }
                  } catch (toolError: any) {
                    console.error(`[Alex] ❌ Tool ${currentToolCall.name} execution error:`, toolError)
                    toolResults.push({
                      tool_use_id: currentToolCall.id,
                      name: currentToolCall.name,
                      content: { error: toolError.message || 'Tool execution failed' },
                    })
                  }
                }
              } catch (error: any) {
                console.error(`[Alex] ❌ Error processing tool call:`, error)
                if (currentToolCall) {
                  toolCalls.push({ id: currentToolCall.id, name: currentToolCall.name, input: {} })
                  toolResults.push({
                    tool_use_id: currentToolCall.id,
                    name: currentToolCall.name,
                    content: { error: error.message || 'Tool processing failed' },
                  })
                }
              } finally {
                currentToolCall = null
              }
            }
            
            // Handle text deltas - yield text directly
            else if (event.type === 'content_block_delta' && 'delta' in event && event.delta && 'type' in event.delta && event.delta.type === 'text_delta') {
              // Safely access text property with fallback
              const text = event.delta?.text
              // Only yield if text is defined and not empty
              if (text !== undefined && text !== null && typeof text === 'string' && text.length > 0) {
                yield text
              }
            }
            
            // Handle message stop - check if we need to continue with tool results
            else if (event.type === 'message_stop') {
              console.log(`[Alex] 🏁 Message complete (iteration ${iteration})`)
              
              // If we have tool results, continue the conversation
              if (toolResults.length > 0) {
                console.log(`[Alex] 🔄 Continuing conversation with ${toolResults.length} tool result(s)`)
                
                // Build assistant message with tool uses
                const assistantContent = toolCalls.map(tc => ({
                  type: 'tool_use' as const,
                  id: tc.id,
                  name: tc.name,
                  input: tc.input,
                }))
                
                // Build user message with tool results
                const userContent = toolResults.map(tr => ({
                  type: 'tool_result' as const,
                  tool_use_id: tr.tool_use_id,
                  content: JSON.stringify(tr.content),
                }))
                
                // Add messages for continuation
                messages = [
                  ...messages,
                  {
                    role: 'assistant' as const,
                    content: assistantContent,
                  },
                  {
                    role: 'user' as const,
                    content: userContent,
                  },
                ]
                
                // Create a new Anthropic request with tool results
                const continuationResponse = await anthropic.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 4000,
                  system: systemPrompt,
                  messages: messages as any,
                  tools: anthropicTools.length > 0 ? anthropicTools : undefined,
                  stream: true,
                })
                
                // Recursively process continuation stream
                yield* processAnthropicStream(continuationResponse, messages, maxIterations - 1)
                return // Exit after continuation
              }
            }
          }
          
          // If no tool results, we're done
          if (toolResults.length === 0) {
            break
          }
        }
      }
      
      // Create Anthropic streaming response
      const anthropicResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: anthropicMessages as any,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        stream: true,  // ← Must be true
      })
      
      // Create async generator that yields text chunks and handles tool execution
      async function* generateTextStream() {
        console.log('[Alex] 📡 Starting to process Anthropic stream events...')
        
        // Wrap processAnthropicStream to capture tool results
        async function* processAndCaptureToolResults() {
          for await (const item of processAnthropicStream(anthropicResponse, anthropicMessages)) {
            // Handle tool-result events
            if (typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-result') {
              yield item // Pass through tool-result events
            } 
            // Handle text chunks
            else if (typeof item === 'string' && item.length > 0) {
              yield item
            }
          }
        }
        
        for await (const item of processAndCaptureToolResults()) {
          // Handle tool-result events
          if (typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-result') {
            yield item // Pass through tool-result events
          }
          // Handle text chunks
          else if (typeof item === 'string' && item.length > 0) {
            yield item
          }
        }
        
        console.log('[Alex] 📊 Generator iteration complete')
      }
      
      // Create a ReadableStream that emits Server-Sent Events format
      // This is what DefaultChatTransport expects
      console.log('[Alex] Creating SSE stream...')
      
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          let messageId = 'msg-' + Date.now()
          let chunkCount = 0
          let isClosed = false
          
          // Track accumulated text and email preview data for persistence
          let accumulatedText = ''
          let emailPreviewData: { html: string; subjectLine: string; preview: string } | null = null
          
          // Helper to safely enqueue data
          const safeEnqueue = (data: Uint8Array) => {
            if (!isClosed) {
              try {
                controller.enqueue(data)
              } catch (e: any) {
                if (e.message?.includes('closed')) {
                  isClosed = true
                  console.warn('[Alex] ⚠️ Controller already closed, skipping enqueue')
                } else {
                  throw e
                }
              }
            }
          }
          
          // Helper to safely close controller
          const safeClose = () => {
            if (!isClosed) {
              try {
                controller.close()
                isClosed = true
              } catch (e) {
                // Ignore errors when closing
              }
            }
          }
          
          try {
            for await (const item of generateTextStream()) {
              if (isClosed) {
                console.warn('[Alex] ⚠️ Stream already closed, stopping iteration')
                break
              }
              
              // Handle tool-result events
              if (typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-result') {
                // Store email preview data if compose_email tool executed
                if (item.data.toolName === 'compose_email' && item.data.result) {
                  emailPreviewData = {
                    html: item.data.result.html,
                    subjectLine: item.data.result.subjectLine,
                    preview: item.data.result.preview || ''
                  }
                  console.log('[Alex] 📧 Captured email preview data from tool-result')
                }
                
                // Emit tool-result event for client to detect
                const toolResultMessage = {
                  type: 'tool-result',
                  id: messageId,
                  toolName: item.data.toolName,
                  toolCallId: item.data.toolCallId,
                  result: item.data.result
                }
                const toolResultData = `data: ${JSON.stringify(toolResultMessage)}\n\n`
                safeEnqueue(encoder.encode(toolResultData))
                console.log(`[Alex] 📧 Emitted tool-result event for ${item.data.toolName}`)
              }
              // Handle text chunks
              else if (typeof item === 'string' && item.length > 0) {
                accumulatedText += item
                chunkCount++
                
                // Format as SSE event - AI SDK expects this format
                const message = {
                  type: 'text-delta',
                  id: messageId,
                  delta: item
                }
                
                // SSE format: data: <json>\n\n
                const data = `data: ${JSON.stringify(message)}\n\n`
                safeEnqueue(encoder.encode(data))
                
                if (chunkCount % 10 === 0) {
                  console.log(`[Alex] 📝 Sent ${chunkCount} chunks so far...`)
                }
              }
            }
            
            // Send final message to indicate completion (only if not closed)
            if (!isClosed) {
              const doneMessage = {
                type: 'finish',
                id: messageId
              }
              safeEnqueue(encoder.encode(`data: ${JSON.stringify(doneMessage)}\n\n`))
              console.log(`[Alex] ✅ Wrote ${chunkCount} chunks to stream`)
            }
          } catch (error: any) {
            console.error('[Alex] ❌ Stream error:', error)
            // Send error message (only if not closed)
            if (!isClosed) {
              const errorMessage = {
                type: 'error',
                id: messageId,
                error: error.message || 'Stream error'
              }
              safeEnqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
            }
          } finally {
            safeClose()
            console.log('[Alex] ✅ UI message stream finished')
            
            // Extract email preview from content if not already captured from tool-result
            // This handles cases where email HTML is in the text but not from tool-result
            if (!emailPreviewData && accumulatedText && (accumulatedText.includes('<!DOCTYPE html') || accumulatedText.includes('<html'))) {
              // Try to extract subject and HTML from content
              const subjectMatch = accumulatedText.match(/(?:subject|Subject)[\s:]+([^\n<]+)/i)
              const htmlMatch = accumulatedText.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i)
              
              if (htmlMatch) {
                // Unescape HTML newlines (convert \\n to \n)
                let emailHtml = htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
                
                emailPreviewData = {
                  html: emailHtml,
                  subjectLine: subjectMatch ? subjectMatch[1].trim() : 'Email Campaign',
                  preview: stripHtml(emailHtml).substring(0, 200) + '...'
                }
                console.log('[Alex] 📧 Extracted email preview from message content')
              }
            }
            
            // Save message in finally block to ensure it runs even if stream is interrupted
            // This prevents data loss on network errors, client disconnects, or exceptions
            if (accumulatedText && activeChatId) {
              try {
                await saveChatMessage(activeChatId, 'assistant', accumulatedText, emailPreviewData)
                console.log('[Alex] ✅ Saved assistant message to chat:', activeChatId, emailPreviewData ? 'with email preview data' : '')
              } catch (error) {
                console.error("[Alex] ❌ Error saving assistant message:", error)
              }
            } else if (accumulatedText) {
              console.log('[Alex] ⚠️ Message not saved: no activeChatId or empty text')
            }
          }
        }
      })
      
      // Return SSE response with proper headers
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Chat-Id': String(activeChatId),
        },
      })
    } else {
      // Fallback to AI SDK (for cases without tools or without ANTHROPIC_API_KEY)
      if (!hasAnthropicKey) {
        console.log('[Alex] ⚠️ ANTHROPIC_API_KEY not set - falling back to AI SDK (tools may fail due to gateway issue)')
      } else if (!hasTools) {
        console.log('[Alex] Using AI SDK (no tools in this request)')
      } else {
        console.log('[Alex] Using AI SDK (fallback mode)')
      }
      
      const result = streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: 4000,
        tools: tools,
        onFinish: async ({ text }) => {
          if (text && activeChatId) {
            try {
              await saveChatMessage(activeChatId, "assistant", text)
              console.log('[Alex] ✅ Saved assistant message to chat:', activeChatId)
            } catch (error) {
              console.error("[Alex] ❌ Error saving assistant message:", error)
            }
          }
        },
      })

      return result.toUIMessageStreamResponse({
        headers: {
          'X-Chat-Id': String(activeChatId),
        }
      })
    }
  } catch (error: any) {
    console.error("[Alex] Chat error:", error)
    return NextResponse.json(
      { error: "Failed to process chat", details: error.message }, 
      { status: 500 }
    )
  }
}

