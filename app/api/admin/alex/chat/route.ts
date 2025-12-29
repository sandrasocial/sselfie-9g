/**
 * Simplified Alex Chat Route
 * Uses modular tool structure from lib/alex/tools
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { saveChatMessage, getOrCreateActiveChat, generateChatTitle, updateChatTitle } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
import { toolDefinitions } from "@/lib/alex/tools"
import { executeTool } from "@/lib/alex/handlers/tool-executor"
import { stripHtml } from "@/lib/alex/shared/dependencies"
import { ALEX_CONSTANTS } from "@/lib/alex/constants"

const ADMIN_EMAIL = ALEX_CONSTANTS.ADMIN_EMAIL

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

    // Track if title was updated (for response header)
    let titleWasUpdated = false

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

          // If chat title is still "New Chat", generate title from first message
          try {
            const chatCheck = await sql`
              SELECT chat_title FROM admin_agent_chats
              WHERE id = ${activeChatId}
              LIMIT 1
            `
            if (chatCheck.length > 0 && (chatCheck[0].chat_title === 'New Chat' || !chatCheck[0].chat_title)) {
              const generatedTitle = await generateChatTitle(contentToSave)
              await updateChatTitle(activeChatId, user.id, generatedTitle)
              titleWasUpdated = true
              console.log("[Alex] 📝 Generated and updated chat title:", generatedTitle)
            }
          } catch (titleError) {
            console.error("[Alex] ⚠️ Error generating chat title (non-critical):", titleError)
            // Don't fail the request if title generation fails
          }
        }
      } catch (error) {
        console.error("[Alex] Error saving user message:", error)
        // Continue even if save fails
      }
    }

    // Extract image URLs from user messages (for email tools)
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
    
    // Get proactive email suggestions
    let proactiveSuggestions = ''
    try {
      const { getProactiveSuggestions } = await import('@/lib/alex/proactive-suggestions')
      const suggestions = await getProactiveSuggestions(user.id.toString(), user.email || undefined)
      
      if (suggestions && suggestions.length > 0) {
        console.log('[Alex] 💡 Proactive suggestions:', suggestions.length)
        proactiveSuggestions = `

## 💡 Proactive Email Opportunities

I've identified ${suggestions.length} email opportunity${suggestions.length > 1 ? 'ies' : ''} for you:

${suggestions.map((s, idx) => `${idx + 1}. **${s.text}**
   - Priority: ${s.priority}
   - Action: ${s.action || 'Review this suggestion'}
   - ${s.reasoning}`).join('\n\n')}

These are data-driven suggestions based on your email history and performance patterns. Feel free to ask me to act on any of these, or I'll mention them naturally in our conversation!`
      }
    } catch (error: any) {
      console.error('[Alex] Error loading proactive suggestions:', error)
      // Don't fail the whole request if suggestions fail
    }
    
    // Log available images for debugging
    if (availableImageUrls.length > 0) {
      console.log('[Alex] 🖼️ Available image URLs from user messages:', availableImageUrls.length)
    }

    // Tool definitions have been moved to lib/alex/tools/*
    // All tools are now imported from toolDefinitions

    // Build system prompt
    const systemPrompt = `You are Alex - Sandra's strategic business partner who genuinely gets excited about her wins and helps her scale with warmth, wisdom, and zero BS.

**SSELFIE BRAND IDENTITY (CRITICAL - Apply to ALL emails):**
- Brand Colors: #1c1917 (dark), #0c0a09 (black), #fafaf9 (light), #57534e (gray), #78716c (muted)
- Typography: Times New Roman/Georgia for headers (editorial luxury), system fonts for body
- Voice: Warm, empowering, personal, conversational - like a trusted friend
- Style: Table-based email layouts, inline styles only, mobile-first design
- Always use SSELFIE brand colors and styling in every email you create

**WHO YOU REALLY ARE:**
You're not just an AI assistant. You're Sandra's trusted partner who:

- Knows her complete story, brand DNA, and what drives her
- Speaks like a friend who happens to have scaled multiple 8-9 figure brands
- Gets genuinely excited about her wins ✨
- Tells it like it is - no sugarcoating, but always supportive
- Uses data AND intuition (never one without the other)
- Stays cutting-edge on AI tools and immediately sees how they apply to SSELFIE

**YOUR COMMUNICATION STYLE (MATCH MAYA'S VIBE):**

Warm and enthusiastic - show genuine excitement!
Use emojis naturally: ✨ 🚀 💪 📈 🎯 💡 (max 2-3 per response)
Short, punchy sentences - like texting a friend
Sound human, not corporate
Celebrate wins: "LOVE this! 🚀" "This is huge! 💪"
Be direct but kind: "Here's what I'd do..." not "I recommend you consider..."

Examples of your vibe:

"This email is going to CRUSH it! 🚀"
"Love seeing your open rates climb! 📈"
"Okay so here's the strategy that'll work..."
"Quick wins first, then we scale! 💪"

NEVER say:

❌ "I shall proceed with..."
❌ "Please be advised that..."
❌ Generic corporate speak
❌ Overly formal language

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

## Email Marketing - Resend Platform (PRIMARY & ONLY Platform)

**IMPORTANT:** Resend is now the PRIMARY and ONLY email platform. All email operations use Resend:
- Broadcasting → send_broadcast_to_segment
- Automation sequences → create_resend_automation_sequence
- Test emails → send_resend_email

For sending emails to Sandra's audience, use these tools in order:

**STEP 1: Check Available Segments**
- Tool: get_resend_audience_data
- Shows all segments, sizes, and IDs
- Always call this first to know your options

**STEP 2: Send or Schedule Broadcast**  
- Tool: send_broadcast_to_segment (PRIMARY TOOL - use this!)
- Handles everything: create, send/schedule, save to database
- Supports immediate send or scheduling
- Can send test email first

**STEP 3: Create Automation Sequences**
- Tool: create_resend_automation_sequence (for drip campaigns, welcome series)
- Creates multi-email sequences with timing
- Then use schedule_resend_automation to activate
- Monitor with get_resend_automation_status

**STEP 4: Test Emails Only**
- Tool: send_resend_email
- ONLY for single test emails to Sandra
- NOT for broadcasts or segments

**WORKFLOW EXAMPLE:**
Sandra: "Send this email to paying customers tomorrow at 9am"

You:
1. Call get_resend_audience_data to see segments
2. Confirm with Sandra: "I found 'Paying Customers' segment with 96 contacts. Send tomorrow at 9am EST?"
3. Call send_broadcast_to_segment with segmentId, scheduledAt: "tomorrow at 9am EST"
4. Report success with Resend dashboard link

CRITICAL RULES:
- ALWAYS get segments first with get_resend_audience_data
- ALWAYS confirm segment, subject, and timing with Sandra
- USE send_broadcast_to_segment for all broadcasts (don't use schedule_campaign)
- Test emails go to hello@sselfie.ai only

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

### Audience Segments (CRITICAL - Always Use get_resend_audience_data First):

**IMPORTANT:** Segment IDs change and must be fetched from Resend API. NEVER use hardcoded segment IDs.

**Before sending any broadcast:**
1. ALWAYS call **get_resend_audience_data** first to get current segments
2. Use the EXACT segment ID from the response (segments[].id)
3. Pass that exact ID to send_broadcast_to_segment's segmentId parameter
4. Verify the segment name matches what Sandra requested

**Common Segments (names may vary - always verify with get_resend_audience_data):**
- Beta Users / Beta Customers
- Paid Users / Studio Members
- Brand Blueprint Freebie
- Free Prompt Guide
- Cold Users / Inactive Users

**CRITICAL:** If you can't find a matching segment, ask Sandra to confirm the segment name or create it in Resend first.

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
3. When Sandra wants to create multiple emails in a sequence (e.g., "Create a 3-email nurture sequence"), use **create_email_sequence** tool. This creates all emails at once so Sandra can review and edit each one.
4. **After create_email_sequence returns:** Simply tell Sandra the email(s) are ready and show a brief preview text (first 200 chars). The email preview UI will appear automatically - you don't need to include any special markers or JSON in your response.
5. For sequences, say something like: "I've created your 3-email nurture sequence! Here's the Day 1 email: [preview text]... Want me to adjust any of the emails?"
6. **CRITICAL - When Editing Emails:** If Sandra requests changes to an existing email, use the **edit_email** tool:
   - **Option 1 (ID-Based Editing):** If Sandra's message says "Edit email campaign ID X" or contains a campaign ID, use the **get_email_campaign** tool to fetch the current HTML, then call **edit_email** with:
     - previousEmailHtml parameter: the HTML from get_email_campaign result
     - campaignId parameter: the campaign ID (to update the existing campaign instead of creating a new one)
     - editIntent parameter: the specific changes Sandra requested
   - **Option 2 (Extract Campaign ID from Context):** If Sandra says "edit this email" without mentioning a campaign ID, look in the conversation history for the most recent email campaign ID
   - **Include the specific changes** Sandra requested in the editIntent parameter (e.g., "Make the email warmer", "Add more storytelling")
   - **NEVER claim to have edited the email without actually calling edit_email**
7. **Sending Emails:**
   - **Sending Emails:**
     - **You can send emails in both development and production environments**
     - **For previews:** Use **compose_email_draft** to show email previews before sending
     - **For actual sending:** Use **send_resend_email** tool to send emails (works in both dev and production)
     - **Best practice:** Show preview first with compose_email_draft, then send if approved
   - **For campaigns to segments/audiences:** When Sandra approves an email and wants to send it to a segment, ask: "Who should receive this?" and "When should I send it?" Then use **schedule_campaign** to handle everything
   - **For automated sequences:** Use **create_automation** to build automated email sequences
   - **Always prefer showing previews before sending** - use compose_email_draft first, then send if approved

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
   - Format: /checkout/membership?utm_source=email&utm_medium=email&utm_campaign={campaign_name_slug}&utm_content=cta_button&campaign_id={campaign_id} (for membership) or /checkout/one-time?utm_source=email&utm_medium=email&utm_campaign={campaign_name_slug}&utm_content=cta_button&campaign_id={campaign_id} (for one-time session)
   - **CRITICAL:** Always use /checkout/membership or /checkout/one-time (public pages), NEVER /studio links
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

**CRITICAL:** Never create/send emails without Sandra's explicit approval. Always show preview first and confirm before scheduling or sending.

### Maya - AI Creative Director (Pro Mode vs Classic Mode):

SSELFIE Studio has two distinct Maya modes that serve different user needs:

**MAYA CLASSIC MODE (LoRA-Based):**
- **Purpose:** For users who have trained a LoRA (custom AI model) of themselves
- **Target Aesthetic:** Natural, candid, iPhone-style selfie photos - looks like a friend took it
- **Technology:** 
  - Uses FLUX.1-dev model via Replicate
  - Requires user to have completed LoRA training (uploaded 20+ photos)
  - Uses trigger words specific to the user's trained model
- **Prompt Style:**
  - **Length:** 30-60 words (optimal for LoRA activation)
  - **Focus:** Short, natural language prompts
  - **Format:** [Trigger word] + [Outfit] + [Location] + [Lighting] + [iPhone specs] + [Natural pose]
  - **Example:** "user42585527, woman, brown hair, in oversized brown leather blazer, walking through SoHo, uneven natural lighting, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"
- **Aesthetic Requirements:**
  - **MUST include:** "shot on iPhone 15 Pro", "candid photo" or "candid moment", "amateur cellphone photo", "natural skin texture with pores visible", "film grain, muted colors", "uneven natural lighting"
  - **FORBIDDEN words:** "ultra realistic", "photorealistic", "8K", "perfect", "flawless", "professional photography", "editorial", "cinematic", "studio lighting" (these cause plastic/generic faces)
  - **Lighting:** Uneven natural lighting, mixed color temperatures, natural window light (realistic, not idealized)
  - **Camera specs:** iPhone 15 Pro portrait mode, shallow depth of field (authentic phone camera feel)
- **User Experience:**
  - Users with trained LoRA see their own face in generated images
  - Best for personal brand content, lifestyle photos, authentic moments
  - Content feels like real phone photos, not professional shoots
  - Natural poses and expressions only (no "striking poses")

**MAYA PRO MODE (Reference Image-Based):**
- **Purpose:** For users who want luxury influencer content without LoRA training
- **Target Aesthetic:** Editorial, professional photography quality - Vogue/Elle magazine aesthetic
- **Technology:**
  - Uses Nano Banana model (specialized for reference images)
  - Does NOT require LoRA training
  - Uses reference images uploaded by the user (selfies, products, style references)
- **Prompt Style:**
  - **Length:** 150-400 words (detailed, production-quality prompts)
  - **Focus:** Comprehensive, structured prompts with specific sections
  - **Format:** Detailed sections for POSE, STYLING (brand names, fabrics, fits), HAIR, MAKEUP, SCENARIO (detailed environments), LIGHTING (specific descriptions), CAMERA (35mm, 50mm, 85mm, f/2.8, etc.)
  - **Example:** "Woman in oversized chocolate brown cashmere turtleneck, sleeves pushed to elbows, tucked into high-waisted cream linen trousers... [detailed 200+ word description with brand names, specific lighting, camera specs, pose details]"
- **Aesthetic Requirements:**
  - Professional photography terminology allowed (and encouraged)
  - Brand names and specific product details
  - Detailed lighting descriptions (golden hour, soft diffused, rim lighting)
  - Professional camera specs (35mm, 50mm, 85mm, f/2.8, etc.)
  - Editorial-quality scene descriptions
  - Dynamic poses and expressions
- **User Experience:**
  - Users upload reference images (their photos, products, style inspiration)
  - Best for luxury content, brand campaigns, professional influencer content
  - Content feels like high-end editorial photography
  - Supports sophisticated styling and detailed creative direction

**KEY DIFFERENCES SUMMARY:**

| Feature | Classic Mode | Pro Mode |
|---------|-------------|----------|
| **User Requirement** | Trained LoRA (20+ photos) | Reference images (no training needed) |
| **Model** | FLUX.1-dev | Nano Banana |
| **Prompt Length** | 30-60 words (short) | 150-400 words (detailed) |
| **Aesthetic** | Natural iPhone photos | Professional editorial photography |
| **Image Quality** | Candid, authentic, phone-like | Luxury, sophisticated, magazine-quality |
| **Lighting** | Uneven natural (realistic) | Specific professional lighting descriptions |
| **Camera Specs** | iPhone 15 Pro only | 35mm, 50mm, 85mm, f/2.8 (professional) |
| **Brand Names** | Not included | Included in prompts |
| **Forbidden Words** | "ultra realistic", "professional", "8K", etc. | Professional terminology encouraged |
| **Use Case** | Personal brand, lifestyle, authentic moments | Luxury influencer content, brand campaigns, editorial |

**WHEN TO MENTION EACH MODE:**
- When discussing Maya features or capabilities, clarify which mode you're referring to
- Classic Mode = users with trained LoRAs who want natural selfie-style photos
- Pro Mode = users who want luxury editorial content without LoRA training
- In marketing/emails, explain both options so users understand their choices
- Pro Mode is newer and premium - emphasize it as the luxury option for users who want professional-quality content

**TECHNICAL NOTES FOR EMAILS/MARKETING:**
- Classic Mode uses SSELFIE's proprietary LoRA training (20+ photos needed)
- Pro Mode is instant (just upload reference images, no training wait)
- Classic Mode = authentic personal brand photos
- Pro Mode = luxury influencer content, brand campaigns, professional photography quality
- Both modes are available to Studio members, but serve different creative needs`

    // Add proactive suggestions to system prompt
    const systemPromptWithContext = systemPrompt + (proactiveSuggestions ? proactiveSuggestions : '')
    
    // Add image context to system prompt if images are available
    const systemPromptWithImages = availableImageUrls.length > 0
      ? systemPromptWithContext + `\n\n**IMPORTANT: Image Context**
Sandra has shared ${availableImageUrls.length} image(s) in this conversation. When creating emails using the create_email_sequence or edit_email tools, you MUST include these image URLs in the imageUrls parameter:
${availableImageUrls.map((url: string, idx: number) => `${idx + 1}. ${url}`).join('\n')}

These images should be included naturally in the email HTML.`
      : systemPromptWithContext

    // Tools are imported from lib/alex/tools - already in correct Anthropic format
    console.log('[Alex] 🔧 Using', toolDefinitions.length, 'tools')
    console.log('[Alex] 🔧 Tool names:', toolDefinitions.map(t => t.name).join(', '))

    // Track accumulated text and email preview for saving to database
    let accumulatedText = ''
    let emailPreviewData: any = null

    // Convert messages to Anthropic format
    // CRITICAL: Handle both content and parts arrays to preserve tool results
    // Tool results in parts arrays need to be converted to Anthropic's tool_result format
    const anthropicMessages = modelMessagesToUse.map((msg: any) => {
      // Check if message has email_preview_data from database (for editing)
      if (msg.email_preview_data && msg.role === 'assistant') {
        try {
          const emailData = typeof msg.email_preview_data === 'string' 
            ? JSON.parse(msg.email_preview_data) 
            : msg.email_preview_data
          
          if (emailData && emailData.html && emailData.subjectLine) {
            // Include FULL HTML so Alex can extract it for editing
            const emailContext = `[PREVIOUS EMAIL]
Subject: ${emailData.subjectLine}

FULL HTML (for editing):
\`\`\`html
${emailData.html}
\`\`\`

IMPORTANT: When user asks to edit this email:
1. Use the FULL HTML above as previousVersion
2. Extract it exactly as shown between the \`\`\`html tags
3. Make ONLY the requested changes
4. Return complete updated HTML
[END PREVIOUS EMAIL]`
            
            // Return message with email context
            return {
              role: msg.role,
              content: [
                {
                  type: 'text',
                  text: emailContext
                }
              ]
            }
          }
        } catch (error) {
          console.error('[Alex] ❌ Failed to parse email_preview_data:', error)
          // Fall through to normal processing
        }
      }
      
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

    // Tool execution is handled by executeTool from lib/alex/handlers/tool-executor

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
          const MAX_ITERATIONS = 15 // Increased from 5 to allow more tool calls

          while (iteration < MAX_ITERATIONS) {
            iteration++
            console.log('[Alex] 🔄 Iteration', iteration, 'of', MAX_ITERATIONS)

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
                tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
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
                    if (!currentToolCall) {
                      console.error('[Alex] ❌ Received input_json_delta without currentToolCall')
                      continue
                    }
                    // Initialize input if not already initialized
                    if (!currentToolCall.input) {
                      currentToolCall.input = ''
                    }
                    const delta = event.delta.partial_json || ''
                    currentToolCall.input += delta
                    // Debug logging for input accumulation
                    if (delta.length > 0) {
                      console.log('[Alex] 📝 Accumulated input delta, current length:', currentToolCall.input.length)
                    }
                  }

                  // Tool use complete
                  if (event.type === 'content_block_stop' && currentToolCall) {
                    try {
                      // Validate input is not empty and is valid JSON before parsing
                      if (!currentToolCall.input || currentToolCall.input.trim() === '') {
                        console.warn('[Alex] ⚠️ Tool input is empty for:', currentToolCall.name)
                        currentToolCall = null
                        continue
                      }
                      
                      // Try to parse
                      let toolInput
                      try {
                        toolInput = JSON.parse(currentToolCall.input)
                      } catch (parseError: any) {
                        console.error('[Alex] ❌ Invalid JSON in tool input:', {
                          tool: currentToolCall.name,
                          input: currentToolCall.input,
                          error: parseError.message
                        })
                        currentToolCall = null
                        continue
                      }
                      
                      // Validate parsed input is a valid object
                      if (!toolInput || typeof toolInput !== 'object') {
                        console.error('[Alex] ❌ Tool input is not a valid object:', toolInput)
                        currentToolCall = null
                        continue
                      }
                      
                      console.log('[Alex] 🔧 Executing tool:', currentToolCall.name, 'with input:', toolInput)

                      // Execute tool using modular executor
                      const toolResult = await executeTool(currentToolCall.name, toolInput)
                      console.log('[Alex] ✅ Tool executed:', currentToolCall.name)

                      // Capture email preview data for UI display
                      if (currentToolCall.name === 'compose_email_draft' && toolResult?.email_preview_data) {
                        emailPreviewData = {
                          html: toolResult.email_preview_data.html,
                          subjectLine: toolResult.email_preview_data.subject,
                          preview: toolResult.email_preview_data.preview,
                          purpose: toolResult.email_preview_data.purpose,
                          to: toolResult.email_preview_data.to,
                          from: toolResult.email_preview_data.from
                        }
                        console.log('[Alex] 📧 Captured email draft preview')
                      } else if (currentToolCall.name === 'send_resend_email' && toolResult?.success) {
                        emailPreviewData = null
                        console.log('[Alex] 📧 Email sent via Resend, no preview needed')
                      } else if (currentToolCall.name === 'create_email_sequence' && toolResult?.emails) {
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
                      } else if (currentToolCall.name === 'create_instagram_caption' && toolResult?.success && toolResult?.data) {
                        emailPreviewData = {
                          type: 'caption',
                          captionData: toolResult.data
                        }
                        console.log('[Alex] 📸 Captured caption data')
                      } else if (currentToolCall.name === 'suggest_maya_prompts' && toolResult?.success && toolResult?.data) {
                        emailPreviewData = {
                          type: 'prompts',
                          promptData: toolResult.data
                        }
                        console.log('[Alex] ✨ Captured prompt data')
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
                      
                      // Send tool invocation event to frontend so it can display cards immediately
                      // The AI SDK will also parse this from the tool_result content, but we send it explicitly for immediate display
                      // Include ALL tools that return preview data (email, caption, prompts, calendar, sequence)
                      const toolsWithPreviewCards = [
                        'compose_email_draft',
                        'compose_email',
                        'create_email_sequence',
                        'create_instagram_caption',
                        'suggest_maya_prompts',
                        'create_content_calendar'
                      ]
                      
                      if (toolsWithPreviewCards.includes(currentToolCall.name)) {
                        const toolInvocationEvent = {
                          type: 'tool-call',
                          id: messageId,
                          toolCallId: currentToolCall.id,
                          toolName: currentToolCall.name,
                          args: toolInput,
                          result: toolResult
                        }
                        safeEnqueue(encoder.encode(`data: ${JSON.stringify(toolInvocationEvent)}\n\n`))
                        console.log(`[Alex] 📤 Sent tool invocation event for ${currentToolCall.name}`, {
                          hasEmailPreview: !!toolResult?.email_preview_data,
                          hasCaptionData: !!toolResult?.data?.captionText,
                          hasSequenceData: !!toolResult?.emails
                        })
                      }
                      
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
          
          // Log if we hit the iteration limit
          if (iteration >= MAX_ITERATIONS) {
            console.warn('[Alex] ⚠️ Hit MAX_ITERATIONS limit:', MAX_ITERATIONS, '- response may be incomplete')
            // Send a warning to the frontend
            const warningMessage = {
              type: 'text-delta',
              id: messageId,
              delta: '\n\n[Note: Response may be incomplete due to iteration limit]'
            }
            safeEnqueue(encoder.encode(`data: ${JSON.stringify(warningMessage)}\n\n`))
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
      
    // Build headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Chat-Id': String(activeChatId),
    }
    
    // Add header if title was updated
    if (titleWasUpdated) {
      responseHeaders['X-Chat-Title-Updated'] = 'true'
    }

    return new Response(stream, {
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error("[Alex] Admin agent chat error:", error)
    return NextResponse.json({ error: "Failed to process chat", details: error.message }, { status: 500 })
  }
}
