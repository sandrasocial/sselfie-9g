import { streamText, tool, createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { z } from "zod"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAlexSystemPrompt } from "@/lib/admin/alex-system-prompt"
import { saveChatMessage, createNewChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"
import { readFile } from "fs/promises"
import { join } from "path"
import { createBackup, getBackup, restoreFromBackup, getRecentBackups } from "@/lib/admin/alex-backup-manager"
import Anthropic from '@anthropic-ai/sdk'
import { convertToolsToAnthropicFormat, convertMessagesToAnthropicFormat } from "@/lib/admin/anthropic-tool-converter"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { messages, chatId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages is required and must be a non-empty array" }, { status: 400 })
    }

    // Get or create chat
    let activeChatId = chatId
    if (!activeChatId) {
      const newChat = await createNewChat(user.id, "Chat with Alex", null)
      activeChatId = newChat.id
    }

    // Process messages - extract text content (matching admin agent pattern)
    const modelMessages = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
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
      .filter((m: any) => m.content && m.content.length > 0)

    // Save user message
    const lastMessage = modelMessages[modelMessages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      await saveChatMessage(activeChatId, 'user', lastMessage.content)
    }

    // Load system prompt with Sandra's voice
    const systemPrompt = await getAlexSystemPrompt()

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

    // Ensure all tools are properly defined before passing to streamText
    // CRITICAL: All tools MUST use z.object({...}) for parameters
    const tools = {
      create_database_table: createDatabaseTableTool,
      create_api_endpoint: createApiEndpointTool,
      modify_file: modifyFileTool,
      add_feature: addFeatureTool,
      rollback_change: rollbackChangeTool,
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
      
      try {
        // Create Anthropic client
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
        
        // Convert messages and tools to Anthropic format
        const anthropicMessages = convertMessagesToAnthropicFormat(modelMessages)
        const anthropicTools = convertToolsToAnthropicFormat(tools)
        
        // Helper function to process Anthropic stream with tool execution
        async function* processAnthropicStream(stream: any, initialMessages: any[], maxIterations = 5): AsyncGenerator<string> {
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
                      toolResults.push({
                        tool_use_id: currentToolCall.id,
                        name: currentToolCall.name,
                        content: result,
                      })
                      console.log(`[Alex] ✅ Tool ${currentToolCall.name} executed successfully`)
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
                const text = event.delta.text
                yield text
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
          stream: true,
        })
        
        // Create async generator that yields text chunks and handles tool execution
        async function* generateTextStream() {
          let accumulatedText = ''
          console.log('[Alex] 📡 Starting to process Anthropic stream events...')
          
          for await (const text of processAnthropicStream(anthropicResponse, anthropicMessages)) {
            accumulatedText += text
            yield text
          }
          
          console.log(`[Alex] 📊 Stream complete, total text length: ${accumulatedText.length}`)
          
          // Save message when done
          if (accumulatedText && activeChatId) {
            try {
              await saveChatMessage(activeChatId, 'assistant', accumulatedText)
              console.log('[Alex] ✅ Saved assistant message to chat:', activeChatId)
            } catch (error) {
              console.error("[Alex] ❌ Error saving assistant message:", error)
            }
          }
        }
        
        // Convert text stream to UI message stream format for useChat compatibility
        console.log('[Alex] Creating UI message stream...')
        
        const uiMessageStream = createUIMessageStream({
          execute: async ({ writer }) => {
            try {
              let messageId = 'msg-' + Date.now()
              for await (const text of generateTextStream()) {
                // Write text deltas in the format useChat expects
                // AI SDK v6 expects 'delta' not 'textDelta', and requires 'id'
                writer.write({ 
                  type: 'text-delta', 
                  id: messageId,
                  delta: text 
                } as any)
              }
            } catch (error: any) {
              console.error('[Alex] Stream error:', error)
              throw error
            }
          },
          onFinish: async () => {
            // Message finished - already saved in generateTextStream
            console.log('[Alex] ✅ UI message stream finished')
          },
        })
        
        // Return UI message stream response (same format as toUIMessageStreamResponse)
        return createUIMessageStreamResponse({
          stream: uiMessageStream,
          headers: {
            'X-Chat-Id': String(activeChatId),
          },
        })
      } catch (streamError: any) {
        console.error('[Alex] Error creating stream:', streamError)
        return NextResponse.json(
          { error: "Failed to create stream", details: streamError.message },
          { status: 500 }
        )
      }
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

