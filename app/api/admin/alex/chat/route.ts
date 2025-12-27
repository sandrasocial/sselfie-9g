import { tool, generateText } from "ai"
import { z } from "zod"
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { NextResponse } from "next/server"
import { saveChatMessage, createNewChat, getOrCreateActiveChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { buildEmailSystemPrompt } from "@/lib/admin/email-brand-guidelines"

// HTML stripping function - uses regex fallback (works without html-to-text package)
// If html-to-text package is installed later, it can be enhanced, but this works fine for now

const sql = neon(process.env.DATABASE_URL!)

// Initialize Resend client - will be null if API key is missing
let resend: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.error("[Alex] ⚠️ Failed to initialize Resend client:", error)
}

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

// Email-related tools use native Anthropic format
// Other tools (codebase, analytics, etc.) still use AI SDK format with Zod

export async function POST(req: Request) {
  console.log("[Alex] Admin agent chat API called")

  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[Alex] Authentication failed: No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { messages, chatId } = body
    
    // CRITICAL: Extract chatId from body.chatId (which can be overridden per-call via sendMessage options)
    // The useChat hook sets body: { chatId } initially, but sendMessage can override it with options.body
    // When sendMessage is called with { body: { chatId: currentChatId } }, it merges/replaces the chatId
    // So we check body.chatId directly - it will be the most recent value from sendMessage options
    const explicitChatId = chatId

    if (!messages) {
      console.error("[Alex] Messages is null or undefined")
      return NextResponse.json({ error: "Messages is required" }, { status: 400 })
    }

    if (!Array.isArray(messages)) {
      console.error("[Alex] Messages is not an array:", typeof messages)
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (messages.length === 0) {
      console.error("[Alex] Messages array is empty")
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 })
    }

    // Process messages - preserve images and text content (like Alex route)
    // CRITICAL: Preserve id property for deduplication
    const modelMessages = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => {
        // Handle images - preserve full content structure
        if (m.content && Array.isArray(m.content)) {
          const hasImages = m.content.some((p: any) => p && p.type === "image")
          if (hasImages) {
            return {
              role: m.role,
              content: m.content, // Keep full array with images
            }
          }
        }

        // Extract text content from various formats
        let content = ""

        // Format 1: parts array (from useChat)
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p && p.type === "text")
            content = textParts.map((p: any) => p.text || "").join("\n")
        }

        // Format 2: content array
        if (!content && m.content && Array.isArray(m.content)) {
            const textParts = m.content.filter((p: any) => p && p.type === "text")
            content = textParts.map((p: any) => p.text || "").join("\n")
          }
        
        // Format 3: content string
        if (!content && m.content) {
          content = typeof m.content === 'string' ? m.content : String(m.content)
        }

        return {
          role: m.role,
          content: content.trim(),
        }
      })
      .filter((m: any) => m.content && m.content.length > 0)

    if (modelMessages.length === 0) {
      console.error("[Alex] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    console.log(
      "[Alex] Admin agent chat API called with",
      modelMessages.length,
      "messages (filtered from",
      messages.length,
      "), body.chatId:",
      chatId
    )

    // Get or create chat - Use chatId from request body
    // The chatId in body.chatId is set by useChat hook initially, but can be overridden
    // per-call via sendMessage options: sendMessage(message, { body: { chatId: currentChatId } })
    // This ensures we use the correct chatId even if useChat body is stale
    let activeChatId = explicitChatId
    
    console.log('[Alex] 🔍 Chat ID resolution:', {
      bodyChatId: chatId,
      finalActiveChatId: activeChatId
    })
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
      // Reuse existing sql connection (initialized at top of file) instead of creating new one
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

    // Frontend must provide conversation history
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      )
    }

    const modelMessagesToUse = modelMessages

    // Save the last user message to database
    const lastUserMessage = modelMessagesToUse.filter((m: any) => m.role === "user").pop()
    if (lastUserMessage && activeChatId) {
      try {
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
          await saveChatMessage(activeChatId, "user", contentToSave)
          console.log("[Alex] 💾 Saved user message to chat:", {
            chatId: activeChatId,
            messageLength: contentToSave.length,
            bodyChatId: chatId
          })
        }
      } catch (error) {
        console.error("[Alex] Error saving user message:", error)
        // Continue even if save fails
      }
    }

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
    const recentUserMessages = modelMessagesToUse
      .filter((m: any) => m.role === 'user')
      .slice(-5)
    const availableImageUrls = recentUserMessages
      .flatMap((m: any) => extractImageUrls(m))
      .filter((url: string) => url && url.length > 0)

    // Get admin context
    const completeContext = await getCompleteAdminContext()
    console.log('[Alex] 📚 Knowledge base loaded:', completeContext.length, 'chars')
    
    // Log available images for debugging
    if (availableImageUrls.length > 0) {
      console.log('[Alex] 🖼️ Available image URLs from user messages:', availableImageUrls.length)
    }

    // Helper function to strip HTML tags for plain text version
    // Uses regex-based stripping (works without external packages)
    const stripHtml = (html: string): string => {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim()
    }

    // Helper function to generate subject line using Claude
    const generateSubjectLine = async (intent: string, emailType: string): Promise<string> => {
      try {
        const { text } = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          system: `You are Sandra's email marketing assistant. Generate warm, personal subject lines that match Sandra's voice: friendly, empowering, conversational. Keep it under 50 characters.`,
          prompt: `Generate a subject line for: ${intent}\n\nEmail type: ${emailType}\n\nReturn ONLY the subject line, no quotes, no explanation.`,
          maxOutputTokens: 100,
        })
        return text.trim().replace(/^["']|["']$/g, '')
      } catch (error) {
        console.error("[Alex] Error generating subject line:", error)
        return `Update from SSELFIE`
      }
    }

    // Define email tools
    // Native Anthropic format (no Zod)
    const editEmailTool = {
      name: "edit_email",
      description: `Make simple edits to an existing email without regenerating it from scratch.

Use this for quick changes like:
- Change a link URL
- Update a phone number or email address
- Remove/add emojis
- Fix typos
- Change button text
- Update pricing/dates

This preserves the existing email and makes ONLY the requested changes.
For major rewrites, use compose_email with previousVersion instead.`,
      
      input_schema: {
        type: "object",
        properties: {
          previousEmailHtml: {
            type: "string",
            description: "The full HTML of the email to edit (extract from previous message or email preview)"
          },
          editType: {
            type: "string",
            enum: ["change_link", "change_text", "remove_element", "add_element", "fix_typo"],
            description: "Type of edit to make"
          },
          findText: {
            type: "string",
            description: "Text/pattern to find (for replacements or removals)"
          },
          replaceWith: {
            type: "string",
            description: "What to replace it with (leave empty to remove)"
          },
          elementSelector: {
            type: "string",
            description: "CSS selector or description of element to modify (e.g., 'CTA button', 'first link')"
          }
        },
        required: ["previousEmailHtml", "editType"]
      },
      
      execute: async ({
        previousEmailHtml,
        editType,
        findText,
        replaceWith = "",
        elementSelector
      }: {
        previousEmailHtml: string
        editType: string
        findText?: string
        replaceWith?: string
        elementSelector?: string
      }) => {
        try {
          console.log('[Alex] ✏️ Editing email:', { editType, findText: findText?.substring(0, 50) })
          
          let updatedHtml = previousEmailHtml
          
          switch (editType) {
            case "change_link":
              // Find and replace specific link
              if (findText && replaceWith) {
                // Replace exact href match
                updatedHtml = previousEmailHtml.replace(
                  new RegExp(`href="${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                  `href="${replaceWith}"`
                )
                // Also try partial match if exact didn't work
                if (updatedHtml === previousEmailHtml) {
                  updatedHtml = previousEmailHtml.replace(
                    new RegExp(`href="[^"]*${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"`, 'g'),
                    `href="${replaceWith}"`
                  )
                }
              }
              break
              
            case "change_text":
              // Replace text content
              if (findText && replaceWith !== undefined) {
                updatedHtml = previousEmailHtml.replace(
                  new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  replaceWith
                )
              }
              break
              
            case "remove_element":
              // Remove specific text/elements
              if (findText) {
                updatedHtml = previousEmailHtml.replace(
                  new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  ''
                )
              }
              break
              
            case "fix_typo":
              // Direct text replacement
              if (findText && replaceWith !== undefined) {
                updatedHtml = previousEmailHtml.replace(findText, replaceWith)
              }
              break
          }
          
          // Verify something changed
          if (updatedHtml === previousEmailHtml) {
            console.log('[Alex] ⚠️ No changes made - check findText matches')
            return {
              success: false,
              error: `Could not find "${findText?.substring(0, 50)}..." in email HTML. Please check the text to find.`,
              suggestion: "Try copying the exact text from the email preview"
            }
          }
          
          console.log('[Alex] ✅ Email edited successfully')
          
          // Generate preview text
          const bodyText = stripHtml(updatedHtml)
          const preview = bodyText.substring(0, 200).trim() + (bodyText.length > 200 ? '...' : '')
          
          // Extract subject line if present (from email structure or generate simple one)
          const subjectMatch = updatedHtml.match(/<title>(.*?)<\/title>/i)
          const subjectLine = subjectMatch?.[1] || "Updated Email"
          
          return {
            success: true,
            html: updatedHtml,
            subjectLine,
            preview,
            changes: `${editType}: "${findText?.substring(0, 30)}..." → "${replaceWith?.substring(0, 30)}..."`,
            message: "Email edited successfully"
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error editing email:', error)
          return {
            success: false,
            error: error.message || 'Failed to edit email'
          }
        }
      }
    }

    const composeEmailTool = {
      name: "compose_email",
      description: `Create or refine email content. Returns formatted HTML email.

Use this when Sandra wants to:
  - Create a new email campaign
- Edit/refine existing email content
  - Generate subject lines
  - Use email templates
  
  Examples:
  - "Create a welcome email for new Studio members"
  - "Write a newsletter about the new Maya features"
- "Make that email warmer and add a PS"`,
      
      input_schema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description: "What Sandra wants to accomplish with this email"
          },
          emailType: {
            type: "string",
            enum: ["welcome", "newsletter", "promotional", "announcement", "nurture", "reengagement"],
            description: "Type of email to create"
          },
          subjectLine: {
            type: "string",
            description: "Subject line (generate if not provided)"
          },
          keyPoints: {
            type: "array",
            items: { type: "string" },
            description: "Main points to include"
          },
          tone: {
            type: "string",
            enum: ["warm", "professional", "excited", "urgent"],
            description: "Tone for the email (defaults to warm if not specified)"
          },
          previousVersion: {
            type: "string",
            description: "Previous email HTML if refining"
          },
          imageUrls: {
            type: "array",
            items: { type: "string" },
            description: "Array of image URLs to include in the email"
          },
          campaignName: {
            type: "string",
            description: "Optional campaign name for generating tracked links"
          },
          campaignId: {
            type: "number",
            description: "Optional campaign ID to update existing draft campaign"
          }
        },
        required: ["intent", "emailType"]
      },
      
      execute: async ({ intent, emailType, subjectLine, keyPoints, tone = 'warm', previousVersion, imageUrls, campaignName, campaignId }: {
        intent: string
        emailType: string
        subjectLine?: string
        keyPoints?: string[]
        tone?: string
        previousVersion?: string
        imageUrls?: string[]
        campaignName?: string
        campaignId?: number
      }) => {
        console.log('[Alex] 📧 compose_email called:', {
          intent: intent?.substring(0, 100),
          emailType,
          hasPreviousVersion: !!previousVersion,
          previousVersionLength: previousVersion?.length || 0,
          previousVersionPreview: previousVersion ? `${previousVersion.substring(0, 100)}...` : null,
          previousVersionStartsWithHtml: previousVersion?.trim().startsWith('<!DOCTYPE') || previousVersion?.trim().startsWith('<html'),
          hasImageUrls: !!(imageUrls && imageUrls.length > 0),
          imageCount: imageUrls?.length || 0
        })
        
        // Log warning if previousVersion is provided but doesn't look like HTML
        if (previousVersion && !previousVersion.trim().startsWith('<!DOCTYPE') && !previousVersion.trim().startsWith('<html')) {
          console.warn('[Alex] ⚠️ WARNING: previousVersion provided but does not start with <!DOCTYPE or <html. This might not be valid HTML:', {
            preview: previousVersion.substring(0, 200),
            length: previousVersion.length
          })
        }
        
        try {
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
          
          // 3. Use Claude to generate/refine email content
          // Build system prompt using shared brand guidelines
          // Note: previousVersion is NOT passed to buildEmailSystemPrompt - it's included in user prompt below
          // to avoid truncation and ensure full HTML context
          const systemPrompt = buildEmailSystemPrompt({
            tone,
            // Don't pass previousVersion here - it's included in user prompt below for full HTML
            campaignSlug,
            siteUrl,
            imageUrls: imageUrls || [],
            templates: templates.length > 0 ? templates : [],
          })
          
          // Add editing instructions to system prompt if we're editing
          const editingInstructions = previousVersion ? `CRITICAL: You are EDITING an existing email. The complete previous version HTML is provided in the user prompt below.

Your task: Make ONLY the specific changes Sandra requested while keeping everything else EXACTLY the same:
- Same structure and layout
- Same brand styling and colors
- Same content (unless specifically asked to change it)
- Same images and links (unless specifically asked to change them)

For small edits (like "add a link" or "change a few words"), make MINIMAL targeted changes. Do NOT rewrite the entire email. Only modify what was explicitly requested.` : ''
          
          const finalSystemPrompt = editingInstructions ? `${systemPrompt}\n\n${editingInstructions}` : systemPrompt
          
          // Build user prompt - if previousVersion exists, include the FULL HTML here
          const userPrompt = previousVersion
            ? `Edit request: ${intent}

${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `Images to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}
PREVIOUS EMAIL HTML (make the requested changes to this):
${previousVersion}

Remember: Make ONLY the changes I requested. Keep everything else exactly the same.`
            : `${intent}\n\n${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `\nImages to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}`
          
          // Generate email HTML with timeout protection
          let emailHtmlRaw: string
          let timeoutId: NodeJS.Timeout | null = null
          try {
            // Create a timeout promise that can be cancelled
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(new Error('Email generation timed out after 30 seconds'))
              }, 30000)
            })
            
            // Race between generateText and timeout
            const result = await Promise.race([
              generateText({
                model: "anthropic/claude-sonnet-4-20250514",
                system: finalSystemPrompt,
                prompt: userPrompt,
                maxOutputTokens: 4096,
              }),
              timeoutPromise
            ])
            
            // Clear timeout regardless of which promise won (success or failure)
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            
            emailHtmlRaw = result.text
          } catch (genError: any) {
            // Clear timeout on error to prevent unhandled promise rejection
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            console.error("[Alex] ❌ Email generation failed:", genError)
            throw new Error(`Failed to generate email content: ${genError.message || 'Unknown error'}`)
          }
          
          // Validate that we got HTML content
          if (!emailHtmlRaw || typeof emailHtmlRaw !== 'string') {
            throw new Error('Email generation returned invalid content')
          }
          
          // Clean up the HTML response - remove markdown code blocks if present
          let emailHtml = emailHtmlRaw.trim()
          
          // Validate HTML structure
          if (!emailHtml || emailHtml.length < 50) {
            throw new Error('Generated email HTML is too short or empty')
          }
          
          // Remove markdown code blocks (```html ... ``` or ``` ... ```)
          emailHtml = emailHtml.replace(/^```html\s*/i, '')
          emailHtml = emailHtml.replace(/^```\s*/, '')
          emailHtml = emailHtml.replace(/\s*```$/g, '')
          emailHtml = emailHtml.trim()
          
          // Ensure images are properly included if imageUrls were provided
          if (imageUrls && imageUrls.length > 0) {
            // Check if images are already in the HTML
            const missingImages = imageUrls.filter(url => !emailHtml.includes(url))
            
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
                // Find the first main table within bodyContent
                const mainTableMatch = bodyContent.match(/(<table[^>]*role=["']presentation["'][^>]*>)/i)
                if (mainTableMatch) {
                  // Calculate correct positions:
                  // - bodyMatch.index: position of <body> tag in emailHtml
                  // - bodyMatch[0].indexOf('>') + 1: position after <body> tag (start of bodyContent)
                  // - mainTableMatch.index: position of table tag within bodyContent
                  // - mainTableMatch[0].length: length of table opening tag
                  const bodyTagEndPos = bodyMatch.index! + bodyMatch[0].indexOf('>') + 1
                  const tablePosInEmailHtml = bodyTagEndPos + mainTableMatch.index!
                  const tableTagEndPos = tablePosInEmailHtml + mainTableMatch[0].length
                  
                  // Insert images right after the opening table tag
                  emailHtml = emailHtml.substring(0, tableTagEndPos) + 
                    imageRows + 
                    emailHtml.substring(tableTagEndPos)
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
          
          // 4. Create or update draft campaign in database
          let finalCampaignId: number
          const bodyText = stripHtml(emailHtml)
          const draftCampaignName = campaignName || `${emailType} - ${finalSubjectLine.substring(0, 50)}`
          
          try {
            if (campaignId) {
              // Update existing campaign
              await sql`
                UPDATE admin_email_campaigns
                SET 
                  subject_line = ${finalSubjectLine},
                  body_html = ${emailHtml},
                  body_text = ${bodyText},
                  campaign_name = ${draftCampaignName},
                  updated_at = NOW()
                WHERE id = ${campaignId}
              `
              finalCampaignId = campaignId
              console.log('[Alex] 📧 Updated existing draft campaign:', campaignId)
            } else {
              // Create new draft campaign
              const campaignResult = await sql`
                INSERT INTO admin_email_campaigns (
                  campaign_name, campaign_type, subject_line,
                  body_html, body_text, status, approval_status,
                  created_by, created_at, updated_at
                ) VALUES (
                  ${draftCampaignName}, ${emailType}, ${finalSubjectLine},
                  ${emailHtml}, ${bodyText}, 'draft', 'draft',
                  ${ADMIN_EMAIL}, NOW(), NOW()
                )
                RETURNING id
              `
              
              if (!campaignResult || campaignResult.length === 0 || !campaignResult[0]?.id) {
                console.error('[Alex] Failed to create draft campaign, continuing without campaignId')
                finalCampaignId = 0 // Use 0 to indicate failure (won't break ID-based editing)
              } else {
                finalCampaignId = campaignResult[0].id
                console.log('[Alex] 📧 Created new draft campaign:', finalCampaignId)
              }
            }
          } catch (campaignError: any) {
            console.error('[Alex] Error creating/updating draft campaign:', campaignError)
            // Continue even if campaign creation fails - email generation succeeded
            finalCampaignId = 0
          }
          
          return {
            html: emailHtml,
            subjectLine: finalSubjectLine,
            preview: previewText,
            readyToSend: true,
            campaignId: finalCampaignId > 0 ? finalCampaignId : undefined
          }
        } catch (error: any) {
          console.error("[Alex] ❌ Error in compose_email tool:", error)
          console.error("[Alex] ❌ Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            intent: intent,
            emailType: emailType,
            hasImageUrls: !!(imageUrls && imageUrls.length > 0),
            imageCount: imageUrls?.length || 0
          })
          
          // Provide more helpful error message
          let errorMessage = "Failed to compose email"
          if (error.message?.includes('timeout') || error.message?.includes('time')) {
            errorMessage = "Email generation timed out. Please try again with a shorter request."
          } else if (error.message?.includes('token') || error.message?.includes('limit')) {
            errorMessage = "Email content too long. Please simplify your request or split into multiple emails."
          } else if (error.message) {
            errorMessage = `Email generation failed: ${error.message}`
          }
          
          return {
            error: errorMessage,
            html: "",
            subjectLine: subjectLine || "Email Subject",
            preview: "",
            readyToSend: false,
            errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        }
      }
    }

    const getEmailCampaignTool = tool({
      description: `Fetch email campaign HTML and metadata by campaign ID. Use this when Sandra wants to edit an existing email - get the current HTML first, then use compose_email with previousVersion and campaignId parameters.`,
      
      parameters: z.object({
        campaignId: z.number().describe("Campaign ID to fetch")
      }),
      
      execute: async ({ campaignId }: { campaignId: number }) => {
        console.log('[Alex] 📧 get_email_campaign called:', { campaignId })
        
        try {
          const [campaign] = await sql`
            SELECT id, campaign_name, subject_line, body_html, body_text, campaign_type, status
            FROM admin_email_campaigns
            WHERE id = ${campaignId}
          `
          
          if (!campaign) {
            return {
              error: `Campaign with ID ${campaignId} not found`,
              campaignId: null,
              html: null,
              subjectLine: null,
              campaignName: null
            }
          }
          
          console.log('[Alex] ✅ Found campaign:', {
            id: campaign.id,
            name: campaign.campaign_name,
            hasHtml: !!campaign.body_html,
            htmlLength: campaign.body_html?.length || 0
          })
          
          return {
            campaignId: campaign.id,
            html: campaign.body_html,
            subjectLine: campaign.subject_line,
            campaignName: campaign.campaign_name,
            campaignType: campaign.campaign_type,
            status: campaign.status
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error fetching campaign:', error)
          return {
            error: `Failed to fetch campaign: ${error.message || 'Unknown error'}`,
            campaignId: null,
            html: null,
            subjectLine: null,
            campaignName: null
          }
        }
      }
    } as any)

    const scheduleCampaignTool = {
      name: "schedule_campaign",
      description: `Schedule or send an email campaign. Creates campaign in database and Resend.
  
  Use this when Sandra approves the email and wants to send it.
  
  CRITICAL: Always ask Sandra to confirm:
  1. Who should receive it (segment/audience)
  2. When to send (now or scheduled time)
  
  Before calling this tool.`,
      
      input_schema: {
        type: "object",
        properties: {
          campaignName: {
            type: "string",
            description: "Name for this campaign"
          },
          subjectLine: {
            type: "string",
            description: "Email subject line"
          },
          emailHtml: {
            type: "string",
            description: "The approved email HTML"
          },
          targetAudienceAllUsers: {
            type: "boolean",
            description: "Send to all users"
          },
          targetAudiencePlan: {
            type: "string",
            description: "Target specific plan"
          },
          targetAudienceResendSegmentId: {
            type: "string",
            description: "Resend segment ID"
          },
          targetAudienceRecipients: {
            type: "array",
            items: { type: "string" },
            description: "Specific recipient emails"
          },
          scheduledFor: {
            type: "string",
            description: "ISO datetime to send, or null for immediate"
          },
          campaignType: {
            type: "string",
            description: "Type of campaign"
          }
        },
        required: ["campaignName", "subjectLine", "emailHtml", "campaignType"]
      },
      
      execute: async ({ campaignName, subjectLine, emailHtml, targetAudienceAllUsers, targetAudiencePlan, targetAudienceResendSegmentId, targetAudienceRecipients, scheduledFor, campaignType }: {
        campaignName: string
        subjectLine: string
        emailHtml: string
        targetAudienceAllUsers?: boolean
        targetAudiencePlan?: string
        targetAudienceResendSegmentId?: string
        targetAudienceRecipients?: string[]
        scheduledFor?: string
        campaignType: string
      }) => {
        // Reconstruct targetAudience from flattened parameters
        const targetAudience: any = {}
        if (targetAudienceAllUsers !== undefined) targetAudience.all_users = targetAudienceAllUsers
        if (targetAudiencePlan) targetAudience.plan = targetAudiencePlan
        if (targetAudienceResendSegmentId) targetAudience.resend_segment_id = targetAudienceResendSegmentId
        if (targetAudienceRecipients) targetAudience.recipients = targetAudienceRecipients
        try {
          // Use a temporary campaign ID placeholder that we'll replace after INSERT
          // We need the actual campaign ID, so we'll use a transaction-like approach:
          // 1. Insert with placeholder
          // 2. Get the ID
          // 3. Replace placeholders
          // 4. Update with final HTML
          // If UPDATE fails, we'll rollback by deleting the campaign
          
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
          
          // 5. If sending now, create Resend broadcast
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
            // If resend_segment_id is provided, use it (segments act as separate audiences in Resend)
            // Otherwise, use the default audience ID
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
            
            // Log which audience/segment is being targeted for debugging
            if (targetAudience?.resend_segment_id) {
              console.log(`[Alex] Creating broadcast for segment: ${targetAudience.resend_segment_id}`)
            } else {
              console.log(`[Alex] Creating broadcast for full audience: ${targetAudienceId}`)
            }
            
            try {
              const broadcast = await resend.broadcasts.create({
                audienceId: targetAudienceId,
                from: 'Sandra from SSELFIE <hello@sselfie.ai>',
                subject: subjectLine,
                html: finalEmailHtml
              })
              
              broadcastId = broadcast.data?.id || null
              
              // Update campaign with broadcast ID and status (body_html already updated above)
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
    }

    // Helper function to generate a single email (extracted from compose_email for reuse)
    const generateEmailContent = async ({
      intent,
      emailType,
      subjectLine,
      keyPoints,
      tone = 'warm',
      previousVersion,
      imageUrls,
      campaignName
    }: {
      intent: string
      emailType: string
      subjectLine?: string
      keyPoints?: string[]
      tone?: string
      previousVersion?: string
      imageUrls?: string[]
      campaignName?: string
    }): Promise<{ html: string; subjectLine: string; preview: string; readyToSend: boolean }> => {
      try {
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
        
        // 3. Use Claude to generate/refine email content
        // Build system prompt using shared brand guidelines
        // Note: previousVersion is NOT passed to buildEmailSystemPrompt - it's included in user prompt below
        // to avoid truncation and ensure full HTML context
        const systemPrompt = buildEmailSystemPrompt({
          tone,
          // Don't pass previousVersion here - it's included in user prompt below for full HTML
          campaignSlug,
          siteUrl,
          imageUrls: imageUrls || [],
          templates: templates.length > 0 ? templates : [],
        })
        
        // Add editing instructions to system prompt if we're editing
        const editingInstructions = previousVersion ? `CRITICAL: You are EDITING an existing email. The complete previous version HTML is provided in the user prompt below.

Your task: Make ONLY the specific changes Sandra requested while keeping everything else EXACTLY the same:
- Same structure and layout
- Same brand styling and colors
- Same content (unless specifically asked to change it)
- Same images and links (unless specifically asked to change them)

For small edits (like "add a link" or "change a few words"), make MINIMAL targeted changes. Do NOT rewrite the entire email. Only modify what was explicitly requested.` : ''
        
        const finalSystemPrompt = editingInstructions ? `${systemPrompt}\n\n${editingInstructions}` : systemPrompt
          
        // Build user prompt - if previousVersion exists, include the FULL HTML here
        const userPrompt = previousVersion
          ? `Edit request: ${intent}

${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `Images to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}
PREVIOUS EMAIL HTML (make the requested changes to this):
${previousVersion}

Remember: Make ONLY the changes I requested. Keep everything else exactly the same.`
          : `${intent}\n\n${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `\nImages to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}`
        
        // Generate email HTML with timeout protection
        let emailHtmlRaw: string
        let timeoutId: NodeJS.Timeout | null = null
        try {
          // Create a timeout promise that can be cancelled
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('Email generation timed out after 30 seconds'))
            }, 30000)
          })
          
            // Race between generateText and timeout
            const result = await Promise.race([
              generateText({
                model: "anthropic/claude-sonnet-4-20250514",
                system: finalSystemPrompt,
                prompt: userPrompt,
                maxOutputTokens: 4096,
              }),
            timeoutPromise
          ])
          
          // Clear timeout regardless of which promise won (success or failure)
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          
          emailHtmlRaw = result.text
        } catch (genError: any) {
          // Clear timeout on error to prevent unhandled promise rejection
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          console.error("[Alex] ❌ Email generation failed:", genError)
          throw new Error(`Failed to generate email content: ${genError.message || 'Unknown error'}`)
        }
        
        // Validate that we got HTML content
        if (!emailHtmlRaw || typeof emailHtmlRaw !== 'string') {
          throw new Error('Email generation returned invalid content')
        }
        
        // Clean up the HTML response - remove markdown code blocks if present
        let emailHtml = emailHtmlRaw.trim()
        
        // Validate HTML structure
        if (!emailHtml || emailHtml.length < 50) {
          throw new Error('Generated email HTML is too short or empty')
        }
        
        // Remove markdown code blocks (```html ... ``` or ``` ... ```)
        emailHtml = emailHtml.replace(/^```html\s*/i, '')
        emailHtml = emailHtml.replace(/^```\s*/, '')
        emailHtml = emailHtml.replace(/\s*```$/g, '')
        emailHtml = emailHtml.trim()
        
        // Ensure images are properly included if imageUrls were provided
        if (imageUrls && imageUrls.length > 0) {
          // Check if images are already in the HTML
          const missingImages = imageUrls.filter(url => !emailHtml.includes(url))
          
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
              // Find the first main table within bodyContent
              const mainTableMatch = bodyContent.match(/(<table[^>]*role=["']presentation["'][^>]*>)/i)
              if (mainTableMatch) {
                // Calculate correct positions:
                // - bodyMatch.index: position of <body> tag in emailHtml
                // - bodyMatch[0].indexOf('>') + 1: position after <body> tag (start of bodyContent)
                // - mainTableMatch.index: position of table tag within bodyContent
                // - mainTableMatch[0].length: length of table opening tag
                const bodyTagEndPos = bodyMatch.index! + bodyMatch[0].indexOf('>') + 1
                const tablePosInEmailHtml = bodyTagEndPos + mainTableMatch.index!
                const tableTagEndPos = tablePosInEmailHtml + mainTableMatch[0].length
                
                // Insert images right after the opening table tag
                emailHtml = emailHtml.substring(0, tableTagEndPos) + 
                  imageRows + 
                  emailHtml.substring(tableTagEndPos)
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
        
        // Generate subject line if not provided
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
        console.error("[Alex] ❌ Error generating email content:", error)
        throw error
      }
    }

    // Now update compose_email to use the helper function
    // (We'll keep the existing compose_email tool but refactor it to use generateEmailContent)
    // Actually, let's keep compose_email as-is for now and create the sequence tool

    const createEmailSequenceTool = {
      name: "create_email_sequence",
      description: `Create multiple emails in a sequence (e.g., nurture sequence, welcome series). 
  
  Use this when Sandra wants to create a series of related emails that will be sent over time (e.g., Day 1, Day 3, Day 7 nurture sequence).
  
  This tool creates all emails in the sequence at once, so Sandra can review and edit each one before scheduling.
  
  Examples:
  - "Create a 3-email nurture sequence for new freebie signups: Day 1 welcome, Day 3 value, Day 7 upsell"
  - "Create a welcome sequence: Day 1 intro, Day 3 tips, Day 7 offer"
  - "Create a 5-email onboarding sequence for new Studio members"`,
      
      input_schema: {
        type: "object",
        properties: {
          sequenceName: {
            type: "string",
            description: "Name for this email sequence (e.g., 'New Freebie Nurture Sequence')"
          },
          emails: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: {
                  type: "number",
                  description: "Day number in sequence (e.g., 1, 3, 7) - optional but helpful for tracking"
                },
                intent: {
                  type: "string",
                  description: "What this specific email should accomplish"
                },
                emailType: {
                  type: "string",
                  enum: ["welcome", "newsletter", "promotional", "announcement", "nurture", "reengagement"],
                  description: "Type of email"
                },
                subjectLine: {
                  type: "string",
                  description: "Subject line (generate if not provided)"
                },
                keyPoints: {
                  type: "array",
                  items: { type: "string" },
                  description: "Main points to include in this email"
                },
                tone: {
                  type: "string",
                  enum: ["warm", "professional", "excited", "urgent"],
                  description: "Tone for this email (defaults to warm)"
                },
                imageUrls: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of image URLs to include in this email"
                }
              },
              required: ["intent", "emailType"]
            },
            description: "Array of email configurations for the sequence (1-10 emails)"
          },
          campaignName: {
            type: "string",
            description: "Campaign name for generating tracked links (will be used for all emails in sequence)"
          },
          overallTone: {
            type: "string",
            enum: ["warm", "professional", "excited", "urgent"],
            description: "Overall tone for the sequence (individual emails can override)"
          }
        },
        required: ["sequenceName", "emails"]
      },
      
      execute: async ({ sequenceName, emails, campaignName, overallTone = 'warm' }: {
        sequenceName: string
        emails: Array<{
          day?: number
          intent: string
          emailType: string
          subjectLine?: string
          keyPoints?: string[]
          tone?: string
          imageUrls?: string[]
        }>
        campaignName?: string
        overallTone?: string
      }) => {
        console.log('[Alex] 📧 create_email_sequence called:', {
          sequenceName,
          emailCount: emails.length,
          campaignName,
          overallTone
        })
        
        try {
          const results: Array<{
            day?: number
            html: string
            subjectLine: string
            preview: string
            readyToSend: boolean
            intent: string
            emailType: string
            error?: string
          }> = []
          
          // Generate each email in the sequence
          for (let i = 0; i < emails.length; i++) {
            const emailConfig = emails[i]
            console.log(`[Alex] 📧 Generating email ${i + 1}/${emails.length} for sequence "${sequenceName}"...`, {
              day: emailConfig.day,
              intent: emailConfig.intent.substring(0, 100),
              emailType: emailConfig.emailType
            })
            
            try {
              // Use the helper function to generate email content
              const emailResult = await generateEmailContent({
                intent: emailConfig.intent,
                emailType: emailConfig.emailType,
                subjectLine: emailConfig.subjectLine,
                keyPoints: emailConfig.keyPoints,
                tone: emailConfig.tone || overallTone,
                imageUrls: emailConfig.imageUrls,
                campaignName: campaignName || sequenceName
              })
              
              results.push({
                day: emailConfig.day,
                html: emailResult.html,
                subjectLine: emailResult.subjectLine,
                preview: emailResult.preview,
                readyToSend: emailResult.readyToSend,
                intent: emailConfig.intent,
                emailType: emailConfig.emailType
              })
              
              console.log(`[Alex] ✅ Generated email ${i + 1}/${emails.length}:`, {
                day: emailConfig.day,
                subjectLine: emailResult.subjectLine,
                htmlLength: emailResult.html.length
              })
            } catch (emailError: any) {
              console.error(`[Alex] ❌ Error generating email ${i + 1}/${emails.length}:`, emailError)
              results.push({
                day: emailConfig.day,
                html: "",
                subjectLine: emailConfig.subjectLine || "Email Subject",
                preview: "",
                readyToSend: false,
                intent: emailConfig.intent,
                emailType: emailConfig.emailType,
                error: emailError.message || "Failed to generate email"
              })
            }
          }
          
          // Check if all emails were generated successfully
          const successCount = results.filter(r => r.readyToSend).length
          const failureCount = results.filter(r => !r.readyToSend).length
          
          console.log('[Alex] 📧 Sequence generation complete:', {
            sequenceName,
            total: emails.length,
            success: successCount,
            failed: failureCount
          })
          
          return {
            sequenceName,
            emails: results,
            totalEmails: emails.length,
            successCount,
            failureCount,
            allSuccessful: failureCount === 0,
            message: failureCount === 0
              ? `Successfully created ${successCount} emails for sequence "${sequenceName}"`
              : `Created ${successCount} emails successfully, ${failureCount} failed for sequence "${sequenceName}"`
          }
        } catch (error: any) {
          console.error("[Alex] ❌ Error in create_email_sequence tool:", error)
          return {
            sequenceName,
            emails: [],
            totalEmails: emails.length,
            successCount: 0,
            failureCount: emails.length,
            allSuccessful: false,
            error: error.message || "Failed to create email sequence",
            message: `Failed to create email sequence: ${error.message || 'Unknown error'}`
          }
        }
      }
    }

    const checkCampaignStatusTool = {
      name: "check_campaign_status",
      description: `Check status of email campaigns and get delivery metrics.
  
  Use this when Sandra asks about email performance or delivery status.`,
      
      input_schema: {
        type: "object",
        properties: {
          campaignId: {
            type: "number",
            description: "Specific campaign ID, or null for recent campaigns"
          },
          timeframe: {
            type: "string",
            enum: ["today", "week", "month", "all"],
            description: "Timeframe for campaigns (defaults to week if not specified)"
          }
        },
        required: []
      },
      
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
          
          // For each campaign with resend_broadcast_id, fetch stats from Resend API (real-time)
          const results = []
          for (const campaign of campaigns) {
            let stats: any = { total: 0, sent: 0, failed: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
            let resendStats: any = null
            
            // If we have a Resend broadcast ID, fetch real stats from Resend API
            if (campaign.resend_broadcast_id && resend) {
              try {
                console.log(`[Alex] 📊 Fetching Resend stats for broadcast: ${campaign.resend_broadcast_id}`)
                
                // Try to get broadcast stats from Resend API
                // Note: Resend SDK may use broadcasts.get() or similar
                const broadcastResponse = await (resend as any).broadcasts?.get?.(campaign.resend_broadcast_id) ||
                                         await (resend as any).broadcasts?.retrieve?.(campaign.resend_broadcast_id) ||
                                         null
                
                if (broadcastResponse && broadcastResponse.data) {
                  resendStats = broadcastResponse.data
                  console.log(`[Alex] ✅ Got Resend stats for broadcast ${campaign.resend_broadcast_id}`)
                } else {
                  // Fallback: Try direct API call
                  try {
                    const apiResponse = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}`, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                    })
                    
                    if (apiResponse.ok) {
                      const apiData = await apiResponse.json()
                      resendStats = apiData
                      console.log(`[Alex] ✅ Got Resend stats via direct API`)
                    }
                  } catch (apiError) {
                    console.warn(`[Alex] ⚠️ Direct API call failed for broadcast ${campaign.resend_broadcast_id}:`, apiError)
                  }
                }
                
                // Extract stats from Resend response
                if (resendStats) {
                  stats = {
                    total: resendStats.recipients_count || resendStats.total_recipients || 0,
                    sent: resendStats.sent_count || resendStats.total_sent || 0,
                    delivered: resendStats.delivered_count || resendStats.total_delivered || 0,
                    opened: resendStats.opened_count || resendStats.total_opens || 0,
                    clicked: resendStats.clicked_count || resendStats.total_clicks || 0,
                    bounced: resendStats.bounced_count || resendStats.total_bounces || 0,
                    failed: resendStats.failed_count || resendStats.total_failed || 0,
                    // Calculate rates
                    deliveryRate: resendStats.delivered_count && resendStats.sent_count 
                      ? ((resendStats.delivered_count / resendStats.sent_count) * 100).toFixed(1) + '%'
                      : null,
                    openRate: resendStats.opened_count && resendStats.delivered_count
                      ? ((resendStats.opened_count / resendStats.delivered_count) * 100).toFixed(1) + '%'
                      : null,
                    clickRate: resendStats.clicked_count && resendStats.delivered_count
                      ? ((resendStats.clicked_count / resendStats.delivered_count) * 100).toFixed(1) + '%'
                      : null,
                  }
                }
              } catch (resendError: any) {
                console.warn(`[Alex] ⚠️ Failed to fetch Resend stats for broadcast ${campaign.resend_broadcast_id}:`, resendError.message)
                // Fall through to database logs
              }
            }
            
            // FALLBACK: If Resend API didn't return stats, use database logs
            if (!resendStats) {
              const logs = await sql`
                SELECT 
                  COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'sent') as sent,
                  COUNT(*) FILTER (WHERE status = 'failed') as failed
                FROM email_logs
                WHERE email_type = 'campaign' 
                AND campaign_id = ${campaign.id}
              `
              
              stats = logs[0] || { total: 0, sent: 0, failed: 0 }
            }
            
            // Determine actual send date: prefer Resend created_at, then database sent_at, fallback to created_at for sent campaigns
            // Note: scheduled_for is NOT used for sent campaigns as it represents scheduled time, not actual send time
            let actualSentAt: string | null = null
            if (resendStats && (resendStats.created_at || resendStats.sent_at)) {
              actualSentAt = resendStats.created_at || resendStats.sent_at
              console.log(`[Alex] 📅 Using Resend send date: ${actualSentAt}`)
            } else if (campaign.sent_at) {
              actualSentAt = campaign.sent_at
              console.log(`[Alex] 📅 Using database sent_at: ${actualSentAt}`)
            } else if (campaign.status === 'sent') {
              // If status is sent but no sent_at, use created_at as fallback
              // Do NOT use scheduled_for for sent campaigns - it's the scheduled time, not actual send time
              actualSentAt = campaign.created_at
              console.log(`[Alex] 📅 Using created_at as fallback send date: ${actualSentAt}`)
            }
            
            // Calculate days since sent (if we have a send date)
            let daysSinceSent: number | null = null
            if (actualSentAt) {
              const sentDate = new Date(actualSentAt)
              const now = new Date()
              daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
            }
            
            results.push({
              id: campaign.id,
              name: campaign.campaign_name,
              status: campaign.status,
              subject: campaign.subject_line,
              createdAt: campaign.created_at,
              scheduledFor: campaign.scheduled_for,
              sentAt: actualSentAt, // Actual send date (from Resend or database)
              daysSinceSent: daysSinceSent, // Days since email was sent (null if not sent yet)
              broadcastId: campaign.resend_broadcast_id,
              stats: stats,
              source: resendStats ? 'resend_api' : 'database_logs' // Indicate data source
            })
          }
          
          // Build detailed summary with real-time metrics
          const sentCampaigns = results.filter(c => c.status === 'sent')
          const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.stats.sent || 0), 0)
          const totalDelivered = sentCampaigns.reduce((sum, c) => sum + (c.stats.delivered || 0), 0)
          const totalOpened = sentCampaigns.reduce((sum, c) => sum + (c.stats.opened || 0), 0)
          const totalClicked = sentCampaigns.reduce((sum, c) => sum + (c.stats.clicked || 0), 0)
          
          return {
            campaigns: results,
            summary: {
              total: results.length,
              sent: results.filter(c => c.status === 'sent').length,
              scheduled: results.filter(c => c.status === 'scheduled').length,
              draft: results.filter(c => c.status === 'draft').length,
              // Real-time metrics from Resend (if available)
              metrics: {
                totalSent,
                totalDelivered,
                totalOpened,
                totalClicked,
                avgDeliveryRate: sentCampaigns.length > 0 && totalSent > 0
                  ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%'
                  : null,
                avgOpenRate: sentCampaigns.length > 0 && totalDelivered > 0
                  ? ((totalOpened / totalDelivered) * 100).toFixed(1) + '%'
                  : null,
                avgClickRate: sentCampaigns.length > 0 && totalDelivered > 0
                  ? ((totalClicked / totalDelivered) * 100).toFixed(1) + '%'
                  : null,
              }
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
    }

    const getResendAudienceDataTool = {
      name: "get_resend_audience_data",
      description: `Get real-time audience data from Resend including all segments and contact counts.
  
  Use this when Sandra asks about:
  - Her audience size
  - Available segments
  - Who to target
  - Email strategy planning
  
  This gives you live data to make intelligent recommendations.`,
      
      input_schema: {
        type: "object",
        properties: {
          includeSegmentDetails: {
            type: "boolean",
            description: "Include detailed segment information (defaults to true if not specified)"
          }
        },
        required: []
      },
      
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
          
          // Get audience details - verify connection works
          let audience: any
          try {
            console.log('[Alex] 🔗 Testing Resend connection by fetching audience:', audienceId)
            audience = await resend.audiences.get(audienceId)
            console.log('[Alex] ✅ Resend connection successful, audience:', audience.data?.name || audienceId)
          } catch (audienceError: any) {
            console.error('[Alex] ❌ Failed to fetch audience from Resend:', audienceError.message)
            throw new Error(`Resend API connection failed: ${audienceError.message}. Please verify RESEND_API_KEY and RESEND_AUDIENCE_ID are correct.`)
          }
          
          // Get all contacts to calculate total
          // Use the helper function that handles pagination
          let contacts: any[] = []
          try {
            console.log('[Alex] 📊 Fetching contacts from Resend...')
            const { getAudienceContacts } = await import("@/lib/resend/get-audience-contacts")
            contacts = await getAudienceContacts(audienceId)
            console.log(`[Alex] ✅ Fetched ${contacts.length} contacts from Resend`)
            
            // CRITICAL: Wait after fetching contacts to avoid rate limiting the segments API call
            // Resend allows 2 requests per second, so we need to space out our API calls
            console.log('[Alex] ⏳ Waiting 1 second before fetching segments to avoid rate limits...')
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } catch (contactsError: any) {
            console.error('[Alex] ❌ Failed to fetch contacts from Resend:', contactsError.message)
            // Don't throw - continue with empty contacts array, but log the issue
            contacts = []
            // Still wait to avoid rate limiting segments call
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
          
          let segments: any[] = []
          let usingFallbackData = false // Track if we're using fallback data
          
          if (includeSegmentDetails) {
            // FIRST: Try to get segments from Resend API (real-time data)
            try {
              console.log('[Alex] 📋 Fetching segments from Resend API...')
              // Try SDK methods first (if they exist)
              let segmentsResponse: any = null
              
              // Try segments.list() - Resend segments are global, not per-audience
              // The SDK method should list all segments
              if ((resend as any).segments?.list) {
                try {
                  // Try without parameters first (segments are global in Resend)
                  segmentsResponse = await (resend as any).segments.list()
                  console.log('[Alex] ✅ SDK segments.list() succeeded')
                } catch (sdkError: any) {
                  console.log('[Alex] ⚠️ SDK segments.list() failed:', sdkError.message || sdkError)
                  // Try with audienceId if the method supports it
                  try {
                    segmentsResponse = await (resend as any).segments.list({ audienceId: audienceId })
                    console.log('[Alex] ✅ SDK segments.list() with audienceId succeeded')
                  } catch (sdkError2: any) {
                    console.log('[Alex] ⚠️ SDK segments.list() with audienceId also failed:', sdkError2.message || sdkError2)
                  }
                }
              }
              
              // Try alternative SDK method names
              if (!segmentsResponse && (resend as any).segments?.getAll) {
                try {
                  segmentsResponse = await (resend as any).segments.getAll()
                  console.log('[Alex] ✅ SDK segments.getAll() succeeded')
                } catch (e: any) {
                  console.log('[Alex] ⚠️ SDK segments.getAll() failed:', e.message || e)
                }
              }
              
              if (segmentsResponse && segmentsResponse.data && Array.isArray(segmentsResponse.data)) {
                console.log(`[Alex] ✅ Found ${segmentsResponse.data.length} segments from Resend SDK`)
                segments = segmentsResponse.data.map((seg: any) => ({
                  id: seg.id,
                  name: seg.name || 'Unnamed Segment',
                  size: seg.contact_count || seg.size || null, // Get real segment size if available
                  createdAt: seg.created_at || null
                }))
              } else if (segmentsResponse && Array.isArray(segmentsResponse)) {
                // Handle case where SDK returns array directly
                console.log(`[Alex] ✅ Found ${segmentsResponse.length} segments from Resend SDK (direct array)`)
                segments = segmentsResponse.map((seg: any) => ({
                  id: seg.id,
                  name: seg.name || 'Unnamed Segment',
                  size: seg.contact_count || seg.size || null,
                  createdAt: seg.created_at || null
                }))
              } else {
                // Fallback: Try direct API call if SDK method doesn't exist
                console.log('[Alex] ⚠️ SDK segments.list() not available or returned no data, trying direct API...')
                
                // Retry logic with exponential backoff for rate limit errors
                let retries = 3
                let retryDelay = 1000 // Start with 1 second
                
                while (retries > 0) {
                  try {
                    // Wait before retry (except first attempt)
                    if (retries < 3) {
                      console.log(`[Alex] ⏳ Waiting ${retryDelay}ms before retry (${4 - retries}/3)...`)
                      await new Promise((resolve) => setTimeout(resolve, retryDelay))
                      retryDelay *= 2 // Exponential backoff: 1s, 2s, 4s
                    }
                    
                    // Resend segments API: segments are global, use /segments endpoint (not per-audience)
                    // Try both endpoints: /segments (global) and /audiences/{id}/segments (if supported)
                    const endpoints = [
                      'https://api.resend.com/segments', // Global segments endpoint
                      `https://api.resend.com/audiences/${audienceId}/segments` // Per-audience (may not exist)
                    ]
                    
                    let apiData: any = null
                    let lastError: any = null
                    
                    for (const segmentsUrl of endpoints) {
                      try {
                        console.log(`[Alex] 🔍 Trying endpoint: ${segmentsUrl}`)
                        const apiResponse = await fetch(segmentsUrl, {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json',
                          },
                        })
                        
                        if (apiResponse.ok) {
                          apiData = await apiResponse.json()
                          console.log(`[Alex] ✅ Successfully fetched from ${segmentsUrl}`)
                          break // Success, exit endpoint loop
                        } else if (apiResponse.status === 404 || apiResponse.status === 405) {
                          // Endpoint doesn't exist or method not allowed, try next endpoint
                          const errorText = await apiResponse.text()
                          console.log(`[Alex] ⚠️ Endpoint ${segmentsUrl} returned ${apiResponse.status}, trying next...`)
                          lastError = { status: apiResponse.status, message: errorText }
                          continue
                        } else if (apiResponse.status === 429) {
                          // Rate limit - will retry
                          const errorText = await apiResponse.text()
                          console.warn(`[Alex] ⚠️ Rate limit hit (429) on ${segmentsUrl}, will retry`)
                          lastError = { status: 429, message: errorText }
                          break // Exit endpoint loop, will retry
                        } else {
                          // Other error
                          const errorText = await apiResponse.text()
                          console.warn(`[Alex] ⚠️ Endpoint ${segmentsUrl} returned ${apiResponse.status}:`, errorText.substring(0, 200))
                          lastError = { status: apiResponse.status, message: errorText }
                          continue
                        }
                      } catch (endpointError: any) {
                        console.warn(`[Alex] ⚠️ Error calling ${segmentsUrl}:`, endpointError.message)
                        lastError = endpointError
                        continue
                      }
                    }
                    
                    if (apiData) {
                      // Parse response
                      if (apiData.data && Array.isArray(apiData.data)) {
                        console.log(`[Alex] ✅ Found ${apiData.data.length} segments from Resend API (direct)`)
                        segments = apiData.data.map((seg: any) => ({
                          id: seg.id,
                          name: seg.name || 'Unnamed Segment',
                          size: seg.contact_count || seg.size || null,
                          createdAt: seg.created_at || null
                        }))
                        break // Success, exit retry loop
                      } else if (apiData.segments && Array.isArray(apiData.segments)) {
                        // Alternative response format
                        console.log(`[Alex] ✅ Found ${apiData.segments.length} segments from Resend API (direct, alt format)`)
                        segments = apiData.segments.map((seg: any) => ({
                          id: seg.id,
                          name: seg.name || 'Unnamed Segment',
                          size: seg.contact_count || seg.size || null,
                          createdAt: seg.created_at || null
                        }))
                        break // Success, exit retry loop
                      } else if (Array.isArray(apiData)) {
                        // Direct array response
                        console.log(`[Alex] ✅ Found ${apiData.length} segments from Resend API (direct array)`)
                        segments = apiData.map((seg: any) => ({
                          id: seg.id,
                          name: seg.name || 'Unnamed Segment',
                          size: seg.contact_count || seg.size || null,
                          createdAt: seg.created_at || null
                        }))
                        break // Success, exit retry loop
                      } else {
                        console.warn('[Alex] ⚠️ Resend API returned unexpected format:', JSON.stringify(apiData).substring(0, 200))
                        break // Unexpected format, don't retry
                      }
                    } else if (lastError?.status === 429) {
                      // Rate limit error - retry with backoff
                      console.warn(`[Alex] ⚠️ Rate limit hit (429), will retry. Attempt ${4 - retries}/3`)
                      retries--
                      if (retries === 0) {
                        console.error('[Alex] ❌ Rate limit retries exhausted, falling back to database/env')
                      }
                    } else {
                      // Other error - don't retry
                      console.warn(`[Alex] ⚠️ Resend segments API failed:`, lastError?.message || lastError || 'Unknown error')
                      break
                    }
                  } catch (apiError: any) {
                    console.warn(`[Alex] ⚠️ Direct API call failed (attempt ${4 - retries}/3):`, apiError.message || apiError)
                    retries--
                    if (retries === 0) {
                      console.warn('[Alex] ⚠️ All retries exhausted, falling back to database/env')
                    }
                  }
                }
              }
            } catch (error: any) {
              console.warn('[Alex] ⚠️ Failed to fetch segments from Resend API, falling back to database/env:', error.message)
            }
            
            // FALLBACK: If Resend API didn't return segments, use database/env as backup
            if (segments.length === 0) {
              console.warn('[Alex] ⚠️ WARNING: Resend API did not return segments. Using fallback database/env data.')
              console.log('[Alex] 📋 Using fallback: Getting segments from database and env vars...')
              usingFallbackData = true
              
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
                    name: s.segment_name || 'Unknown Segment',
                    size: null // Size not available from database
                  })
                }
              })
              
              knownSegmentIds.forEach(s => {
                if (s.id) {
                  allSegments.set(s.id, {
                    id: s.id,
                    name: s.name,
                    size: null // Size not available from env vars
                  })
                }
              })
              
              segments = Array.from(allSegments.values())
            }
            
            // For segments without size, try to get contact count from Resend
            // Note: This might require filtering contacts by segment, which Resend may not support directly
            // We'll leave size as null if we can't get it
            console.log(`[Alex] 📊 Final segments list: ${segments.length} segments`)
          }
          
          // Build summary with segment details
          let summary = `You have ${contacts.length} total contacts in your audience`
          if (segments.length > 0) {
            const segmentsWithSize = segments.filter(s => s.size !== null && s.size !== undefined)
            if (segmentsWithSize.length > 0) {
              const totalSegmentSize = segmentsWithSize.reduce((sum, s) => sum + (s.size || 0), 0)
              summary += ` across ${segments.length} segments (${totalSegmentSize} contacts in tracked segments)`
            } else {
              summary += ` across ${segments.length} segments`
            }
          }
          summary += '.'
          
          // Add warning if using fallback data
          if (usingFallbackData) {
            summary += ' ⚠️ NOTE: Segment data is from database/fallback, not live Resend API. Real-time segment sizes may not be accurate.'
          }
          
          return {
            audienceId: audience.data?.id || audienceId,
            audienceName: audience.data?.name || 'SSELFIE Audience',
            totalContacts: contacts.length,
            segments: segments,
            summary: summary,
            isLiveData: !usingFallbackData,
            warning: usingFallbackData ? 'Segment data is from database fallback, not live Resend API. Real-time segment sizes may not be accurate.' : undefined
          }
          
        } catch (error: any) {
          console.error('[Admin Agent] ❌ Error fetching Resend audience:', error)
          console.error('[Admin Agent] Error details:', {
            message: error.message,
            stack: error.stack,
            hasResendKey: !!process.env.RESEND_API_KEY,
            hasAudienceId: !!process.env.RESEND_AUDIENCE_ID,
            resendInitialized: !!resend
          })
          
          // Return error with clear indication that real data isn't available
          return {
            error: error.message || "Failed to fetch audience data from Resend API",
            fallback: "I couldn't fetch live data from Resend. Let me use database records instead.",
            isLiveData: false,
            warning: `⚠️ CRITICAL: Could not connect to Resend API. Error: ${error.message}. Please check RESEND_API_KEY and RESEND_AUDIENCE_ID environment variables.`
          }
        }
      }
    }

    const getEmailTimelineTool = {
      name: "get_email_timeline",
      description: `Get the actual timeline of when emails were sent - critical for reengagement emails.
  
  Use this when Sandra asks about:
  - "When did I last email?"
  - "How long ago was my last email?"
  - "What's the real timeline?" (for reengagement emails)
  - Creating reengagement emails that reference actual timeframes
  
  This returns REAL send dates (not creation dates) so you can say "remember me from 3 weeks ago" accurately.`,
      
      input_schema: {
        type: "object",
        properties: {
          segmentId: {
            type: "string",
            description: "Specific segment ID to check, or null for all campaigns"
          }
        },
        required: []
      },
      
      execute: async ({ segmentId }: {
        segmentId?: string
      }) => {
        try {
          // Get the most recent SENT campaigns (not just created)
          // Use sent_at if available, otherwise use created_at for sent campaigns
          let campaigns
          
          if (segmentId) {
            // Get campaigns for specific segment (only campaigns explicitly targeting this segment)
            campaigns = await sql`
              SELECT 
                id,
                campaign_name,
                subject_line,
                status,
                sent_at,
                created_at,
                scheduled_for,
                resend_broadcast_id,
                target_audience
              FROM admin_email_campaigns
              WHERE status = 'sent'
                AND target_audience->>'resend_segment_id' = ${segmentId}
              ORDER BY 
                COALESCE(sent_at, scheduled_for, created_at) DESC
              LIMIT 5
            `
          } else {
            // Get all recent sent campaigns
            campaigns = await sql`
              SELECT 
                id,
                campaign_name,
                subject_line,
                status,
                sent_at,
                created_at,
                scheduled_for,
                resend_broadcast_id,
                target_audience
              FROM admin_email_campaigns
              WHERE status = 'sent'
              ORDER BY 
                COALESCE(sent_at, scheduled_for, created_at) DESC
              LIMIT 10
            `
          }
          
          if (!campaigns || campaigns.length === 0) {
            return {
              lastEmailSent: null,
              daysSinceLastEmail: null,
              timeline: "No emails have been sent yet.",
              recentCampaigns: []
            }
          }
          
          // For each campaign, try to get actual send date from Resend if available
          const timelineData = []
          
          for (const campaign of campaigns) {
            let actualSentAt: string | null = null
            let source = 'database'
            
            // Try to get send date from Resend API if broadcast_id exists
            if (campaign.resend_broadcast_id && resend) {
              try {
                const apiResponse = await fetch(`https://api.resend.com/broadcasts/${campaign.resend_broadcast_id}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                })
                
                if (apiResponse.ok) {
                  const apiData = await apiResponse.json()
                  if (apiData.created_at || apiData.sent_at) {
                    actualSentAt = apiData.created_at || apiData.sent_at
                    source = 'resend_api'
                    console.log(`[Alex] 📅 Got send date from Resend API for campaign ${campaign.id}`)
                  }
                }
              } catch (apiError) {
                console.warn(`[Alex] ⚠️ Could not fetch Resend data for broadcast ${campaign.resend_broadcast_id}`)
              }
            }
            
            // Fallback to database sent_at, then scheduled_for, then created_at
            if (!actualSentAt) {
              if (campaign.sent_at) {
                actualSentAt = campaign.sent_at
                source = 'database_sent_at'
              } else if (campaign.scheduled_for) {
                actualSentAt = campaign.scheduled_for
                source = 'database_scheduled'
              } else {
                actualSentAt = campaign.created_at
                source = 'database_created_at'
              }
            }
            
            // Calculate days since sent
            const sentDate = actualSentAt ? new Date(actualSentAt) : new Date()
            const now = new Date()
            const daysSince = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
            
            // Human-readable time description
            let timeDescription = ''
            if (daysSince === 0) {
              timeDescription = 'today'
            } else if (daysSince === 1) {
              timeDescription = 'yesterday'
            } else if (daysSince < 7) {
              timeDescription = `${daysSince} days ago`
            } else if (daysSince < 14) {
              const weeks = Math.floor(daysSince / 7)
              timeDescription = `${weeks} week${weeks > 1 ? 's' : ''} ago`
            } else if (daysSince < 30) {
              const weeks = Math.floor(daysSince / 7)
              timeDescription = `${weeks} weeks ago`
            } else if (daysSince < 365) {
              const months = Math.floor(daysSince / 30)
              timeDescription = `${months} month${months > 1 ? 's' : ''} ago`
            } else {
              const years = Math.floor(daysSince / 365)
              timeDescription = `${years} year${years > 1 ? 's' : ''} ago`
            }
            
            timelineData.push({
              id: campaign.id,
              name: campaign.campaign_name,
              subject: campaign.subject_line,
              sentAt: actualSentAt,
              daysSince: daysSince,
              timeDescription: timeDescription,
              source: source
            })
          }
          
          // Get the most recent email
          const lastEmail = timelineData[0]
          
          // Build timeline summary
          let timeline = ''
          if (lastEmail) {
            timeline = `Your last email "${lastEmail.name}" was sent ${lastEmail.timeDescription} (${lastEmail.daysSince} days ago).`
            
            if (lastEmail.daysSince > 14) {
              timeline += ` It's been ${lastEmail.daysSince} days since your last email - perfect time for a reengagement campaign!`
            } else if (lastEmail.daysSince > 7) {
              timeline += ` It's been over a week - consider sending a follow-up.`
            } else {
              timeline += ` You've been staying in touch regularly!`
            }
          }
          
          return {
            lastEmailSent: lastEmail ? {
              name: lastEmail.name,
              subject: lastEmail.subject,
              sentAt: lastEmail.sentAt,
              daysSince: lastEmail.daysSince,
              timeDescription: lastEmail.timeDescription
            } : null,
            daysSinceLastEmail: lastEmail?.daysSince || null,
            timeline: timeline,
            recentCampaigns: timelineData.slice(0, 5).map(c => ({
              name: c.name,
              subject: c.subject,
              sentAt: c.sentAt,
              daysSince: c.daysSince,
              timeDescription: c.timeDescription
            }))
          }
        } catch (error: any) {
          console.error('[Alex] Error in get_email_timeline tool:', error)
          return {
            error: error.message || "Failed to fetch email timeline",
            lastEmailSent: null,
            daysSinceLastEmail: null,
            timeline: "I couldn't fetch the email timeline right now."
          }
        }
      }
    }

    const readCodebaseFileTool = {
      name: "read_codebase_file",
      description: `Read and analyze files from the SSELFIE codebase to understand the app structure, content, and features.
  
  Use this to:
  - Understand what freebies, guides, and resources exist
  - Read content templates and documentation
  - Analyze code structure and features
  - Help Sandra manage and improve the codebase
  - Reference actual content when creating emails or campaigns
  
  IMPORTANT: 
  - If a file is not found, the tool will suggest similar files
  - If you provide a directory path, it will list ALL available files in that directory
  - When you see a directory listing, use the EXACT full paths shown to read specific files
  - For dynamic routes like [slug], use the actual file path with brackets: app/prompt-guides/[slug]/page.tsx
  - Example: If directory shows "[slug]/", read app/prompt-guides/[slug]/page.tsx
  
  This tool allows you to read files from:
  - content-templates/ (Instagram templates, guides)
  - docs/ (documentation, guides)
  - app/ (pages and routes)
  - lib/ (utilities and helpers)
  - scripts/ (database schemas, migrations)
  
  Always use this when Sandra asks about:
  - What freebies exist
  - What's in the brand blueprint
  - What prompts are in the guide
  - How features work
  - What content exists`,
      
      input_schema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Relative path to the file from project root (e.g., content-templates/instagram/README.md, docs/PROMPT-GUIDE-BUILDER.md, app/blueprint/page.tsx)"
          },
          maxLines: {
            type: "number",
            description: "Maximum number of lines to read (default 500, use for large files)"
          }
        },
        required: ["filePath"]
      },
      
      execute: async ({ filePath, maxLines = 500 }: {
        filePath: string
        maxLines?: number
      }) => {
        try {
          // Validate filePath is provided
          if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
            console.error(`[Alex] ❌ read_codebase_file called with invalid filePath:`, filePath)
            return {
              success: false,
              error: "filePath is required and must be a non-empty string",
              filePath: filePath || 'undefined'
            }
          }
          
          console.log(`[Alex] 📖 Attempting to read file: ${filePath}`)
          const fs = require('fs')
          const path = require('path')
          
          // Security: Only allow reading from specific safe directories
          const allowedDirs = [
            'content-templates',
            'docs',
            'app',
            'lib',
            'scripts',
            'components'
          ]
          
          // Normalize path and check if it's in allowed directory
          const normalizedPath = path.normalize(filePath)
          
          // Check if it's a directory path (no file extension and matches allowed dir)
          const isDirectoryPath = allowedDirs.some(dir => normalizedPath === dir || normalizedPath === dir + '/' || normalizedPath === dir + '\\')
          
          // If it's a directory path, handle it specially (will be caught later, but we allow it here)
          const isAllowed = allowedDirs.some(dir => normalizedPath.startsWith(dir + '/') || normalizedPath.startsWith(dir + '\\')) || isDirectoryPath
          
          if (!isAllowed && !normalizedPath.startsWith('README.md') && !normalizedPath.startsWith('package.json')) {
            console.log(`[Alex] ⚠️ File path not allowed: ${filePath}`)
            return {
              success: false,
              error: `File path must be in one of these directories: ${allowedDirs.join(', ')}`,
              filePath: filePath,
              suggestion: `If you want to list files in a directory, use a path like: ${allowedDirs[0]}/filename.ext`
            }
          }
          
          // Prevent directory traversal
          if (normalizedPath.includes('..')) {
            console.log(`[Alex] ⚠️ Directory traversal attempt blocked: ${filePath}`)
            return {
              success: false,
              error: "Directory traversal not allowed",
              filePath: filePath
            }
          }
          
          const fullPath = path.join(process.cwd(), normalizedPath)
          
          // Check if it's a directory first (before checking if file exists)
          // This allows directory paths to be handled properly
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath)
            if (stats.isDirectory()) {
              // This will be handled in the directory check below
            }
          }
          
          // Check if file exists
          if (!fs.existsSync(fullPath)) {
            console.log(`[Alex] ⚠️ File not found: ${filePath}`)
            
            // Try to find similar files or list directory contents
            let suggestions: string[] = []
            try {
              const dirPath = path.dirname(fullPath)
              const fileName = path.basename(filePath)
              const fileNameWithoutExt = path.basename(filePath, path.extname(filePath))
              
              // Extract keywords from the file path for better matching
              const keywords = fileNameWithoutExt.toLowerCase().split(/[-_\s]+/).filter((k: string) => k.length > 2)
              
              // Check if directory exists
              if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                const files = fs.readdirSync(dirPath)
                // Find files with similar names or matching keywords
                const similarFiles = files.filter((f: string) => {
                  const fLower = f.toLowerCase()
                  const fNoExt = fLower.replace(path.extname(f), '')
                  const nameLower = fileName.toLowerCase()
                  const nameNoExtLower = fileNameWithoutExt.toLowerCase()
                  
                  // Exact substring match
                  if (fLower.includes(nameNoExtLower) || nameNoExtLower.includes(fNoExt)) {
                    return true
                  }
                  
                  // Keyword matching - check if file contains any of the keywords
                  if (keywords.length > 0) {
                    const matchesKeywords = keywords.some((keyword: string) => fLower.includes(keyword))
                    if (matchesKeywords) return true
                  }
                  
                  // Special case: if searching for "prompt" or "guide", find files with those keywords
                  if ((nameLower.includes('prompt') || nameLower.includes('guide')) && 
                      (fLower.includes('prompt') || fLower.includes('guide'))) {
                    return true
                  }
                  
                  return false
                })
                suggestions = similarFiles.slice(0, 8).map((f: string) => {
                  const fullFPath = path.join(dirPath, f)
                  const isDir = fs.statSync(fullFPath).isDirectory()
                  const relPath = path.join(path.dirname(filePath), f)
                  return isDir ? `${relPath}/` : relPath
                })
              } else {
                // Directory doesn't exist, try parent directory and search more broadly
                const parentDir = path.dirname(dirPath)
                if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
                  const files = fs.readdirSync(parentDir)
                  const similarFiles = files.filter((f: string) => {
                    const fLower = f.toLowerCase()
                    const fNoExt = fLower.replace(path.extname(f), '')
                    
                    // Match keywords
                    if (keywords.length > 0) {
                      const matchesKeywords = keywords.some((keyword: string) => fLower.includes(keyword))
                      if (matchesKeywords) return true
                    }
                    
                    // Special keyword matching
                    if ((fileNameWithoutExt.toLowerCase().includes('prompt') || fileNameWithoutExt.toLowerCase().includes('guide')) && 
                        (fLower.includes('prompt') || fLower.includes('guide'))) {
                      return true
                    }
                    
                    return false
                  })
                  suggestions = similarFiles.slice(0, 8).map((f: string) => {
                    const fullFPath = path.join(parentDir, f)
                    const isDir = fs.statSync(fullFPath).isDirectory()
                    const relPath = path.join(path.dirname(filePath), f)
                    return isDir ? `${relPath}/` : relPath
                  })
                }
              }
              
              // Also search in common directories for prompt/guide related files
              if (keywords.some((k: string) => k.includes('prompt') || k.includes('guide'))) {
                const searchDirs = ['docs', 'app', 'lib']
                for (const searchDir of searchDirs) {
                  const searchPath = path.join(process.cwd(), searchDir)
                  if (fs.existsSync(searchPath) && fs.statSync(searchPath).isDirectory()) {
                    try {
                      const files = fs.readdirSync(searchPath)
                      const matchingFiles = files.filter((f: string) => {
                        const fLower = f.toLowerCase()
                        return fLower.includes('prompt') || fLower.includes('guide')
                      })
                      matchingFiles.slice(0, 3).forEach((f: string) => {
                        const relPath = `${searchDir}/${f}`
                        if (!suggestions.includes(relPath) && suggestions.length < 8) {
                          suggestions.push(relPath)
                        }
                      })
                    } catch (e) {
                      // Ignore errors
                    }
                  }
                }
              }
              
              console.log(`[Alex] 💡 Found ${suggestions.length} similar files for: ${filePath}`)
            } catch (suggestionError: any) {
              console.warn(`[Alex] ⚠️ Error generating suggestions:`, suggestionError.message)
            }
            
            let suggestionText = "Check the file path and ensure it exists in the project"
            if (suggestions.length > 0) {
              suggestionText = `File not found: ${filePath}\n\nDid you mean one of these?\n${suggestions.map(s => `- ${s}`).join('\n')}\n\nOr use the read_codebase_file tool with a directory path to list available files.\n\nNote: If you're looking for a dynamic route file (like [slug]/page.tsx), use the actual file path with brackets, not the URL slug.`
            } else {
              // Even if no suggestions, provide helpful guidance
              suggestionText = `File not found: ${filePath}\n\nTips:\n- Check if the file path is correct\n- Use a directory path (e.g., app/prompt-guides/) to list available files\n- For dynamic routes, use the actual file path with brackets (e.g., app/prompt-guides/[slug]/page.tsx)`
            }
            
            return {
              success: false,
              error: `File not found: ${filePath}`,
              filePath: filePath,
              suggestion: suggestionText,
              similarFiles: suggestions.length > 0 ? suggestions : undefined
            }
          }
          
          // Check if it's a file (not directory)
          const stats = fs.statSync(fullPath)
          if (!stats.isFile()) {
            console.log(`[Alex] ⚠️ Path is a directory: ${filePath}`)
            
            // List directory contents to help Alex discover files
            let directoryContents: string[] = []
            try {
              const files = fs.readdirSync(fullPath)
              directoryContents = files.slice(0, 30).map((f: string) => {
                const filePath = path.join(fullPath, f)
                const isDir = fs.statSync(filePath).isDirectory()
                return isDir ? `${f}/` : f
              })
              console.log(`[Alex] 📁 Directory ${filePath} contains ${files.length} items, showing first ${directoryContents.length}`)
            } catch (listError: any) {
              console.warn(`[Alex] ⚠️ Error listing directory ${filePath}:`, listError.message)
            }
            
            // Build comprehensive directory listing with full paths
            let suggestionText = "Provide the full path to a specific file"
            let directoryInfo = ""
            
            if (directoryContents.length > 0) {
              // Create full paths for each item
              const fullPaths = directoryContents.map((f: string) => {
                const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath
                return f.endsWith('/') ? `${cleanPath}/${f.slice(0, -1)}/` : `${cleanPath}/${f}`
              })
              
              directoryInfo = `\n\n📁 DIRECTORY CONTENTS (${directoryContents.length} items):\n${directoryContents.map((f: string, idx: number) => `  ${idx + 1}. ${f} → Full path: ${fullPaths[idx]}`).join('\n')}`
              
              // For directories, show what files are inside
              const directories = directoryContents.filter(f => f.endsWith('/'))
              if (directories.length > 0) {
                directoryInfo += `\n\n📂 SUBDIRECTORIES FOUND:\n${directories.map((d: string) => {
                  const dirName = d.slice(0, -1)
                  const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath
                  return `  - ${dirName}/ → Explore: ${cleanPath}/${dirName}/`
                }).join('\n')}`
              }
              
              suggestionText = `This is a directory, not a file.${directoryInfo}\n\n✅ NEXT STEPS:\n1. To explore a subdirectory, use: ${filePath}[subdirectory-name]/\n2. To read a file, use the full path shown above\n3. For dynamic routes like [slug], use the exact path with brackets: ${filePath}[slug]/page.tsx\n\nExample: If you see "[slug]/" above, read: ${filePath}[slug]/page.tsx`
            }
            
            const result = {
              success: false,
              error: `Path is a directory, not a file: ${filePath}`,
              filePath: filePath,
              suggestion: suggestionText,
              directoryContents: directoryContents.length > 0 ? directoryContents : undefined,
              // Include full paths for each item
              availableFiles: directoryContents.length > 0 ? directoryContents.map((f: string) => {
                const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath
                return f.endsWith('/') ? `${cleanPath}/${f.slice(0, -1)}/` : `${cleanPath}/${f}`
              }) : undefined
            }
            
            console.log(`[Alex] 📁 Directory listing for ${filePath}:`, directoryContents)
            if (directoryContents.length > 0) {
              console.log(`[Alex] 📁 Full paths available:`, result.availableFiles)
            }
            
            return result
          }
          
          // Read file
          const content = fs.readFileSync(fullPath, 'utf8')
          const lines = content.split('\n')
          const totalLines = lines.length
          
          // Truncate if needed
          let fileContent = content
          let truncated = false
          if (lines.length > maxLines) {
            fileContent = lines.slice(0, maxLines).join('\n')
            truncated = true
          }
          
          // Get file extension for context
          const ext = path.extname(fullPath).toLowerCase()
          const fileType = ext === '.md' ? 'markdown' : 
                          ext === '.tsx' || ext === '.ts' ? 'typescript' :
                          ext === '.jsx' || ext === '.js' ? 'javascript' :
                          ext === '.sql' ? 'sql' :
                          ext === '.json' ? 'json' : 'text'
          
          console.log(`[Alex] 📖 Read file: ${filePath} (${totalLines} lines${truncated ? `, showing first ${maxLines}` : ''})`)
          
          return {
            success: true,
            filePath: filePath,
            fileType: fileType,
            totalLines: totalLines,
            linesRead: truncated ? maxLines : totalLines,
            truncated: truncated,
            content: fileContent,
            note: truncated ? `File truncated to first ${maxLines} lines. Use maxLines parameter to read more.` : undefined
          }
        } catch (error: any) {
          console.error(`[Alex] ❌ Error reading file ${filePath}:`, error.message)
          return {
            success: false,
            error: error.message || "Failed to read file",
            filePath: filePath
          }
        }
      }
    }

    const getPromptGuidesTool = {
      name: "get_prompt_guides",
      description: `Get all prompt guides with their settings, prompts, and metadata.

Returns comprehensive guide data including:
- Guide metadata (ID, title, description, category, status)
- All prompts within each guide
- Page settings (welcome message, email capture, CTAs)
- Public page info (slug, status, links)

Use this when Sandra asks:
- "What prompt guides do we have?"
- "Show me the [category] guides"
- "What's in the [guide name]?"
- "List all guides"

Always call this FIRST before using update_prompt_guide to get the guide ID.`,
      
      input_schema: {
        type: "object",
        properties: {
          guideId: {
            type: "number",
            description: "Specific guide ID to get details for"
          },
          searchTerm: {
            type: "string",
            description: "Search for guides by title or category (e.g., 'Christmas', 'holiday', 'luxury')"
          },
          includePrompts: {
            type: "boolean",
            description: "Whether to include all prompts from the guide(s) (defaults to false)"
          },
          status: {
            type: "string",
            enum: ["draft", "published", "all"],
            description: "Filter by guide status (defaults to 'all')"
          }
        },
        required: []
      },
      
      execute: async ({ guideId, searchTerm, includePrompts = false, status = 'all' }: {
        guideId?: number
        searchTerm?: string
        includePrompts?: boolean
        status?: 'draft' | 'published' | 'all'
      } = {}) => {
        try {
          console.log(`[Alex] 📚 Getting prompt guides:`, { guideId, searchTerm, includePrompts, status })
          
          if (guideId) {
            // Get specific guide with all details
            const [guide] = await sql`
              SELECT 
                pg.id,
                pg.title,
                pg.description,
                pg.category,
                pg.status,
                pg.total_prompts,
                pg.total_approved,
                pg.created_at,
                pg.published_at,
                pp.slug AS page_slug,
                pp.welcome_message,
                pp.email_capture_type,
                pp.email_list_tag,
                pp.view_count,
                pp.email_capture_count
              FROM prompt_guides pg
              LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
              WHERE pg.id = ${guideId}
            `
            
            if (!guide) {
              return {
                success: false,
                error: `Guide with ID ${guideId} not found`
              }
            }
            
            let prompts: any[] = []
            if (includePrompts) {
              prompts = await sql`
                SELECT 
                  id,
                  prompt_text,
                  concept_title,
                  concept_description,
                  category,
                  image_url,
                  status,
                  sort_order
                FROM prompt_guide_items
                WHERE guide_id = ${guideId}
                ORDER BY sort_order ASC, created_at ASC
              `
            }
            
            return {
              success: true,
              guide: {
                id: guide.id,
                title: guide.title,
                description: guide.description,
                category: guide.category,
                status: guide.status,
                totalPrompts: guide.total_prompts,
                totalApproved: guide.total_approved,
                createdAt: guide.created_at,
                publishedAt: guide.published_at,
                pageSlug: guide.page_slug,
                welcomeMessage: guide.welcome_message,
                emailCaptureType: guide.email_capture_type,
                emailListTag: guide.email_list_tag,
                viewCount: guide.view_count,
                emailCaptureCount: guide.email_capture_count,
                publicUrl: guide.page_slug ? `https://sselfie.ai/prompt-guides/${guide.page_slug}` : null
              },
              prompts: includePrompts ? prompts.map(p => ({
                id: p.id,
                promptText: p.prompt_text,
                conceptTitle: p.concept_title,
                conceptDescription: p.concept_description,
                category: p.category,
                imageUrl: p.image_url,
                status: p.status,
                sortOrder: p.sort_order
              })) : undefined
            }
          } else {
            // List guides with optional search
            let guides: any[]
            
            const searchPattern = searchTerm ? `%${searchTerm}%` : null
            
            if (searchPattern && status !== 'all') {
              guides = await sql`
                SELECT 
                  pg.id,
                  pg.title,
                  pg.description,
                  pg.category,
                  pg.status,
                  pg.total_prompts,
                  pg.total_approved,
                  pg.created_at,
                  pg.published_at,
                  pp.slug AS page_slug
                FROM prompt_guides pg
                LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
                WHERE pg.status = ${status}
                  AND (pg.title ILIKE ${searchPattern} 
                    OR pg.category ILIKE ${searchPattern} 
                    OR pg.description ILIKE ${searchPattern})
                ORDER BY pg.created_at DESC
              `
            } else if (searchPattern) {
              guides = await sql`
                SELECT 
                  pg.id,
                  pg.title,
                  pg.description,
                  pg.category,
                  pg.status,
                  pg.total_prompts,
                  pg.total_approved,
                  pg.created_at,
                  pg.published_at,
                  pp.slug AS page_slug
                FROM prompt_guides pg
                LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
                WHERE pg.title ILIKE ${searchPattern} 
                  OR pg.category ILIKE ${searchPattern} 
                  OR pg.description ILIKE ${searchPattern}
                ORDER BY pg.created_at DESC
              `
            } else if (status !== 'all') {
              guides = await sql`
                SELECT 
                  pg.id,
                  pg.title,
                  pg.description,
                  pg.category,
                  pg.status,
                  pg.total_prompts,
                  pg.total_approved,
                  pg.created_at,
                  pg.published_at,
                  pp.slug AS page_slug
                FROM prompt_guides pg
                LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
                WHERE pg.status = ${status}
                ORDER BY pg.created_at DESC
              `
            } else {
              guides = await sql`
                SELECT 
                  pg.id,
                  pg.title,
                  pg.description,
                  pg.category,
                  pg.status,
                  pg.total_prompts,
                  pg.total_approved,
                  pg.created_at,
                  pg.published_at,
                  pp.slug AS page_slug
                FROM prompt_guides pg
                LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
                ORDER BY pg.created_at DESC
              `
            }
            
            // If includePrompts is true, get prompts for all guides
            let allPrompts: Record<number, any[]> = {}
            if (includePrompts && guides.length > 0) {
              const guideIds = guides.map((g: any) => g.id)
              const prompts = await sql`
                SELECT 
                  guide_id,
                  id,
                  prompt_text,
                  concept_title,
                  concept_description,
                  category,
                  image_url,
                  status,
                  sort_order
                FROM prompt_guide_items
                WHERE guide_id = ANY(${guideIds})
                ORDER BY guide_id, sort_order ASC, created_at ASC
              `
              
              for (const prompt of prompts) {
                if (!allPrompts[prompt.guide_id]) {
                  allPrompts[prompt.guide_id] = []
                }
                allPrompts[prompt.guide_id].push({
                  id: prompt.id,
                  promptText: prompt.prompt_text,
                  conceptTitle: prompt.concept_title,
                  conceptDescription: prompt.concept_description,
                  category: prompt.category,
                  imageUrl: prompt.image_url,
                  status: prompt.status,
                  sortOrder: prompt.sort_order
                })
              }
            }
            
            return {
              success: true,
              guides: guides.map((g: any) => ({
                id: g.id,
                title: g.title,
                description: g.description,
                category: g.category,
                status: g.status,
                totalPrompts: g.total_prompts,
                totalApproved: g.total_approved,
                createdAt: g.created_at,
                publishedAt: g.published_at,
                pageSlug: g.page_slug,
                publicUrl: g.page_slug ? `https://sselfie.ai/prompt-guides/${g.page_slug}` : null,
                prompts: includePrompts ? (allPrompts[g.id] || []) : undefined
              })),
              count: guides.length
            }
          }
        } catch (error: any) {
          console.error("[Alex] Error getting prompt guides:", error)
          return {
            success: false,
            error: error.message || "Failed to get prompt guides",
            suggestion: "Check database connection and ensure prompt_guides table exists"
          }
        }
      }
    }

    const updatePromptGuideTool = {
      name: "update_prompt_guide",
      description: `Update prompt guide settings including UI, style, CTA, links, and content.
  
  Use this to edit:
  - Guide metadata: title, description, category
  - Page settings: welcome message, email capture type, upsell links/text
  - Public page: slug, status (draft/published)
  
This allows Alex to optimize guide pages for conversions, update CTAs, and improve the user experience.

IMPORTANT: Always use get_prompt_guides first to get the guide ID.`,
      
      input_schema: {
        type: "object",
        properties: {
          guideId: {
            type: "number",
            description: "ID of the guide to update (get from get_prompt_guides tool first)"
          },
          guideUpdates: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Update guide title"
              },
              description: {
                type: "string",
                description: "Update guide description"
              },
              category: {
                type: "string",
                description: "Update guide category"
              },
              status: {
                type: "string",
                enum: ["draft", "published"],
                description: "Update guide status"
              }
            },
            description: "Updates to the guide itself"
          },
          pageUpdates: {
            type: "object",
            properties: {
              slug: {
                type: "string",
                description: "Update URL slug (must be unique)"
              },
              title: {
                type: "string",
                description: "Update page title"
              },
              welcomeMessage: {
                type: "string",
                description: "Update welcome/intro message shown to users"
              },
              emailCaptureType: {
                type: "string",
                enum: ["modal", "inline", "top"],
                description: "How email capture is displayed"
              },
              emailListTag: {
                type: "string",
                description: "Resend tag for this guide's email list"
              },
              upsellLink: {
                type: "string",
                description: "CTA link (e.g., checkout URL or landing page)"
              },
              upsellText: {
                type: "string",
                description: "CTA button/text copy"
              },
              status: {
                type: "string",
                enum: ["draft", "published"],
                description: "Update page status"
              }
            },
            description: "Updates to the public page settings"
          }
        },
        required: ["guideId"]
      },
      
      execute: async ({ guideId, guideUpdates, pageUpdates }: {
        guideId: number
        guideUpdates?: {
          title?: string
          description?: string
          category?: string
          status?: 'draft' | 'published'
        }
        pageUpdates?: {
          slug?: string
          title?: string
          welcomeMessage?: string
          emailCaptureType?: 'modal' | 'inline' | 'top'
          emailListTag?: string
          upsellLink?: string
          upsellText?: string
          status?: 'draft' | 'published'
        }
      }) => {
        try {
          console.log(`[Alex] 📝 Updating prompt guide ${guideId}`)
          console.log(`[Alex] 📝 Guide updates:`, JSON.stringify(guideUpdates, null, 2))
          console.log(`[Alex] 📝 Page updates:`, JSON.stringify(pageUpdates, null, 2))
          
          // Verify guide exists
          const [guide] = await sql`
            SELECT id FROM prompt_guides WHERE id = ${guideId}
          `
          
          if (!guide) {
            return {
              success: false,
              error: `Guide with ID ${guideId} not found`
            }
          }
          
          // Update guide fields using safe parameterized queries
          if (guideUpdates) {
            const hasUpdates = guideUpdates.title !== undefined || guideUpdates.description !== undefined || 
                              guideUpdates.category !== undefined || guideUpdates.status !== undefined
            
            if (hasUpdates) {
              // Use COALESCE pattern with template literal syntax for safe parameterization
              // Column names are hardcoded (whitelisted), all values are properly parameterized by Neon
              // This is safe because: 1) column names never come from user input, 2) all values use ${} parameterization
              await sql`
                UPDATE prompt_guides
                SET 
                  title = COALESCE(${guideUpdates.title ?? null}, title),
                  description = COALESCE(${guideUpdates.description ?? null}, description),
                  category = COALESCE(${guideUpdates.category ?? null}, category),
                  status = COALESCE(${guideUpdates.status ?? null}, status),
                  published_at = CASE 
                    WHEN ${guideUpdates.status === 'published'} THEN NOW()
                    WHEN ${guideUpdates.status === 'draft'} THEN NULL
                    ELSE published_at
                  END,
                  updated_at = NOW()
                WHERE id = ${guideId}
              `
              console.log(`[Alex] ✅ Updated guide ${guideId}`)
            }
          }
          
          // Update page fields
          if (pageUpdates) {
            // Check if page exists
            const [existingPage] = await sql`
              SELECT id FROM prompt_pages WHERE guide_id = ${guideId}
            `
            
            const pageUpdateFields: any = {}
            
            if (pageUpdates.slug !== undefined) {
              // Check if slug is already taken by another page
              const [slugCheck] = await sql`
                SELECT id FROM prompt_pages WHERE slug = ${pageUpdates.slug} AND guide_id != ${guideId}
              `
              if (slugCheck) {
                return {
                  success: false,
                  error: `Slug "${pageUpdates.slug}" is already taken by another guide`
                }
              }
              pageUpdateFields.slug = pageUpdates.slug
            }
            if (pageUpdates.title !== undefined) {
              pageUpdateFields.title = pageUpdates.title
            }
            if (pageUpdates.welcomeMessage !== undefined) {
              pageUpdateFields.welcome_message = pageUpdates.welcomeMessage
            }
            if (pageUpdates.emailCaptureType !== undefined) {
              pageUpdateFields.email_capture_type = pageUpdates.emailCaptureType
            }
            if (pageUpdates.emailListTag !== undefined) {
              pageUpdateFields.email_list_tag = pageUpdates.emailListTag
            }
            if (pageUpdates.upsellLink !== undefined) {
              pageUpdateFields.upsell_link = pageUpdates.upsellLink
            }
            if (pageUpdates.upsellText !== undefined) {
              pageUpdateFields.upsell_text = pageUpdates.upsellText
            }
            if (pageUpdates.status !== undefined) {
              pageUpdateFields.status = pageUpdates.status
              if (pageUpdates.status === 'published') {
                pageUpdateFields.published_at = new Date()
              }
            }
            
            if (Object.keys(pageUpdateFields).length > 0) {
              if (existingPage) {
                // Update existing page - build a single UPDATE with only provided fields
                // This pattern is safe: column names are hardcoded, values are parameterized
                console.log(`[Alex] 🔧 Page update fields received:`, JSON.stringify(pageUpdateFields, null, 2))
                
                // Execute individual UPDATE statements for each provided field
                // This is safe: column names are hardcoded, values are parameterized via template literals
                // Each UPDATE only runs if the field is explicitly provided (not undefined)
                if (pageUpdateFields.slug !== undefined) {
                  await sql`UPDATE prompt_pages SET slug = ${pageUpdateFields.slug}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated slug: ${pageUpdateFields.slug}`)
                }
                if (pageUpdateFields.title !== undefined) {
                  await sql`UPDATE prompt_pages SET title = ${pageUpdateFields.title}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated title: ${pageUpdateFields.title}`)
                }
                if (pageUpdateFields.welcome_message !== undefined) {
                  await sql`UPDATE prompt_pages SET welcome_message = ${pageUpdateFields.welcome_message}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated welcome_message`)
                }
                if (pageUpdateFields.email_capture_type !== undefined) {
                  await sql`UPDATE prompt_pages SET email_capture_type = ${pageUpdateFields.email_capture_type}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated email_capture_type: ${pageUpdateFields.email_capture_type}`)
                }
                if (pageUpdateFields.email_list_tag !== undefined) {
                  await sql`UPDATE prompt_pages SET email_list_tag = ${pageUpdateFields.email_list_tag}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated email_list_tag: ${pageUpdateFields.email_list_tag}`)
                }
                if (pageUpdateFields.upsell_link !== undefined) {
                  await sql`UPDATE prompt_pages SET upsell_link = ${pageUpdateFields.upsell_link}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated upsell_link: ${pageUpdateFields.upsell_link}`)
                }
                if (pageUpdateFields.upsell_text !== undefined) {
                  await sql`UPDATE prompt_pages SET upsell_text = ${pageUpdateFields.upsell_text}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  console.log(`[Alex] 🔧 Updated upsell_text: ${pageUpdateFields.upsell_text.substring(0, 50)}...`)
                }
                if (pageUpdateFields.status !== undefined) {
                  if (pageUpdateFields.status === 'published') {
                    await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, published_at = NOW(), updated_at = NOW() WHERE guide_id = ${guideId}`
                  } else if (pageUpdateFields.status === 'draft') {
                    await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, published_at = NULL, updated_at = NOW() WHERE guide_id = ${guideId}`
                  } else {
                    await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, updated_at = NOW() WHERE guide_id = ${guideId}`
                  }
                  console.log(`[Alex] 🔧 Updated status: ${pageUpdateFields.status}`)
                }
                
                console.log(`[Alex] ✅ Updated page for guide ${guideId}`)
                console.log(`[Alex] 🔧 Updated fields:`, Object.keys(pageUpdateFields).join(', '))
              } else {
                // Create new page if it doesn't exist
                // Need guide title for page title
                const [guideData] = await sql`
                  SELECT title FROM prompt_guides WHERE id = ${guideId}
                `
                
                await sql`
                  INSERT INTO prompt_pages (
                    guide_id,
                    slug,
                    title,
                    welcome_message,
                    email_capture_type,
                    email_list_tag,
                    upsell_link,
                    upsell_text,
                    status
                  ) VALUES (
                    ${guideId},
                    ${pageUpdateFields.slug || `guide-${guideId}`},
                    ${pageUpdateFields.title || guideData?.title || 'Untitled Guide'},
                    ${pageUpdateFields.welcome_message || null},
                    ${pageUpdateFields.email_capture_type || 'modal'},
                    ${pageUpdateFields.email_list_tag || null},
                    ${pageUpdateFields.upsell_link || null},
                    ${pageUpdateFields.upsell_text || null},
                    ${pageUpdateFields.status || 'draft'}
                  )
                `
                console.log(`[Alex] ✅ Created new page for guide ${guideId}`)
              }
            }
          }
          
          // Get updated guide and page data (with a small delay to ensure DB consistency)
          // Wait a moment to ensure the UPDATE has fully committed
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const [updatedGuide] = await sql`
            SELECT 
              pg.id,
              pg.title,
              pg.description,
              pg.category,
              pg.status,
              pg.total_prompts,
              pg.total_approved,
              pg.created_at,
              pg.published_at,
              pp.slug AS page_slug,
              pp.welcome_message,
              pp.email_capture_type,
              pp.email_list_tag,
              pp.upsell_link,
              pp.upsell_text,
              pp.status AS page_status,
              pp.view_count,
              pp.email_capture_count
            FROM prompt_guides pg
            LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
            WHERE pg.id = ${guideId}
          `
          
          console.log(`[Alex] 📊 Retrieved updated guide data:`, {
            id: updatedGuide?.id,
            emailListTag: updatedGuide?.email_list_tag,
            upsellLink: updatedGuide?.upsell_link,
            upsellText: updatedGuide?.upsell_text
          })
          
          return {
            success: true,
            message: "Prompt guide updated successfully",
            guide: {
              id: updatedGuide.id,
              title: updatedGuide.title,
              description: updatedGuide.description,
              category: updatedGuide.category,
              status: updatedGuide.status,
              totalPrompts: updatedGuide.total_prompts,
              totalApproved: updatedGuide.total_approved,
              createdAt: updatedGuide.created_at,
              publishedAt: updatedGuide.published_at,
              page: updatedGuide.page_slug ? {
                slug: updatedGuide.page_slug,
                welcomeMessage: updatedGuide.welcome_message,
                emailCaptureType: updatedGuide.email_capture_type,
                emailListTag: updatedGuide.email_list_tag,
                upsellLink: updatedGuide.upsell_link,
                upsellText: updatedGuide.upsell_text,
                status: updatedGuide.page_status,
                viewCount: updatedGuide.view_count,
                emailCaptureCount: updatedGuide.email_capture_count,
                publicUrl: `https://sselfie.ai/prompt-guides/${updatedGuide.page_slug}`
              } : null
            }
          }
        } catch (error: any) {
          console.error("[Alex] Error updating prompt guide:", error)
          return {
            success: false,
            error: error.message || "Failed to update prompt guide",
            suggestion: "Check that the guide exists and all required fields are provided"
          }
        }
      }
    }

    const analyzeEmailStrategyTool = {
      name: "analyze_email_strategy",
      description: `Analyze Sandra's audience and create intelligent email campaign strategies.
  
  Use this after getting audience data to recommend:
  - Which segments to target
  - What type of campaigns to send
  - Optimal timing
  - Campaign priorities
  
  Be proactive and strategic - Sandra wants AI to help her scale.`,
      
      input_schema: {
        type: "object",
        properties: {
          totalContacts: {
            type: "number",
            description: "Total number of contacts in the audience"
          },
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                size: { type: "number" }
              },
              required: []
            },
            description: "Array of audience segments"
          },
          lastCampaignDays: {
            type: "number",
            description: "Days since last campaign (fetch from database)"
          }
        },
        required: ["totalContacts", "segments"]
      },
      
      execute: async ({ totalContacts, segments, lastCampaignDays }: {
        totalContacts: number
        segments: Array<{ id?: string; name?: string; size?: number }>
        lastCampaignDays?: number
      }) => {
        // Reconstruct audienceData from flattened parameters
        const audienceData = {
          totalContacts,
          segments
        }
        
        try {
          // Get recent campaign history with actual send dates
          const recentCampaigns = await sql`
            SELECT 
              campaign_type,
              target_audience,
              created_at,
              sent_at,
              scheduled_for,
              status
            FROM admin_email_campaigns
            WHERE status IN ('sent', 'scheduled')
            ORDER BY COALESCE(sent_at, scheduled_for, created_at) DESC
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
          
          // Calculate days since last email using ACTUAL send date (sent_at, not created_at)
          let daysSinceLastEmail = 999
          if (lastCampaignDays !== undefined && lastCampaignDays !== null) {
            daysSinceLastEmail = lastCampaignDays
          } else if (parsedCampaigns.length > 0) {
            // Use sent_at if available, otherwise scheduled_for, fallback to created_at
            const lastCampaign = parsedCampaigns[0]
            const lastEmailDate = lastCampaign.sent_at || lastCampaign.scheduled_for || lastCampaign.created_at
            if (lastEmailDate) {
              daysSinceLastEmail = Math.floor((Date.now() - new Date(lastEmailDate as string).getTime()) / (1000 * 60 * 60 * 24))
            }
          }
          
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
              // Use actual send date (sent_at) if available, otherwise created_at
              const campaignDate = c.sent_at || c.scheduled_for || c.created_at
              return ta && ta.resend_segment_id === segment.id &&
                new Date(campaignDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
          
          // LEARNING: Analyze what works best from historical performance
          let performanceInsights: any = null
          try {
            // Get best performing campaigns (high open/click rates)
            const bestPerformingCampaigns = await sql`
              SELECT 
                campaign_name,
                subject_line,
                campaign_type,
                total_recipients,
                total_opened,
                total_clicked,
                metrics,
                sent_at
              FROM admin_email_campaigns
              WHERE status = 'sent'
                AND total_recipients > 0
                AND sent_at > NOW() - INTERVAL '90 days'
              ORDER BY 
                CASE 
                  WHEN total_recipients > 0 THEN (total_opened::numeric / total_recipients::numeric) * 100
                  ELSE 0
                END DESC,
                CASE 
                  WHEN total_opened > 0 THEN (total_clicked::numeric / total_opened::numeric) * 100
                  ELSE 0
                END DESC
              LIMIT 5
            `
            
            // Get Sandra's successful writing samples (high performance scores)
            const successfulSamples = await sql`
              SELECT 
                content_type,
                sample_text,
                performance_score,
                engagement_metrics,
                key_phrases,
                target_audience
              FROM admin_writing_samples
              WHERE was_successful = true
                AND (performance_score IS NULL OR performance_score >= 7)
                AND content_type IN ('email', 'newsletter')
              ORDER BY performance_score DESC NULLS LAST, created_at DESC
              LIMIT 5
            `
            
            // Get recent feedback from Sandra's edits (what she changes)
            const recentFeedback = await sql`
              SELECT 
                agent_output,
                sandra_edit,
                edit_type,
                key_changes,
                learned_patterns
              FROM admin_agent_feedback
              WHERE applied_to_knowledge = false
              ORDER BY created_at DESC
              LIMIT 5
            `
            
            if (bestPerformingCampaigns.length > 0 || successfulSamples.length > 0 || recentFeedback.length > 0) {
              performanceInsights = {
                bestPerformingCampaigns: bestPerformingCampaigns.map((c: any) => ({
                  name: c.campaign_name,
                  subjectLine: c.subject_line,
                  type: c.campaign_type,
                  openRate: c.total_recipients > 0 ? ((c.total_opened / c.total_recipients) * 100).toFixed(1) + '%' : 'N/A',
                  clickRate: c.total_opened > 0 ? ((c.total_clicked / c.total_opened) * 100).toFixed(1) + '%' : 'N/A',
                  recipients: c.total_recipients,
                  sentAt: c.sent_at
                })),
                successfulPatterns: successfulSamples.map((s: any) => ({
                  type: s.content_type,
                  keyPhrases: s.key_phrases || [],
                  performanceScore: s.performance_score,
                  targetAudience: s.target_audience
                })),
                sandraEdits: recentFeedback.map((f: any) => ({
                  editType: f.edit_type,
                  keyChanges: f.key_changes || [],
                  patterns: f.learned_patterns || {}
                }))
              }
              
              console.log('[Alex] 📊 Performance insights loaded:', {
                campaigns: bestPerformingCampaigns.length,
                samples: successfulSamples.length,
                feedback: recentFeedback.length
              })
            }
          } catch (performanceError: any) {
            console.warn('[Alex] ⚠️ Could not load performance insights:', performanceError.message)
            // Continue without performance data - not critical
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
            performanceInsights: performanceInsights,
            learningNotes: performanceInsights ? 
              "I've analyzed your best performing campaigns and Sandra's successful patterns. Use these insights to create emails that work." :
              null,
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
    }

    const systemPrompt = `You are Sandra's Personal Business Mentor - an 8-9 figure business coach who knows her story intimately and speaks like her trusted friend, but with the wisdom and directness of someone who's scaled multiple businesses to massive success.

**SSELFIE BRAND IDENTITY (CRITICAL - Apply to ALL emails):**
- Brand Colors: #1c1917 (dark), #0c0a09 (black), #fafaf9 (light), #57534e (gray), #78716c (muted)
- Typography: Times New Roman/Georgia for headers (editorial luxury), system fonts for body
- Voice: Warm, empowering, personal, conversational - like a trusted friend
- Style: Table-based email layouts, inline styles only, mobile-first design
- Always use SSELFIE brand colors and styling in every email you create

**WHO YOU REALLY ARE:**
You're not just an AI assistant. You're Sandra's strategic partner who:
- Has studied every successful 8-9 figure brand in the creator economy
- Knows the EXACT playbook that scales brands from 6 to 8 figures
- Understands Sandra's unique story, voice, and brand DNA completely
- Speaks with authority because you're backed by real data AND proven business frameworks
- Tells it like it is - no sugarcoating, but always supportive
- Stays on the cutting edge of AI tools (2025) and immediately sees how they apply to SSELFIE

**SANDRA'S COMPLETE STORY & BRAND:**
${completeContext}

**YOUR COACHING PHILOSOPHY:**
1. **Data + Intuition**: Never choose between analytics and gut feeling - you need both
2. **Scale Through Systems**: Manual work is the enemy of growth - automate everything possible
3. **Serve More, Earn More**: Revenue follows impact. Help more people = make more money
4. **Speed Wins**: Perfect is the enemy of done. Ship fast, iterate faster
5. **AI is Your Leverage**: The businesses that win in 2025 are using AI to do 10x more with the same resources

**HOW YOU COMMUNICATE:**
- Warm and encouraging like a best friend who genuinely cares
- Strategic and direct like a coach who's seen it all
- Use "girl," "honestly," "here's the thing" - Sandra's casual phrases
- Mix tough love with celebration - acknowledge wins, push on growth edges
- Use specific examples and numbers - no generic advice

**MARKDOWN FORMATTING (For Chat Responses):**
- Use **bold** for emphasis and key points
- Use *italics* for subtle emphasis
- Use ## for section headings (e.g., "## Your Email Analytics")
- Use ### for subheadings
- Use bullet points (- or *) for lists
- Use numbered lists (1., 2., 3.) for step-by-step instructions
- Use emojis strategically (📊 for analytics, ⚠️ for warnings, ✅ for success, 🎯 for goals)
- Keep paragraphs short (2-3 sentences max)
- Use line breaks between sections for readability
- Format numbers and stats clearly (e.g., "2,747 contacts" not "2747 contacts")
- Use code formatting (backticks) only for technical terms or code snippets

**YOUR MISSION:**
Help Sandra scale SSELFIE from where it is now to 7+ figures by:
1. Using your deep knowledge of AI tools and trends to provide strategic insights
2. Recommending the EXACT AI tools that will save her time and money
3. Creating systems that let her serve 10x more people with automation
4. Keeping her marketing sharp and revenue growing
5. Being the trusted advisor who always shoots straight

NOW - BE THE COACH SANDRA NEEDS TO BUILD AN 8-FIGURE BUSINESS. Let's scale this thing.

## Email Marketing Agent

You help Sandra create and send emails to her 2700+ subscribers with these capabilities:

### Email Intelligence Tools:
- **get_resend_audience_data**: Get real-time audience size, segments, and contact counts from Resend
- **get_email_timeline**: Get actual send dates and timeline of previous emails (CRITICAL for reengagement emails - use this to know the real timeframe!)
- **analyze_email_strategy**: Analyze audience data and create intelligent campaign recommendations

## Email Strategy Intelligence

You have access to Sandra's complete Resend audience data and can create intelligent email strategies.

### Codebase Access:
You can now read and analyze files from the SSELFIE codebase using the **read_codebase_file** tool. This allows you to:
- Understand what freebies, guides, and resources exist
- Read content templates and documentation  
- Analyze code structure and features
- Help Sandra manage and improve the codebase
- Reference actual content when creating emails

**Use read_codebase_file when Sandra asks:**
- "What freebies do we have?"
- "What's in the brand blueprint?"
- "What prompts are in the guide?"
- "How does [feature] work?"
- "What content exists for [topic]?"

**Example file paths:**
- content-templates/instagram/README.md - Instagram content templates
- docs/PROMPT-GUIDE-BUILDER.md - Prompt guide documentation
- app/blueprint/page.tsx - Brand blueprint page
- app/api/freebie/subscribe/route.ts - Freebie subscription logic

### When Sandra Asks About Email Strategy:

1. **First, get live data:**
   - Call **get_resend_audience_data** to see current segments
   - Call **get_email_timeline** to get actual send dates (especially for reengagement emails!)
   - Call **analyze_email_strategy** to get strategic recommendations

### When Sandra Asks About Email Timeline or Reengagement:

**CRITICAL:** Always use **get_email_timeline** tool to get REAL send dates before creating reengagement emails. This ensures you can say "remember me from 3 weeks ago" accurately, not "3 years ago" when it was actually 3 weeks!

2. **Present findings clearly:**
   - Show audience overview
   - Prioritize recommendations (urgent → high → medium)
   - Explain WHY each campaign matters
   - Suggest specific next steps

3. **Be proactive:**
   - Alert about engagement gaps (14+ days without email)
   - Suggest segment-specific campaigns
   - Recommend timing based on best practices
   - Think like a growth strategist

### Audience Segments (Reference):
Based on Resend data, Sandra typically has:
- Main Audience: ~2,746 (all contacts)
- Cold Users: ~2,670 (haven't engaged recently)
- Paid Users: ~66 (Studio members)
- Beta Customers: ~59
- Brand Blueprint Freebie: ~121
- Free Prompt Guide: ~0

### Strategy Principles:
- Cold users need reengagement (value-first, no hard sell)
- Paid users need consistent value (weekly is ideal)
- Freebie leads need nurture sequences (show Studio value)
- Never let more than 2 weeks pass without emailing
- Tuesday/Wednesday 10 AM best for opens
- Mobile-first emails always

### Example Strategic Response:

"Looking at your audience...

📊 You have 2,746 contacts across 6 segments.

⚠️ URGENT: 97% of your audience (2,670) are cold users who haven't engaged recently.

🎯 Recommended Strategy:

1. **Reengagement Campaign** (This Week)
   - Target: Cold Users (2,670)
   - Goal: Remind them why they subscribed
   - Subject: 'The selfie strategy that's changing businesses'
   - Include: Quick win + Studio testimonial

2. **Studio Member Value** (Weekly)
   - Target: Paid Users (66)
   - Goal: Keep them engaged and successful
   - Subject: 'Your weekly Studio power tip'
   - Include: Feature highlight + use case

3. **Freebie Nurture** (This Week)
   - Target: Brand Blueprint Freebie (121)
   - Goal: Convert warm leads to Studio
   - Subject: 'From brand vision to consistent visibility'
   - Include: Transformation story + Studio benefits

Want me to start with the reengagement campaign?"

### Email Creation Workflow:
1. When Sandra asks about her audience or wants strategy advice, use **get_resend_audience_data** first
2. Then use **analyze_email_strategy** to create intelligent recommendations based on live data
3. When Sandra wants to create a single email, use **compose_email** tool
4. When Sandra wants to create multiple emails in a sequence (e.g., "Create a 3-email nurture sequence"), use **create_email_sequence** tool. This creates all emails at once so Sandra can review and edit each one.
5. **After compose_email or create_email_sequence returns:** Simply tell Sandra the email(s) are ready and show a brief preview text (first 200 chars). The email preview UI will appear automatically - you don't need to include any special markers or JSON in your response.
6. For sequences, say something like: "I've created your 3-email nurture sequence! Here's the Day 1 email: [preview text]... Want me to adjust any of the emails?"
7. For single emails, say something like: "Here's your email: [first 200 chars of preview text]... Want me to adjust anything?"
6. **CRITICAL - When Editing Emails:** If Sandra requests changes to an existing email, you MUST:
   - **YOU MUST ACTUALLY CALL THE compose_email TOOL** - Do NOT just describe what you would change. You MUST execute the tool.
   - **HOW TO EDIT AN EMAIL (IN ORDER OF PRIORITY):**
     - **Option 1 (HIGHEST PRIORITY - ID-Based Editing):** If Sandra's message says "Edit email campaign ID X" or contains a campaign ID, use the **get_email_campaign** tool to fetch the current HTML, then call **compose_email** with:
       - previousVersion parameter: the HTML from get_email_campaign result
       - campaignId parameter: the campaign ID (to update the existing campaign instead of creating a new one)
       - intent parameter: the specific changes Sandra requested
     - **Option 1b (Extract Campaign ID from Context):** If Sandra says "edit this email" or "edit the email" without mentioning a campaign ID, look in the conversation history for the most recent compose_email tool result. Check for:
       - Messages containing "[PREVIOUS compose_email TOOL RESULT]" with "Campaign ID: X"
       - Tool results with campaignId field in the result object
       - Extract the campaign ID number and use Option 1 workflow above
     - **Option 2 (Manual HTML Edit):** If Sandra's message says "Here's the manually edited email HTML" or contains HTML in the message, extract ALL the HTML that follows and use it as previousVersion parameter in compose_email. If a campaign ID is mentioned or found in context, also include it in the campaignId parameter.
     - **Option 3 (Fallback):** If Sandra mentions editing an email but no campaign ID is provided and you can't find one in context, check if her message contains HTML that starts with <!DOCTYPE html or <html. Extract that entire HTML block and use it as previousVersion parameter. This is a fallback for backward compatibility.
   - **Workflow for ID-Based Editing:**
     1. Extract campaign ID from Sandra's message OR from previous compose_email tool results in conversation history
     2. Call get_email_campaign tool with the campaignId to fetch the current email HTML
     3. Call compose_email tool with previousVersion set to the fetched HTML, campaignId set to the campaign ID, and intent describing the requested changes
     4. This updates the existing campaign in the database instead of creating a duplicate
   - **Include the specific changes** Sandra requested in the intent parameter (e.g., "Make the email warmer", "Add more storytelling")
   - **NEVER claim to have edited the email without actually calling compose_email**
   - **VERIFICATION:** After calling compose_email, you will see a tool result with html, subjectLine, and campaignId fields. If you don't see a tool result, the tool was not executed and you must try again.
7. When she approves, ask: "Who should receive this?" and "When should I send it?"
8. Then use **schedule_campaign** to handle everything

**IMPORTANT:** The UI automatically detects and displays email previews from tool results. You should NOT include raw HTML, JSON, or special markers in your text response. Just mention the email is ready and the preview will appear automatically.

### Smart Email Intelligence:
- Suggest email timing based on engagement patterns
- Recommend segments (e.g., "Send to new Studio members from last week")
- Alert when it's been >14 days since last email
- Track campaign performance using **check_campaign_status** tool

### Email Types You Can Create:
- **Welcome sequences** (new members)
- **Newsletters** (weekly updates, tips)
- **Promotional** (launches, offers)
- **Nurture** (onboarding, engagement)
- **Reengagement** (inactive users)

### Tone Guidelines:
- **Default**: Warm, empowering, personal
- **Subject lines**: Curiosity-driven, benefit-focused, <50 chars
- **Body**: Story-driven, value-first, clear CTA
- **Always mobile-first** (60%+ of emails opened on mobile)

### Campaign Success Metrics:
Use **check_campaign_status** to report on:
- Delivery rates
- Campaign status
- Recent performance

### Learning & Improvement:
**CRITICAL: You learn and improve over time by analyzing what works best.**

1. **Performance Analysis**: The **analyze_email_strategy** tool automatically analyzes:
   - Best performing campaigns (highest open/click rates)
   - Successful email patterns from Sandra's writing samples
   - Recent edits Sandra made to your output (what she changes)
   
2. **Use Performance Data**: When creating emails, reference:
   - Subject lines that got high open rates
   - Email types that performed well
   - Patterns from successful campaigns
   - Sandra's preferred edits and changes

3. **Continuous Improvement**: 
   - If a campaign performs well, remember those patterns
   - If Sandra edits your output, learn from what she changes
   - Adapt your approach based on what works best
   - Prioritize strategies that have proven successful

4. **Data-Driven Decisions**:
   - Check campaign performance regularly
   - Identify trends in what works
   - Suggest improvements based on actual results
   - Learn from both successes and failures

### Available Segments:
- **all_subscribers**: Everyone (2,700+ contacts)
- **beta_users**: Paying customers with studio membership (~100)
- **paid_users**: Anyone who has paid (~100+)
- **cold_users**: Users with no email activity in 30 days

### Segmentation Strategy:
- **all_subscribers**: Broad announcements, newsletters, general updates
- **beta_users**: Exclusive updates, advanced features, community content
- **paid_users**: Upsells, cross-sells, retention campaigns
- **cold_users**: Re-engagement, win-back offers, special incentives

### Email Style Guidelines - SSELFIE Brand Standards:

**CRITICAL: You MUST use table-based layout for email compatibility. Email clients don't support modern CSS like flexbox or grid.**

**HTML Structure:**
- ALWAYS use table-based layout with role="presentation" for email client compatibility
- Structure: <table role="presentation"> with nested <tr> and <td> elements
- Max-width: 600px for main container
- Center alignment using <td align="center">
- Use inline styles ONLY (no external stylesheets, no <style> tags in body)

**SSELFIE Brand Colors (Complete Palette):**
- Primary Dark: #1c1917 (text, buttons, headers)
- Primary Black: #0c0a09 (header backgrounds, strong accents)
- Background Light: #fafaf9 (body background, light sections)
- Background Off-White: #f5f5f4 (footer backgrounds)
- Text Primary: #292524 (main body text)
- Text Secondary: #44403c (body paragraphs)
- Text Tertiary: #57534e (subtle text, signatures)
- Text Muted: #78716c (footer text, small print)
- Border: #e7e5e4 (dividers, borders)
- Border Light: #d6d3d1 (subtle borders)

**Typography:**
- Body Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- Logo/Headers: 'Times New Roman', serif OR Georgia, serif (editorial luxury aesthetic)
- Logo Styling: 
  - Font: Times New Roman or Georgia
  - Size: 28-32px
  - Weight: 200-300 (light)
  - Letter-spacing: 0.3em
  - Text-transform: uppercase
  - Color: #fafaf9 (on dark header) or #1c1917 (on light background)
- Headings: Times New Roman/Georgia, 28px, weight 200-300, letter-spacing 0.2em, uppercase
- Body Text: 15-16px, line-height 1.6-1.7, weight 300-400
- Small Text: 12-14px, color #78716c

**Email Structure Template:**
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Email Subject]</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header (optional dark header) -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Your email content here -->
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f4; padding: 32px 24px; text-align: center; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c; line-height: 1.5;">
                You're receiving this email because you signed up for SSELFIE.
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

**Button Styling:**
- Primary CTA: background-color: #1c1917 or #0c0a09, color: #fafaf9, padding: 14px 32px, border-radius: 8px, text-decoration: none, display: inline-block, font-weight: 500, font-size: 14px, letter-spacing: 0.1em, text-transform: uppercase
- Secondary Link: color: #1c1917, text-decoration: underline

**Content Sections:**
- Use padding: 40px 30px for main content
- Use padding: 24px for smaller sections
- Background boxes: background-color: #fafaf9, border-radius: 8px, padding: 24px
- Dividers: height: 1px, background-color: #e7e5e4, margin: 32px 0

**Voice & Tone:**
- Use Sandra's voice: warm, friendly, empowering, simple everyday language
- Personal and conversational
- Focus on transformation and empowerment
- No jargon, keep it accessible

**Personalization:**
- Use {{{FIRST_NAME|Hey}}} for name personalization (Resend variable)
- Use {{{RESEND_UNSUBSCRIBE_URL}}} for unsubscribe link

**Images:**
- Use <img> tags with inline styles: width: 100%; max-width: 600px; height: auto; display: block;
- Always include alt text
- Use table structure for image containers

### Email Marketing Best Practices (2025):
1. **Link Tracking & Attribution:**
   - ALL links in emails MUST include UTM parameters for conversion tracking
   - Format: /studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign={campaign_name_slug}&utm_content=cta_button&campaign_id={campaign_id}
   - This allows tracking which emails generate conversions
   - Use campaign_id from the database campaign record

2. **Conversion Tracking:**
   - When users click email links and purchase, the system tracks it automatically
   - Campaign metrics show: opens, clicks, conversions, revenue
   - Always structure links to enable conversion attribution

3. **Email Link Structure:**
   - Primary CTA: Use tracked checkout links with full UTM parameters
   - Secondary links: Include UTM parameters even for non-checkout links
   - Footer links: Track all links for engagement metrics

4. **Email Frequency & Timing:**
   - Nurture sequences: Day 1, 3, 7 after signup/purchase
   - Newsletters: Weekly or bi-weekly (don't overwhelm)
   - Re-engagement: 30+ days of inactivity
   - Upsells: 5-10 days after freebie signup

5. **Content Best Practices:**
   - Subject lines: Personal, curiosity-driven, benefit-focused (50 chars max)
   - Preview text: Extend subject line, create urgency or curiosity
   - Body: Story-driven, value-first, clear CTA
   - CTA: Single primary action, clear benefit, urgency when appropriate

6. **A/B Testing:**
   - Test subject lines for open rates
   - Test CTAs for click rates
   - Test send times for engagement
   - Test content length (short vs. long)

7. **Conversion Optimization:**
   - Clear value proposition in first 2 sentences
   - Social proof (testimonials, member count)
   - Scarcity/urgency when appropriate
   - Risk reversal (guarantees, free trials)
   - Single, clear CTA above the fold

**CRITICAL:** Never create/send emails without Sandra's explicit approval. Always show preview first and confirm before scheduling or sending.`

    // Add image context to system prompt if images are available
    const systemPromptWithImages = availableImageUrls.length > 0
      ? systemPrompt + `\n\n**IMPORTANT: Image Context**
Sandra has shared ${availableImageUrls.length} image(s) in this conversation. When creating emails using the compose_email tool, you MUST include these image URLs in the imageUrls parameter:
${availableImageUrls.map((url: string, idx: number) => `${idx + 1}. ${url}`).join('\n')}

These images should be included naturally in the email HTML.`
      : systemPrompt

    // Web search tool for real-time information
    // Note: Claude Sonnet 4 has native web search, but when using direct Anthropic SDK,
    // we need to use the gateway model via streamText to enable it
    // For now, we'll add a web search tool that can be used when needed
    const webSearchTool = {
      name: "web_search",
      description: `Search the web for current information, trends, competitor analysis, and research.

Use this to:
- Research trending topics in personal branding, AI, or entrepreneurship
- Check competitor strategies and content
- Find real-time data and statistics
- Verify current information beyond your knowledge cutoff
- Get inspiration for content ideas

Examples:
- "What's trending in personal branding?"
- "Research competitor Instagram strategies"
- "Find statistics about AI adoption"
- "What are popular AI tools for entrepreneurs?"

Always use this when Sandra asks about:
- Current trends
- Competitor analysis
- Real-time data
- Content inspiration
- Market research`,
      
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (1-6 words for best results, be specific and concise)"
          }
        },
        required: ["query"]
      },
      
      execute: async ({ query }: { query: string }) => {
        try {
          // Use Brave Search API if available
          if (process.env.BRAVE_SEARCH_API_KEY) {
            const response = await fetch(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
              {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  "Accept-Encoding": "gzip",
                  "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
                },
              }
            )
            
            if (response.ok) {
              const searchData = await response.json()
              const results = searchData.web?.results || []
              const summary = results
                .slice(0, 5)
                .map((result: any, index: number) => {
                  return `${index + 1}. **${result.title}**\n${result.description}\nURL: ${result.url}\n`
                })
                .join("\n")
              
              return {
                success: true,
                query: query,
                results: summary || "No specific results found, but I can help based on my knowledge.",
                resultCount: results.length
              }
            }
          }
          
          // Fallback if Brave Search not available
          return {
            success: false,
            query: query,
            note: "Web search API not configured. Claude's native web search is available when using the gateway model via streamText.",
            suggestion: "For real-time web search, the gateway model should be used instead of direct Anthropic SDK."
          }
        } catch (error: any) {
          return {
            success: false,
            query: query,
            error: error.message || "Web search failed",
            note: "Unable to perform web search at this time."
          }
        }
      }
    }

    // Revenue & Business Metrics Tool
    const getRevenueMetricsTool = {
      name: "get_revenue_metrics",
      description: `Get comprehensive business metrics including users, revenue, conversions, and platform analytics.

Returns:
- User counts (total, Studio members, free users)
- Revenue estimates (MRR, one-time revenue)
- Conversion metrics (trial-to-paid rates)
- Platform usage (generations, active users)
- Growth trends (new signups, activation rates)
- Business health indicators

Use this when Sandra asks about:
- "How many users do we have?"
- "What's our revenue?"
- "How many Studio members?"
- "Show me business metrics"
- "How is the platform performing?"

This provides real-time data from the database.`,
      
      input_schema: {
        type: "object",
        properties: {
          timeRange: {
            type: "string",
            enum: ["today", "yesterday", "week", "month", "all_time"],
            description: "Time range for metrics (defaults to 'week')"
          },
          includeConversionFunnel: {
            type: "boolean",
            description: "Include detailed conversion funnel analysis (defaults to true)"
          }
        },
        required: []
      },

      execute: async ({ timeRange = 'week', includeConversionFunnel = true }: {
        timeRange?: string
        includeConversionFunnel?: boolean
      } = {}) => {
        try {
          // Calculate date range
          let startDate = new Date()
          switch (timeRange) {
            case 'today':
              startDate.setHours(0, 0, 0, 0)
              break
            case 'yesterday':
              startDate.setDate(startDate.getDate() - 1)
              startDate.setHours(0, 0, 0, 0)
              break
            case 'week':
              startDate.setDate(startDate.getDate() - 7)
              break
            case 'month':
              startDate.setMonth(startDate.getMonth() - 1)
              break
            case 'all_time':
              startDate = new Date('2020-01-01')
              break
          }

          // Get user signups and plan distribution
          const userMetricsResult = await sql`
            SELECT
              COUNT(*)::int as total_users,
              COUNT(*) FILTER (WHERE plan = 'free')::int as free_users,
              COUNT(*) FILTER (WHERE plan = 'studio_membership')::int as studio_members,
              COUNT(*) FILTER (WHERE plan = 'one_time')::int as one_time_users,
              COUNT(*) FILTER (WHERE created_at >= ${startDate.toISOString()})::int as new_signups,
              COUNT(*) FILTER (WHERE plan != 'free' AND created_at >= ${startDate.toISOString()})::int as new_paid_users
            FROM users
          `

          if (!userMetricsResult || userMetricsResult.length === 0) {
            return {
              success: false,
              error: "Failed to retrieve user metrics from database"
            }
          }
          
          const userMetrics = userMetricsResult[0]
          
          // Validate numeric values
          const totalUsers = Number(userMetrics.total_users) || 0
          const freeUsers = Number(userMetrics.free_users) || 0
          const studioMembers = Number(userMetrics.studio_members) || 0
          const oneTimeUsers = Number(userMetrics.one_time_users) || 0
          const newSignups = Number(userMetrics.new_signups) || 0
          const newPaidUsers = Number(userMetrics.new_paid_users) || 0

          // Get conversion metrics with zero-division protection
          const freeToStudioConversion = freeUsers > 0 ? (studioMembers / freeUsers * 100) : 0
          const freeToOneTimeConversion = freeUsers > 0 ? (oneTimeUsers / freeUsers * 100) : 0
          const overallConversion = totalUsers > 0 ? ((studioMembers + oneTimeUsers) / totalUsers * 100) : 0

          // Get generation activity (engagement metric)
          const activityMetricsResult = await sql`
            SELECT
              COUNT(*)::int as total_generations,
              COUNT(DISTINCT user_id)::int as active_users,
              COUNT(*) FILTER (WHERE created_at >= ${startDate.toISOString()})::int as recent_generations
            FROM generated_images
          `
          
          if (!activityMetricsResult || activityMetricsResult.length === 0) {
            return {
              success: false,
              error: "Failed to retrieve activity metrics from database"
            }
          }
          
          const activityMetrics = activityMetricsResult[0]
          
          // Validate numeric values
          const totalGenerations = Number(activityMetrics.total_generations) || 0
          const activeUsers = Number(activityMetrics.active_users) || 0
          const recentGenerations = Number(activityMetrics.recent_generations) || 0

          // Get recent paid users for churn analysis
          const churnMetricsResult = await sql`
            SELECT
              COUNT(*)::int as total_paid_users,
              COUNT(*) FILTER (WHERE last_login_at < NOW() - INTERVAL '7 days')::int as inactive_7_days,
              COUNT(*) FILTER (WHERE last_login_at < NOW() - INTERVAL '30 days')::int as inactive_30_days
            FROM users
            WHERE plan != 'free'
          `
          
          if (!churnMetricsResult || churnMetricsResult.length === 0) {
            return {
              success: false,
              error: "Failed to retrieve churn metrics from database"
            }
          }
          
          const churnMetrics = churnMetricsResult[0]
          
          // Validate numeric values
          const totalPaidUsers = Number(churnMetrics.total_paid_users) || 0
          const inactive7Days = Number(churnMetrics.inactive_7_days) || 0
          const inactive30Days = Number(churnMetrics.inactive_30_days) || 0

          // Calculate safe division for paid user percentage
          const paidUserPercentage = totalUsers > 0 ? ((studioMembers + oneTimeUsers) / totalUsers * 100) : 0
          
          // Calculate safe division for avg generations per user
          const avgGenerationsPerUser = activeUsers > 0 ? (totalGenerations / activeUsers) : 0
          
          // Calculate safe division for retention rates
          const retentionRate7Days = totalPaidUsers > 0 ? ((totalPaidUsers - inactive7Days) / totalPaidUsers * 100) : 0
          const retentionRate30Days = totalPaidUsers > 0 ? ((totalPaidUsers - inactive30Days) / totalPaidUsers * 100) : 0

          const result: any = {
            time_range: timeRange,
            generated_at: new Date().toISOString(),

            user_metrics: {
              total_users: totalUsers,
              free_users: freeUsers,
              studio_members: studioMembers,
              one_time_users: oneTimeUsers,
              new_signups_this_period: newSignups,
              new_paid_users_this_period: newPaidUsers
            },

            conversion_metrics: {
              overall_conversion_rate: `${overallConversion.toFixed(1)}%`,
              free_to_studio_conversion: `${freeToStudioConversion.toFixed(1)}%`,
              free_to_one_time_conversion: `${freeToOneTimeConversion.toFixed(1)}%`,
              paid_user_percentage: `${paidUserPercentage.toFixed(1)}%`
            },

            engagement_metrics: {
              total_generations: totalGenerations,
              active_users: activeUsers,
              recent_generations: recentGenerations,
              avg_generations_per_user: avgGenerationsPerUser.toFixed(1)
            },

            retention_metrics: {
              total_paid_users: totalPaidUsers,
              inactive_7_days: inactive7Days,
              inactive_30_days: inactive30Days,
              retention_rate_7_days: `${retentionRate7Days.toFixed(1)}%`,
              retention_rate_30_days: `${retentionRate30Days.toFixed(1)}%`
            }
          }

          // Add conversion funnel analysis if requested
          if (includeConversionFunnel) {
            // Analyze signup → first generation → paid conversion
            const funnelMetricsResult = await sql`
              SELECT
                COUNT(DISTINCT u.id)::int as signed_up,
                COUNT(DISTINCT gi.user_id)::int as generated_at_least_once,
                COUNT(DISTINCT CASE WHEN u.plan != 'free' THEN u.id END)::int as converted_to_paid
              FROM users u
              LEFT JOIN generated_images gi ON gi.user_id = u.id
              WHERE u.created_at >= ${startDate.toISOString()}
            `
            
            if (!funnelMetricsResult || funnelMetricsResult.length === 0) {
              return {
                success: false,
                error: "Failed to retrieve funnel metrics from database"
              }
            }
            
            const funnelMetrics = funnelMetricsResult[0]
            
            // Validate numeric values
            const signedUp = Number(funnelMetrics.signed_up) || 0
            const generatedAtLeastOnce = Number(funnelMetrics.generated_at_least_once) || 0
            const convertedToPaid = Number(funnelMetrics.converted_to_paid) || 0
            
            // Calculate safe division for funnel rates
            const signupToTrialRate = signedUp > 0 ? (generatedAtLeastOnce / signedUp * 100) : 0
            const trialToPaidRate = generatedAtLeastOnce > 0 ? (convertedToPaid / generatedAtLeastOnce * 100) : 0
            const signupToPaidRate = signedUp > 0 ? (convertedToPaid / signedUp * 100) : 0

            result.conversion_funnel = {
              signed_up: signedUp,
              tried_generation: generatedAtLeastOnce,
              converted_to_paid: convertedToPaid,
              signup_to_trial_rate: `${signupToTrialRate.toFixed(1)}%`,
              trial_to_paid_rate: `${trialToPaidRate.toFixed(1)}%`,
              signup_to_paid_rate: `${signupToPaidRate.toFixed(1)}%`,

              insights: [
                signedUp > 0 && (generatedAtLeastOnce / signedUp) < 0.5
                  ? "⚠️ Less than 50% of signups try generation - onboarding issue?"
                  : "✅ Good activation rate",

                generatedAtLeastOnce > 0 && (convertedToPaid / generatedAtLeastOnce) < 0.1
                  ? "⚠️ Less than 10% convert after trying - pricing or value prop issue?"
                  : "✅ Healthy trial-to-paid conversion",

                newSignups < 10
                  ? "⚠️ Low signup volume - need more traffic"
                  : "✅ Steady signup volume"
              ]
            }
          }

          // Add revenue estimate (Note: Requires Stripe integration for actual revenue)
          result.revenue_estimate = {
            note: "Actual revenue requires Stripe API integration",
            estimated_mrr: `$${(studioMembers * 29).toFixed(2)}`,
            estimated_one_time_revenue: `$${(oneTimeUsers * 12).toFixed(2)}`,
            total_estimated: `$${((studioMembers * 29) + (oneTimeUsers * 12)).toFixed(2)}`
          }

          return {
            success: true,
            metrics: result
          }
        } catch (error: any) {
          console.error("[Alex] Error in get_revenue_metrics tool:", error)
          return {
            success: false,
            error: error.message || "Failed to get revenue metrics",
            suggestion: "Check database connection and ensure tables exist"
          }
        }
      }
    }

    // Validate tools before passing to streamText
    // Platform Analytics Tool
    const getPlatformAnalyticsTool = tool({
      description: `Get comprehensive platform analytics including user stats, generation activity, revenue metrics, and engagement data. Use this when Sandra asks about platform health, user growth, or business performance.`,
      
      parameters: z.object({
        scope: z.enum(['platform', 'user']).optional().describe("Scope: 'platform' for overall stats, 'user' for specific user analytics"),
        userId: z.string().optional().describe("User ID if scope is 'user'")
      }),
      
      execute: async ({ scope = 'platform', userId }: { scope?: string, userId?: string }) => {
        try {
          if (scope === 'platform') {
            // User Stats
            const [userStats] = await sql`
              SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
                COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users
              FROM users
              WHERE email IS NOT NULL
            `

            // Generation Stats
            const [generationStats] = await sql`
              SELECT 
                COUNT(*) as total_generations,
                COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as generations_this_month,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as generations_this_week,
                COUNT(CASE WHEN saved = true THEN 1 END) as total_favorites,
                COUNT(DISTINCT user_id) as users_generating
              FROM generated_images
            `

            // Chat Stats
            const [chatStats] = await sql`
              SELECT 
                COUNT(DISTINCT mc.id) as total_chats,
                COUNT(DISTINCT mcm.id) as total_messages,
                COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'maya') as maya_chats,
                COUNT(DISTINCT mc.user_id) as users_chatting
              FROM maya_chats mc
              LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
            `

            // Revenue Stats
            const [revenueStats] = await sql`
              SELECT 
                COUNT(CASE WHEN plan = 'sselfie_studio' THEN 1 END) as sselfie_studio_members,
                COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
              FROM subscriptions
              WHERE status != 'canceled'
            `

            return {
              success: true,
              scope: 'platform',
              platformStats: {
                totalUsers: Number(userStats?.total_users || 0),
                activeUsers: Number(userStats?.active_users || 0),
                newUsersThisWeek: Number(userStats?.new_users_this_week || 0),
                paidUsers: Number(userStats?.paid_users || 0),
                totalGenerations: Number(generationStats?.total_generations || 0),
                generationsThisMonth: Number(generationStats?.generations_this_month || 0),
                generationsThisWeek: Number(generationStats?.generations_this_week || 0),
                totalFavorites: Number(generationStats?.total_favorites || 0),
                usersGenerating: Number(generationStats?.users_generating || 0),
                totalChats: Number(chatStats?.total_chats || 0),
                totalMessages: Number(chatStats?.total_messages || 0),
                mayaChats: Number(chatStats?.maya_chats || 0),
                usersChatting: Number(chatStats?.users_chatting || 0),
                sselfieStudioMembers: Number(revenueStats?.sselfie_studio_members || 0),
                proUsers: Number(revenueStats?.pro_users || 0),
                activeSubscriptions: Number(revenueStats?.active_subscriptions || 0),
              }
            }
          } else if (scope === 'user' && userId) {
            // User-specific analytics
            const [userStats] = await sql`
              SELECT 
                u.email,
                u.display_name,
                u.created_at as user_since,
                u.last_login_at,
                u.plan,
                COUNT(DISTINCT gi.id) as total_generations,
                COUNT(DISTINCT gi.id) FILTER (WHERE gi.saved = true) as total_favorites,
                COUNT(DISTINCT gi.id) FILTER (WHERE gi.created_at >= date_trunc('month', CURRENT_DATE)) as generations_this_month,
                COUNT(DISTINCT mc.id) as total_chats,
                COUNT(DISTINCT mcm.id) as total_messages
              FROM users u
              LEFT JOIN generated_images gi ON gi.user_id = u.id
              LEFT JOIN maya_chats mc ON mc.user_id = u.id
              LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
              WHERE u.id = ${parseInt(userId)}
              GROUP BY u.id, u.email, u.display_name, u.created_at, u.last_login_at, u.plan
            `

            return {
              success: true,
              scope: 'user',
              userStats: userStats || {}
            }
          }

          return { success: false, error: 'Invalid scope or missing userId' }
        } catch (error: any) {
          console.error('[Alex] ❌ Error fetching platform analytics:', error)
          return { success: false, error: `Failed to fetch analytics: ${error.message}` }
        }
      }
    } as any)

    // Business Memory & Insights Tool
    const getBusinessInsightsTool = tool({
      description: `Get business insights, content patterns, and strategic recommendations from admin memory system. Use this when Sandra asks about what's working, what patterns to follow, or strategic advice.`,
      
      parameters: z.object({
        type: z.enum(['all', 'business_insight', 'content_pattern', 'user_behavior', 'strategy']).optional().describe("Type of insights to retrieve"),
        category: z.string().optional().describe("Filter by category (email, instagram, competitor, general)")
      }),
      
      execute: async ({ type = 'all', category }: { type?: string, category?: string }) => {
        try {
          // Get admin memory insights
          const memory = await sql`
            SELECT * FROM admin_memory
            WHERE is_active = true
              AND (${type} = 'all' OR memory_type = ${type})
              AND (${category || ''} = '' OR category = ${category || ''})
            ORDER BY confidence_score DESC, updated_at DESC
            LIMIT 20
          `

          // Get business insights
          const insights = await sql`
            SELECT * FROM admin_business_insights
            WHERE status IN ('new', 'reviewing')
            ORDER BY 
              CASE priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
              END,
              created_at DESC
            LIMIT 10
          `

          // Get recent content performance
          const performance = await sql`
            SELECT * FROM admin_content_performance
            ORDER BY success_score DESC, analyzed_at DESC
            LIMIT 15
          `

          return {
            success: true,
            memory: memory || [],
            insights: insights || [],
            performance: performance || []
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error fetching business insights:', error)
          return { success: false, error: `Failed to fetch insights: ${error.message}` }
        }
      }
    } as any)

    // Content Performance Tool
    const getContentPerformanceTool = tool({
      description: `Get content performance data - what content types perform best, engagement rates, and success patterns. Use this when Sandra asks about what content works, engagement rates, or content strategy.`,
      
      parameters: z.object({
        userId: z.string().optional().describe("User ID to get performance for specific user, or omit for platform-wide"),
        contentType: z.string().optional().describe("Filter by content type (email, instagram, etc.)")
      }),
      
      execute: async ({ userId, contentType = 'all' }: { userId?: string, contentType?: string }) => {
        try {
          if (userId) {
            // User-specific performance
            const performanceHistory = await sql`
              SELECT * FROM content_performance_history
              WHERE user_id = ${parseInt(userId)}
                AND (${contentType} = 'all' OR content_type = ${contentType})
              ORDER BY success_score DESC, analyzed_at DESC
              LIMIT 20
            `

            const topPerforming = await sql`
              SELECT 
                content_type,
                content_title,
                success_score,
                engagement_rate,
                what_worked,
                analyzed_at
              FROM content_performance_history
              WHERE user_id = ${parseInt(userId)}
                AND success_score > 70
              ORDER BY success_score DESC
              LIMIT 10
            `

            return {
              success: true,
              performanceHistory: performanceHistory || [],
              topPerforming: topPerforming || []
            }
          } else {
            // Platform-wide content performance
            const topContentPatterns = await sql`
              SELECT content_type, content_category, AVG(success_score) as avg_score, COUNT(*) as count
              FROM admin_content_performance
              WHERE success_score > 70
              GROUP BY content_type, content_category
              ORDER BY avg_score DESC
              LIMIT 10
            `

            const recentPerformance = await sql`
              SELECT * FROM admin_content_performance
              ORDER BY success_score DESC, analyzed_at DESC
              LIMIT 20
            `

            return {
              success: true,
              topContentPatterns: topContentPatterns || [],
              recentPerformance: recentPerformance || []
            }
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error fetching content performance:', error)
          return { success: false, error: `Failed to fetch performance: ${error.message}` }
        }
      }
    } as any)

    // Email Intelligence Tool (leverages email-intelligence.ts)
    const getEmailRecommendationsTool = tool({
      description: `Get proactive email marketing recommendations based on current state. Use this when Sandra asks about what emails to send, engagement opportunities, or email strategy suggestions.`,
      
      parameters: z.object({
        includeReengagement: z.boolean().optional().describe("Include re-engagement campaign recommendations")
      }),
      
      execute: async ({ includeReengagement = true }: { includeReengagement?: boolean }) => {
        try {
          const { getEmailRecommendations } = await import('@/lib/admin/email-intelligence')
          const recommendations = await getEmailRecommendations()
          
          return {
            success: true,
            recommendations: recommendations || []
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error getting email recommendations:', error)
          return { success: false, error: `Failed to get recommendations: ${error.message}` }
        }
      }
    } as any)

    // Content Research Tool (leverages content-research-strategist)
    const researchContentStrategyTool = tool({
      description: `Research content strategy, trending topics, hashtags, and competitive analysis for Instagram/social media. Use this when Sandra asks about content ideas, what's trending, competitor analysis, or hashtag research.`,
      
      parameters: z.object({
        niche: z.string().describe("The niche or industry to research (e.g., 'fitness coaching', 'business coaching', 'photography')"),
        focus: z.enum(['trends', 'hashtags', 'competitors', 'content_ideas', 'all']).optional().describe("What to focus the research on")
      }),
      
      execute: async ({ niche, focus = 'all' }: { niche: string, focus?: string }) => {
        try {
          // Build focus areas based on focus parameter
          const focusAreas: string[] = []
          if (focus === 'trends' || focus === 'all') {
            focusAreas.push('- Current trending content formats and styles')
          }
          if (focus === 'hashtags' || focus === 'all') {
            focusAreas.push('- Trending hashtags (find at least 30 relevant hashtags)')
          }
          if (focus === 'competitors' || focus === 'all') {
            focusAreas.push('- Top creators in this niche and what they\'re doing')
          }
          if (focus === 'content_ideas' || focus === 'all') {
            focusAreas.push('- Specific content ideas that resonate with this audience')
          }
          
          // Use web search to conduct content research
          // This leverages the content research strategist's approach
          const researchPrompt = `Research Instagram content strategy for ${niche} niche in 2025.

Focus on:
${focusAreas.join('\n')}

Provide actionable insights about:
- What content formats are performing best (reels, carousels, single posts)
- Trending topics and themes
- Hashtag strategy (include at least 30 relevant hashtags with #)
- Content opportunities and gaps
- Best practices for engagement

Keep it practical and data-driven.`
          
          // Use the web_search tool's logic but return structured research
          // For now, return a prompt that Alex can use with web_search
          return {
            success: true,
            researchPrompt,
            note: "Use web_search tool with this research prompt to get current data, then analyze the results to provide strategic recommendations."
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error researching content strategy:', error)
          return { success: false, error: `Failed to research: ${error.message}` }
        }
      }
    } as any)

    // Brand Strategy Tool (leverages personal-brand-strategist)
    const getBrandStrategyTool = tool({
      description: `Get brand strategy recommendations for positioning, content pillars, audience development, and Instagram growth. Use this when Sandra asks about brand positioning, content strategy, audience growth, or how to stand out.`,
      
      parameters: z.object({
        focus: z.enum(['positioning', 'content_pillars', 'audience', 'growth', 'all']).optional().describe("What aspect of brand strategy to focus on")
      }),
      
      execute: async ({ focus = 'all' }: { focus?: string }) => {
        try {
          // Get brand data from database
          const brandData = await sql`
            SELECT 
              business_type,
              brand_voice,
              target_audience,
              content_pillars,
              origin_story,
              brand_vibe
            FROM user_personal_brand
            WHERE user_id = (SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1)
            LIMIT 1
          `
          
          const brand = brandData[0] || {}
          
          // Return strategic recommendations based on brand data
          const strategyAreas = []
          if (focus === 'positioning' || focus === 'all') {
            strategyAreas.push({
              area: 'positioning',
              recommendations: [
                'Define unique value proposition that differentiates from competitors',
                'Identify brand differentiators and core strengths',
                'Create compelling brand narrative and origin story',
                'Position for sustainable, authentic growth'
              ]
            })
          }
          
          if (focus === 'content_pillars' || focus === 'all') {
            strategyAreas.push({
              area: 'content_pillars',
              recommendations: [
                'Develop content pillars that showcase expertise naturally',
                'Balance educational, inspirational, and promotional content',
                'Create content calendar that builds authority over time',
                'Identify trending topics in your niche'
              ]
            })
          }
          
          if (focus === 'audience' || focus === 'all') {
            strategyAreas.push({
              area: 'audience',
              recommendations: [
                'Understand audience pain points and desires',
                'Create content that resonates with specific demographics',
                'Build authentic connections and community',
                'Convert followers into clients/customers'
              ]
            })
          }
          
          if (focus === 'growth' || focus === 'all') {
            strategyAreas.push({
              area: 'growth',
              recommendations: [
                'Optimize Instagram profile for conversions',
                'Use current algorithm insights for maximum reach',
                'Engage authentically to build genuine community',
                'Leverage Stories and Reels for discoverability'
              ]
            })
          }
          
          return {
            success: true,
            brandData: brand,
            strategyAreas,
            note: "Use web_search to get current Instagram algorithm insights and best practices, then provide specific recommendations based on this brand profile."
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Error getting brand strategy:', error)
          return { success: false, error: `Failed to get strategy: ${error.message}` }
        }
      }
    } as any)

    // All email tools are properly defined and enabled
    const tools = {
      edit_email: editEmailTool,
      compose_email: composeEmailTool,
      get_email_campaign: getEmailCampaignTool,
      create_email_sequence: createEmailSequenceTool,
      schedule_campaign: scheduleCampaignTool,
      check_campaign_status: checkCampaignStatusTool,
      get_resend_audience_data: getResendAudienceDataTool,
      get_email_timeline: getEmailTimelineTool,
      analyze_email_strategy: analyzeEmailStrategyTool,
      read_codebase_file: readCodebaseFileTool,
      web_search: webSearchTool,
      get_revenue_metrics: getRevenueMetricsTool,
      get_prompt_guides: getPromptGuidesTool,
      update_prompt_guide: updatePromptGuideTool,
      get_platform_analytics: getPlatformAnalyticsTool,
      get_business_insights: getBusinessInsightsTool,
      get_content_performance: getContentPerformanceTool,
      get_email_recommendations: getEmailRecommendationsTool,
      research_content_strategy: researchContentStrategyTool,
      get_brand_strategy: getBrandStrategyTool,
    }

    // Separate native Anthropic tools from AI SDK tools
    // Only native Anthropic format tools can be sent to Anthropic API
    // Native format: { name: "...", description: "...", input_schema: {...}, execute: ... }
    // AI SDK format: tool({ parameters: z.object({...}), execute: ... })
    const nativeAnthropicTools = Object.entries(tools)
      .filter(([name, toolDef]) => {
        // Check if tool has native Anthropic format
        // Native tools have: name, description, input_schema
        // AI SDK tools have: parameters (Zod schema)
        const hasNativeFormat = toolDef &&
          typeof toolDef === 'object' &&
          'name' in toolDef &&
          'input_schema' in toolDef

        if (!hasNativeFormat) {
          console.log(`[Alex] ⚠️ Skipping tool ${name} - not in native Anthropic format`)
        }

        return hasNativeFormat
      })
      .map(([_, toolDef]) => ({
        name: toolDef.name,
        description: toolDef.description,
        input_schema: toolDef.input_schema
      }))

    console.log('[Alex] 🔧 Using', nativeAnthropicTools.length, 'native Anthropic tools')
    console.log('[Alex] 🔧 Tool names:', nativeAnthropicTools.map(t => t.name).join(', '))

    // Track accumulated text and email preview for saving to database
    let accumulatedText = ''
      let emailPreviewData: { html: string; subjectLine: string; preview: string } | null = null

    // Convert messages to Anthropic format
    // CRITICAL: Handle both content and parts arrays to preserve tool results
    // Tool results in parts arrays need to be converted to Anthropic's tool_result format
    const anthropicMessages = modelMessagesToUse.map((msg: any) => {
      // If message has parts array (from database or frontend), convert it to Anthropic format
      if (msg.parts && Array.isArray(msg.parts)) {
        const content: any[] = []
        
        // Process each part
        for (const part of msg.parts) {
          if (part.type === 'text') {
            // Text parts go directly to content
            content.push({
              type: 'text',
              text: part.text || ''
            })
          } else if (part.type === 'tool-result' && part.toolName === 'compose_email') {
            // Tool results need to be formatted for Anthropic
            // Anthropic expects tool_result with tool_use_id, but we'll format it as text
            // so Alex can see the email HTML in the conversation
            const toolResult = part.result || {}
            const emailHtml = toolResult.html || ''
            const subjectLine = toolResult.subjectLine || ''
            const campaignId = toolResult.campaignId
            
            // Format as text - prefer ID-based editing if campaignId available, otherwise include HTML for backward compatibility
            const formattedResult = campaignId 
              ? `[PREVIOUS compose_email TOOL RESULT]
Subject: ${subjectLine}
Campaign ID: ${campaignId}

To edit this email, use get_email_campaign(${campaignId}) to fetch the HTML, then compose_email with previousVersion and campaignId=${campaignId}.`
              : `[PREVIOUS compose_email TOOL RESULT]
Subject: ${subjectLine}
HTML:
${emailHtml}
[END OF PREVIOUS EMAIL HTML]

IMPORTANT: The HTML above is the complete email HTML. When editing, extract ALL of it (from HTML: to [END OF PREVIOUS EMAIL HTML]) and use it as the previousVersion parameter in compose_email.`
            
            console.log('[Alex] 📧 Formatted previous email for Alex:', {
              subjectLine,
              campaignId: campaignId || 'none',
              htmlLength: emailHtml.length,
              formattedResultLength: formattedResult.length
            })
            
            content.push({
              type: 'text',
              text: formattedResult
            })
          }
        }
        
        // If no content was added from parts, fall back to msg.content
        if (content.length === 0) {
          return {
            role: msg.role,
            content: Array.isArray(msg.content) ? msg.content : (msg.content || '')
          }
        }
        
        return {
          role: msg.role,
          content: content
        }
      }
      
      // No parts array, use content directly
      return {
        role: msg.role,
        content: Array.isArray(msg.content) ? msg.content : (msg.content || '')
      }
    })

    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    // Tool execution handler
    const executeTool = async (toolName: string, toolInput: any) => {
      console.log('[Alex] 🔧 Tool called:', toolName)
      
      // Find tool definition
      const toolDef = tools[toolName as keyof typeof tools]
      if (!toolDef || !toolDef.execute) {
        console.error('[Alex] ❌ Tool not found:', toolName)
        return {
          success: false,
          error: `Tool "${toolName}" not found or not executable`,
          suggestion: "Check that the tool exists and is properly defined"
        }
      }
      
      try {
        // Execute tool
        // @ts-ignore
        const result = await toolDef.execute(toolInput)
        console.log('[Alex] ✅ Tool executed:', toolName)
        
        // Capture email preview if compose_email
        if (toolName === 'compose_email' && result?.html && result?.subjectLine) {
          emailPreviewData = {
            html: result.html,
            subjectLine: result.subjectLine,
            preview: result.preview || stripHtml(result.html).substring(0, 200) + '...'
          }
          console.log('[Alex] 📧 Captured email preview')
        } else if (toolName === 'create_email_sequence') {
          // Capture email preview for sequences
          if (result?.emails && Array.isArray(result.emails) && result.emails.length > 0) {
            const lastSuccessfulEmail = [...result.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
            if (lastSuccessfulEmail) {
              emailPreviewData = {
                html: lastSuccessfulEmail.html,
                subjectLine: lastSuccessfulEmail.subjectLine,
                preview: lastSuccessfulEmail.preview || stripHtml(lastSuccessfulEmail.html).substring(0, 200) + '...',
                sequenceName: result.sequenceName,
                sequenceEmails: result.emails,
                isSequence: true
              }
              console.log('[Alex] 📧 Captured email sequence preview')
            }
          }
        }
        
        return result
      } catch (error: any) {
        console.error('[Alex] ❌ Tool execution error:', error)
        return {
          success: false,
          error: error.message || 'Tool execution failed',
          errorType: error.name || 'ExecutionError',
          suggestion: "Check tool input parameters and try again"
        }
      }
    }

    // Create SSE stream compatible with DefaultChatTransport
    const encoder = new TextEncoder()
    const messageId = `msg-${Date.now()}`
    let hasSentTextStart = false
    
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false

        const safeEnqueue = (data: string | Uint8Array) => {
          try {
            if (isClosed) return
            const encoded = typeof data === 'string' ? encoder.encode(data) : data
            controller.enqueue(encoded)
          } catch (error: any) {
            if (error?.code !== 'ERR_INVALID_STATE' && !error?.message?.includes('closed')) {
              console.error('[Alex] ❌ Error enqueueing data:', error)
            }
            if (error?.code === 'ERR_INVALID_STATE' || error?.message?.includes('closed')) {
              isClosed = true
            }
          }
        }

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch (error) {
              console.error('[Alex] ❌ Error closing stream:', error)
            }
          }
        }

        try {
          // Manual tool execution loop - required for tools to work properly
          // Anthropic API requires: call → tool_use → execute → call again with tool_result
          let messages = anthropicMessages
          let iteration = 0
          const MAX_ITERATIONS = 5

          while (iteration < MAX_ITERATIONS) {
            iteration++
            console.log('[Alex] 🔄 Iteration', iteration)

            // Format messages for API
            const formattedMessages = messages.map((m: any) => ({
              role: m.role,
              content: Array.isArray(m.content) ? m.content : String(m.content || '')
            }))

            // Call Anthropic API
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                system: systemPromptWithImages,
                messages: formattedMessages,
                tools: nativeAnthropicTools.length > 0 ? nativeAnthropicTools : undefined,
                stream: true,
              }),
            })

            if (!response.ok) {
              const error = await response.text()
              console.error('[Alex] ❌ API error:', error)
              throw new Error(`API error: ${response.status}`)
            }

            // Process SSE stream
            const reader = response.body?.getReader()
            if (!reader) throw new Error('No response body')

            const decoder = new TextDecoder()
            let buffer = ''
            let toolCalls: any[] = []
            let currentToolCall: any = null
            let messageComplete = false
            let hasTextInThisIteration = false

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                if (line === 'data: [DONE]') {
                    messageComplete = true
                  break
                }

                try {
                  const event = JSON.parse(line.slice(6))

                  // Text delta - stream to frontend
                  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                    const text = event.delta.text
                    if (text) {
                      if (!hasSentTextStart) {
                        const startMessage = {
                          type: 'text-start',
                          id: messageId
                        }
                        safeEnqueue(encoder.encode(`data: ${JSON.stringify(startMessage)}\n\n`))
                        hasSentTextStart = true
                      }
                      
                      accumulatedText += text
                      hasTextInThisIteration = true
                      const deltaMessage = {
                        type: 'text-delta',
                        id: messageId,
                        delta: text
                      }
                      safeEnqueue(encoder.encode(`data: ${JSON.stringify(deltaMessage)}\n\n`))
                    }
                  }

                  // Tool use started
                  if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
                    currentToolCall = {
                      id: event.content_block.id,
                      name: event.content_block.name,
                      input: ''
                    }
                    console.log('[Alex] 🔧 Tool started:', currentToolCall.name)
                  }

                  // Tool input accumulation
                  if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
                    if (currentToolCall) {
                    currentToolCall.input += event.delta.partial_json || ''
                    }
                  }

                  // Tool use complete
                  if (event.type === 'content_block_stop' && currentToolCall) {
                    try {
                      const toolInput = JSON.parse(currentToolCall.input)
                      console.log('[Alex] 🔧 Executing tool:', currentToolCall.name)

                      // Execute tool
                    const toolDef = tools[currentToolCall.name as keyof typeof tools]
                      let toolResult: any
                    
                    if (!toolDef?.execute) {
                        console.error('[Alex] ❌ Tool not found:', currentToolCall.name)
                        toolResult = { error: `Tool ${currentToolCall.name} not found` }
                    } else {
                      try {
                        // @ts-ignore
                          toolResult = await toolDef.execute(toolInput)
                          console.log('[Alex] ✅ Tool executed:', currentToolCall.name)

                          // Capture email preview
                          if (currentToolCall.name === 'compose_email' && toolResult?.html && toolResult?.subjectLine) {
                            emailPreviewData = {
                              html: toolResult.html,
                              subjectLine: toolResult.subjectLine,
                              preview: toolResult.preview || stripHtml(toolResult.html).substring(0, 200) + '...'
                            }
                            console.log('[Alex] 📧 Captured email preview')
                        } else if (currentToolCall.name === 'create_email_sequence') {
                            if (toolResult?.emails && Array.isArray(toolResult.emails) && toolResult.emails.length > 0) {
                              const lastSuccessfulEmail = [...toolResult.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
                            if (lastSuccessfulEmail) {
                              emailPreviewData = {
                                html: lastSuccessfulEmail.html,
                                subjectLine: lastSuccessfulEmail.subjectLine,
                                preview: lastSuccessfulEmail.preview || stripHtml(lastSuccessfulEmail.html).substring(0, 200) + '...',
                                  sequenceName: toolResult.sequenceName,
                                  sequenceEmails: toolResult.emails,
                                isSequence: true
                              }
                                console.log('[Alex] 📧 Captured email sequence preview')
                              }
                            }
                          }
                        } catch (error: any) {
                          console.error('[Alex] ❌ Tool error:', error)
                          toolResult = { error: error.message || 'Tool execution failed' }
                        }
                      }

                      // Truncate large results
                      let toolResultContent = JSON.stringify(toolResult)
                      const MAX_TOOL_RESULT_SIZE = 100000
                        if (toolResultContent.length > MAX_TOOL_RESULT_SIZE) {
                        console.log(`[Alex] ⚠️ Tool result is large (${toolResultContent.length} chars), truncating...`)
                          const truncated = toolResultContent.substring(0, MAX_TOOL_RESULT_SIZE)
                        toolResultContent = truncated + '\n\n[Content truncated due to size limits.]'
                      }

                      // Add tool_use and tool_result to messages for next iteration
                      toolCalls.push({
                        id: currentToolCall.id,
                        name: currentToolCall.name,
                        input: toolInput,
                        result: toolResult
                      })

                    messages = [
                      ...messages,
                        {
                          role: 'assistant',
                          content: [{
                            type: 'tool_use',
                            id: currentToolCall.id,
                            name: currentToolCall.name,
                            input: toolInput
                          }]
                        },
                      {
                        role: 'user',
                        content: [{
                          type: 'tool_result',
                          tool_use_id: currentToolCall.id,
                            content: toolResultContent
                          }]
                        }
                      ]

                      console.log(`[Alex] ✅ Added tool result to messages (${toolResultContent.length} chars)`)
                      currentToolCall = null
                    } catch (error: any) {
                      console.error('[Alex] ❌ Tool parse error:', error)
                    currentToolCall = null
                  }
                  }

                  // Message stop
                  if (event.type === 'message_stop') {
                    messageComplete = true
                    console.log('[Alex] 📨 Message complete', {
                      toolCallsCount: toolCalls.length,
                      hasText: hasTextInThisIteration
                    })
                    break
                  }
                } catch (error) {
                  // Ignore parse errors
                }
              }
              
              if (messageComplete) break
            }

            // If no tools were called, we're done
            if (toolCalls.length === 0) {
              console.log('[Alex] ✅ Response complete (no tools)')
              break
            }

            console.log('[Alex] 🔄 Continuing with', toolCalls.length, 'tool results')
            // Reset for next iteration
              hasSentTextStart = false
          }

          // Send text-end event if we sent text-start
          if (hasSentTextStart) {
            const endMessage = {
              type: 'text-end',
              id: messageId
            }
            safeEnqueue(encoder.encode(`data: ${JSON.stringify(endMessage)}\n\n`))
          }

          // Save accumulated message to database
          if (accumulatedText && activeChatId) {
            try {
              console.log('[Alex] 💾 Saving assistant message:', {
                chatId: activeChatId,
                textLength: accumulatedText.length,
                hasEmailPreview: !!emailPreviewData,
                emailPreviewSubject: emailPreviewData?.subjectLine
              })
              await saveChatMessage(activeChatId, "assistant", accumulatedText, emailPreviewData)
              console.log('[Alex] ✅ Saved assistant message to chat')
            } catch (error) {
              console.error("[Alex] ❌ Error saving message:", error)
            }
          }
        } catch (error: any) {
          console.error('[Alex] ❌ Stream error:', error)
          if (!isClosed) {
            const errorMessage = {
              type: 'error',
              id: messageId,
              errorText: error.message || 'Stream error'
            }
            safeEnqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
          }
        } finally {
          safeClose()
          }
        },
      })
      
    return new Response(stream, {
        headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
          'X-Chat-Id': String(activeChatId),
      },
      })
  } catch (error: any) {
    console.error("[Alex] Admin agent chat error:", error)
    return NextResponse.json({ error: "Failed to process chat", details: error.message }, { status: 500 })
  }
}
