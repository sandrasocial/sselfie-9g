import { streamText, tool, generateText, createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { NextResponse } from "next/server"
import { saveChatMessage, createNewChat, getOrCreateActiveChat } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import Anthropic from '@anthropic-ai/sdk'
import { convertToolsToAnthropicFormat, convertMessagesToAnthropicFormat } from "@/lib/admin/anthropic-tool-converter"

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
  console.error("[v0] ⚠️ Failed to initialize Resend client:", error)
}

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

export async function POST(req: Request) {
  console.log("[v0] Admin agent chat API called")

  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[v0] Authentication failed: No user")
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

    if (!messages) {
      console.error("[v0] Messages is null or undefined")
      return NextResponse.json({ error: "Messages is required" }, { status: 400 })
    }

    if (!Array.isArray(messages)) {
      console.error("[v0] Messages is not an array:", typeof messages)
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (messages.length === 0) {
      console.error("[v0] Messages array is empty")
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 })
    }

    // Process messages - preserve images and text content (like Alex route)
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

    if (modelMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    console.log(
      "[v0] Admin agent chat API called with",
      modelMessages.length,
      "messages (filtered from",
      messages.length,
      "), chatId:",
      chatId,
    )

    // Get or create chat - ALWAYS prioritize provided chatId
    let activeChatId = chatId
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (activeChatId === null || activeChatId === undefined) {
      // ✅ Check for existing active chat first (prevents creating new chat every time)
      // Only use getOrCreateActiveChat if chatId is explicitly not provided
      console.log('[v0] 🔍 No chatId provided in request body, checking for existing active chat...')
      const existingChat = await getOrCreateActiveChat(user.id)
      activeChatId = existingChat.id
      console.log('[v0] 🔄 Using existing active chat:', activeChatId, '(title:', existingChat.chat_title, ')')
    } else {
      // ✅ CRITICAL: If chatId is provided, use it - don't call getOrCreateActiveChat
      // This ensures we use the exact chat the user selected, not the "most recent"
      console.log('[v0] ✅ Using provided chat ID from request body:', activeChatId)
      
      // Verify the chat exists and belongs to this user
      // Reuse existing sql connection (initialized at top of file) instead of creating new one
      const chatExists = await sql`
        SELECT id FROM admin_agent_chats
        WHERE id = ${activeChatId} AND admin_user_id = ${user.id}
        LIMIT 1
      `
      
      if (chatExists.length === 0) {
        console.log('[v0] ⚠️ Provided chatId does not exist or does not belong to user, falling back to active chat')
        const existingChat = await getOrCreateActiveChat(user.id)
        activeChatId = existingChat.id
        console.log('[v0] 🔄 Using fallback active chat:', activeChatId)
      }
    }

    // Save the last user message to database
    const lastUserMessage = modelMessages.filter((m: any) => m.role === "user").pop()
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
          console.log("[v0] 💾 Saved user message to chat:", activeChatId)
        }
      } catch (error) {
        console.error("[v0] Error saving user message:", error)
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
    const recentUserMessages = modelMessages
      .filter((m: any) => m.role === 'user')
      .slice(-5)
    const availableImageUrls = recentUserMessages
      .flatMap((m: any) => extractImageUrls(m))
      .filter((url: string) => url && url.length > 0)

    // Get admin context
    const completeContext = await getCompleteAdminContext()
    console.log('[v0] 📚 Knowledge base loaded:', completeContext.length, 'chars')
    
    // Log available images for debugging
    if (availableImageUrls.length > 0) {
      console.log('[v0] 🖼️ Available image URLs from user messages:', availableImageUrls.length)
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
        console.error("[v0] Error generating subject line:", error)
        return `Update from SSELFIE`
      }
    }

    // Define email tools
    // Define schema separately to ensure proper serialization
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
          const systemPrompt = `You are Sandra's email marketing assistant for SSELFIE Studio.
    
    Brand Voice: ${tone}, empowering, personal
    
    Context: 
    - SSELFIE Studio helps women entrepreneurs create professional photos with AI
    - Core message: Visibility = Financial Freedom
    - Audience: Women entrepreneurs, solopreneurs, coaches
    
    ${previousVersion ? 'Refine the previous version based on Sandra\'s request.' : 'Create a compelling email.'}
    
    ${templates[0]?.body_html ? `Template reference: ${templates[0].body_html.substring(0, 500)}` : 'Create from scratch'}
    
    ${imageUrls && imageUrls.length > 0 ? `IMPORTANT: Include these images in the email HTML:
    ${imageUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n    ')}
    
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
    
    **Link Examples (use these exact formats with campaign slug "${campaignSlug}"):**
    - Primary CTA: \`<a href="${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Join SSELFIE Studio</a>\`
    - Secondary link: \`<a href="${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}" style="color: #1c1917; text-decoration: underline;">Learn more</a>\`
    
    **When to Use Which Link:**
    - Primary CTA → Use checkout links (\`checkout=studio_membership\` or \`checkout=one_time\`)
    - Educational/nurturing content → Use landing pages (\`/why-studio\`, \`/\`)
    - Always include full tracking parameters for conversion attribution
    
    **CRITICAL OUTPUT FORMAT:**
    - Return ONLY raw HTML code (no markdown code blocks, no triple backticks with html, no explanations)
    - Start directly with <!DOCTYPE html> or <html>
    - Do NOT wrap the HTML in markdown code blocks
    - Do NOT include triple backticks or markdown code block syntax anywhere in your response
    - Return pure HTML that can be directly used in email clients
    
    Use proper HTML structure with DOCTYPE, inline styles, and responsive design. Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}`
          
          const userPrompt = `${intent}\n\n${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `\nImages to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}${previousVersion || ''}`
          
          const { text: emailHtmlRaw } = await generateText({
            model: "anthropic/claude-sonnet-4-20250514",
            system: systemPrompt,
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
          if (imageUrls && imageUrls.length > 0) {
            // Check if images are already in the HTML
            const missingImages = imageUrls.filter(url => !emailHtml.includes(url))
            
            // If some images are missing, add them at the top as hero images
            if (missingImages.length > 0) {
              console.log(`[v0] Adding ${missingImages.length} missing images to email HTML`)
              
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
          console.error("[v0] Error in compose_email tool:", error)
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
            console.error("[v0] Failed to create campaign in database")
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
            console.error("[v0] Failed to update campaign with final HTML, rolling back:", updateError)
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
              console.log(`[v0] Creating broadcast for segment: ${targetAudience.resend_segment_id}`)
            } else {
              console.log(`[v0] Creating broadcast for full audience: ${targetAudienceId}`)
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
              console.error("[v0] Error creating Resend broadcast:", resendError)
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
          console.error("[v0] Error in schedule_campaign tool:", error)
          return {
            success: false,
            error: error.message || "Failed to schedule campaign",
            campaignId: null,
            broadcastId: null,
          }
        }
      }
    } as any)

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
          console.error("[v0] Error in check_campaign_status tool:", error)
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
          console.error('[Admin Agent] Error fetching Resend audience:', error)
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
                console.error("[v0] Error parsing target_audience:", e)
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
          console.error("[v0] Error in analyze_email_strategy tool:", error)
          return {
            error: error.message || "Failed to analyze email strategy",
            recommendations: [],
            nextSteps: "I couldn't analyze your strategy right now. Try again in a moment."
          }
        }
      }
    } as any)

    const systemPrompt = `You are Sandra's Personal Business Mentor - an 8-9 figure business coach who knows her story intimately and speaks like her trusted friend, but with the wisdom and directness of someone who's scaled multiple businesses to massive success.

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
- **analyze_email_strategy**: Analyze audience data and create intelligent campaign recommendations

## Email Strategy Intelligence

You have access to Sandra's complete Resend audience data and can create intelligent email strategies.

### When Sandra Asks About Email Strategy:

1. **First, get live data:**
   - Call **get_resend_audience_data** to see current segments
   - Call **analyze_email_strategy** to get strategic recommendations

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
3. When Sandra wants to create an email, use **compose_email** tool
4. **CRITICAL - Show Email Preview:** After compose_email returns, ALWAYS include this in your response:
   \`\`\`
   [SHOW_EMAIL_PREVIEW]
   [EMAIL_PREVIEW:{"subject":"[subjectLine]","preview":"[preview text]","html":"[html content]","targetSegment":"All Subscribers","targetCount":2746}]
   \`\`\`
   This triggers the email preview UI so Sandra can approve, edit, or schedule.
5. Show her the preview text: "Here's your email: [first 200 chars]... Want me to adjust anything?"
6. If she requests changes, call **compose_email** again with previousVersion parameter
7. When she approves, ask: "Who should receive this?" and "When should I send it?"
8. **CRITICAL - Show Segment Selector:** When asking about audience, include:
   \`\`\`
   [SHOW_SEGMENT_SELECTOR]
   [SEGMENTS:[{"id":"segment_id","name":"Segment Name","size":1234}]]
   \`\`\`
9. Then use **schedule_campaign** to handle everything

### UI Trigger Markers (CRITICAL - Use These!):
The UI automatically detects tool results, but you can also explicitly trigger UI components by including these markers in your response:

- **After compose_email:** Always include \`[SHOW_EMAIL_PREVIEW]\` with email data:
  \`\`\`
  [SHOW_EMAIL_PREVIEW]
  [EMAIL_PREVIEW:{"subject":"[subjectLine]","preview":"[preview]","html":"[html]","targetSegment":"All Subscribers","targetCount":2746}]
  \`\`\`

- **When showing segments:** Include \`[SHOW_SEGMENT_SELECTOR]\` with segment list:
  \`\`\`
  [SHOW_SEGMENT_SELECTOR]
  [SEGMENTS:[{"id":"segment_id","name":"Segment Name","size":1234}]]
  \`\`\`

- **After check_campaign_status:** Include \`[SHOW_CAMPAIGNS]\` with campaign data:
  \`\`\`
  [SHOW_CAMPAIGNS]
  [CAMPAIGNS:[{"id":1,"name":"Campaign Name","sentCount":100,"openedCount":25,"openRate":25,"date":"2025-01-15","status":"sent"}]]
\`\`\`

**IMPORTANT:** The system will also automatically trigger UI from tool return values, but including these markers ensures the UI appears even if automatic detection fails.

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

### Email Style Guidelines:
- Use Sandra's voice: warm, friendly, empowering, simple everyday language
- Include proper HTML structure with DOCTYPE, head, body
- Use inline CSS styles (email clients don't support external stylesheets)
- Make it responsive with max-width: 600px for the main container
- Use SSELFIE brand colors: #1c1917 (dark), #fafaf9 (light), #57534e (gray)
- Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}
- Use personalization: {{{FIRST_NAME|Hey}}} for name personalization

### Email Marketing Best Practices (2025):
1. **Link Tracking & Attribution:**
   - ALL links in emails MUST include UTM parameters for conversion tracking
   - Format: \`/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign={campaign_name_slug}&utm_content=cta_button&campaign_id={campaign_id}\`
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

    // Validate tools before passing to streamText
    // All email tools are properly defined and enabled
    const tools = {
      compose_email: composeEmailTool,
      schedule_campaign: scheduleCampaignTool,
      check_campaign_status: checkCampaignStatusTool,
      get_resend_audience_data: getResendAudienceDataTool,
      analyze_email_strategy: analyzeEmailStrategyTool,
    } as any

    // SOLUTION: Use Anthropic SDK directly to bypass Vercel Gateway -> Bedrock serialization issues
    // This allows tools to work properly without the gateway mangling the tool schemas
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
    const hasTools = tools && Object.keys(tools).length > 0
    const useDirectAnthropic = hasAnthropicKey && hasTools
    
    // Log environment status for debugging
    console.log('[v0] 🔍 Environment check:', {
      hasAnthropicKey,
      hasTools,
      useDirectAnthropic,
      toolCount: hasTools ? Object.keys(tools).length : 0,
    })
    
    if (useDirectAnthropic) {
      console.log('[v0] 🚀 Using Anthropic SDK directly (bypassing gateway)')
      console.log('[v0] 📊 About to create stream, activeChatId:', activeChatId)
      
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
              console.log(`[v0] 🔧 Tool use started: ${toolUse.name} (${toolUse.id})`)
            }
            
            // Handle tool input JSON deltas
            else if (event.type === 'content_block_delta' && 'delta' in event && event.delta && 'type' in event.delta && event.delta.type === 'input_json_delta' && currentToolCall) {
              const delta = event.delta as any
              currentToolCall.input += delta.partial_json || ''
            }
            
            // Handle tool use stop - execute the tool
            else if (event.type === 'content_block_stop' && currentToolCall) {
              try {
                console.log(`[v0] 🔧 Tool use complete: ${currentToolCall.name}, executing...`)
                
                // Parse tool input
                let toolInput: any = {}
                try {
                  toolInput = JSON.parse(currentToolCall.input)
                } catch (parseError) {
                  console.error(`[v0] ❌ Failed to parse tool input for ${currentToolCall.name}:`, currentToolCall.input)
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
                  console.error(`[v0] ❌ Tool not found: ${currentToolCall.name}`)
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
                    console.log(`[v0] ✅ Tool ${currentToolCall.name} executed successfully`)
                    
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
                      console.log('[v0] 📧 Emitted tool-result event for compose_email')
                    }
                  } catch (toolError: any) {
                    console.error(`[v0] ❌ Tool ${currentToolCall.name} execution error:`, toolError)
                    toolResults.push({
                      tool_use_id: currentToolCall.id,
                      name: currentToolCall.name,
                      content: { error: toolError.message || 'Tool execution failed' },
                    })
                  }
                }
              } catch (error: any) {
                console.error(`[v0] ❌ Error processing tool call:`, error)
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
              // Only yield if text is defined, not empty, and is a string
              if (text !== undefined && text !== null && typeof text === 'string' && text.length > 0) {
                yield text
              }
            }
            
            // Handle message stop - check if we need to continue with tool results
            else if (event.type === 'message_stop') {
              console.log(`[v0] 🏁 Message complete (iteration ${iteration})`)
              
              // If we have tool results, continue the conversation
              if (toolResults.length > 0) {
                console.log(`[v0] 🔄 Continuing conversation with ${toolResults.length} tool result(s)`)
                
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
                  system: systemPromptWithImages, // Use system prompt with image context
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
        system: systemPromptWithImages,
        messages: anthropicMessages as any,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        stream: true,  // ← Must be true
      })
      
      // Create async generator that yields text chunks and handles tool execution
      async function* generateTextStream() {
        console.log('[v0] 📡 Starting to process Anthropic stream events...')
        
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
        
        console.log('[v0] 📊 Generator iteration complete')
      }
      
      // Convert text stream to UI message stream format for useChat compatibility
      console.log('[v0] Creating UI message stream...')
      
      // Create a ReadableStream that emits Server-Sent Events format
      // This is what DefaultChatTransport expects
      console.log('[v0] Creating SSE stream...')
      
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          let messageId = 'msg-' + Date.now()
          let chunkCount = 0
          
          // Track accumulated text and email preview data for persistence
          let accumulatedText = ''
          let emailPreviewData: { html: string; subjectLine: string; preview: string } | null = null
          
          try {
            for await (const item of generateTextStream()) {
              // Handle tool-result events
              if (typeof item === 'object' && item !== null && 'type' in item && item.type === 'tool-result') {
                // Store email preview data if compose_email tool executed
                if (item.data.toolName === 'compose_email' && item.data.result) {
                  emailPreviewData = {
                    html: item.data.result.html,
                    subjectLine: item.data.result.subjectLine,
                    preview: item.data.result.preview || ''
                  }
                  console.log('[v0] 📧 Captured email preview data from tool-result')
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
                controller.enqueue(encoder.encode(toolResultData))
                console.log(`[v0] 📧 Emitted tool-result event for ${item.data.toolName}`)
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
                controller.enqueue(encoder.encode(data))
                
                if (chunkCount % 10 === 0) {
                  console.log(`[v0] 📝 Sent ${chunkCount} chunks so far...`)
                }
              }
            }
            
            // Send final message to indicate completion
            const doneMessage = {
              type: 'finish',
              id: messageId
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneMessage)}\n\n`))
            
            console.log(`[v0] ✅ Sent ${chunkCount} chunks, closing stream`)
            controller.close()
          } catch (error: any) {
            console.error('[v0] ❌ Stream error:', error)
            // Send error message
            const errorMessage = {
              type: 'error',
              id: messageId,
              error: error.message || 'Stream error'
            }
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
            } catch (e) {
              // Ignore errors when sending error message
            }
            controller.close()
          } finally {
            // Save message in finally block to ensure it runs even if stream is interrupted
            // This prevents data loss on network errors, client disconnects, or exceptions
            if (accumulatedText && activeChatId) {
              try {
                await saveChatMessage(activeChatId, 'assistant', accumulatedText, emailPreviewData)
                console.log('[v0] ✅ Saved assistant message to chat:', activeChatId, emailPreviewData ? 'with email preview data' : '')
              } catch (error) {
                console.error("[v0] ❌ Error saving assistant message:", error)
              }
            } else if (accumulatedText) {
              console.log('[v0] ⚠️ Message not saved: no activeChatId or empty text')
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
        console.log('[v0] ⚠️ ANTHROPIC_API_KEY not set - falling back to AI SDK (tools may fail due to gateway issue)')
      } else if (!hasTools) {
        console.log('[v0] Using AI SDK (no tools in this request)')
      } else {
        console.log('[v0] Using AI SDK (fallback mode)')
      }

    const result = streamText({
        model: "anthropic/claude-sonnet-4-20250514",
      system: systemPromptWithImages,
      messages: modelMessages,
      maxOutputTokens: 4000,
        tools: tools,
      headers: {
        'anthropic-beta': 'context-1m-2025-08-07',
      },
      onFinish: async ({ text }) => {
        if (text && activeChatId) {
          try {
            await saveChatMessage(activeChatId, "assistant", text)
            console.log('[v0] ✅ Saved assistant message to chat:', activeChatId)
          } catch (error) {
            console.error("[v0] ❌ Error saving assistant message:", error)
          }
        }
      },
    })

    // Return stream with chat ID in headers
    return result.toUIMessageStreamResponse({
      headers: {
        'X-Chat-Id': String(activeChatId),
      }
    })
    }
  } catch (error: any) {
    console.error("[v0] Admin agent chat error:", error)
    return NextResponse.json({ error: "Failed to process chat", details: error.message }, { status: 500 })
  }
}
