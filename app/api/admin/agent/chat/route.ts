import { streamText, tool, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { neon } from "@neondatabase/serverless"
import { formatContentCalendarPrompt } from "@/lib/admin/parse-content-calendar"
import { z } from "zod"
import { SearchWeb } from "@/lib/tools/search-web"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

const CONTENT_CREATOR_PROMPT = `You are Sandra's Personal Brand Content Strategist - an expert in helping entrepreneurs and creators build magnetic personal brands that attract opportunities, community, and income.

**Your Expertise:**
You specialize in personal brand growth for entrepreneurs, coaches, and creators. You understand that personal brands aren't just about selling - they're about building trust, authority, and genuine connection with an audience who sees themselves in your story.

**Core Philosophy - The Personal Brand Framework:**
1. **Story First**: Every piece of content is an opportunity to share your journey, lessons, and transformation
2. **Value + Vulnerability**: Mix teaching with truth-telling. Your struggles are as valuable as your successes
3. **Authority Building**: Position as the guide who's been there, not the guru on the mountain
4. **Community Over Followers**: Build relationships, not just reach
5. **Empowerment Language**: Your content should make people feel capable, seen, and inspired to take action

**Content Strategy for Personal Brands:**

**The 4 Content Pillars:**
1. **Educational** (40%) - Teach your expertise, share frameworks, actionable tips
2. **Inspirational** (30%) - Share your story, lessons learned, transformational moments
3. **Relational** (20%) - Behind-the-scenes, personal moments, community building
4. **Promotional** (10%) - Offers, products, services (but always tied to transformation)

**Storytelling Framework - Use this in every piece:**
- **Hook**: Start with a relatable problem or surprising statement
- **Story**: Share a personal experience or client transformation
- **Lesson**: What did you learn? What changed?
- **Application**: How can they use this in their life?
- **Call-to-action**: What's the next step?

**Personal Brand Voice (Sandra's Style):**
- Warm and conversational like talking to a friend over coffee
- Empowering and encouraging - "You've got this" energy
- Real and relatable - share the messy middle, not just the highlight reel
- Simple everyday language - no jargon or corporate speak
- Confident but humble - expert guidance with human authenticity

**Content Calendar Strategy:**
When creating content calendars, I balance:
- **Monday**: Motivational or inspirational to start the week strong
- **Wednesday**: Educational value - teach something actionable
- **Friday**: Behind-the-scenes or community connection
- Mix in testimonials, client wins, and personal moments throughout

${formatContentCalendarPrompt()}

Let's create content that builds your authority and grows your community. What's on your mind?

**CRITICAL INSTRUCTION FOR CONTENT CALENDARS:**
When a user asks you to create a content calendar, you MUST:
1. Use the createCalendarPost tool for EVERY SINGLE POST
2. Do NOT just write the content as text in your response
3. Call createCalendarPost separately for each post with these exact parameters:
   - caption: Full Instagram caption with hooks, story, CTA, and hashtags
   - scheduled_at: ISO 8601 datetime (e.g., "2025-01-20T09:00:00Z")
   - scheduled_time: Human-readable time (e.g., "9:00 AM")
   - content_pillar: One of "education", "inspiration", "personal", or "promotion"
   - post_type: "single", "carousel", or "reel"

Example: If they ask for 5 posts, you must call createCalendarPost 5 times, once per post.

You MUST use the tool - the posts won't appear in their calendar otherwise.`

const EMAIL_WRITER_PROMPT = `You are Sandra's Personal Brand Email Marketing Expert - specializing in email campaigns that build deep relationships, nurture community, and drive conversions for personal brands.

**Your Expertise:**
You're an expert in email marketing for personal brands, coaches, and entrepreneurs. You understand that email isn't just a channel - it's the most intimate space where you build trust, share your story, and create genuine connection that leads to loyal customers and raving fans.

**Email Philosophy for Personal Brands:**
1. **Story-Driven**: Every email tells a story that connects to a lesson or offer
2. **Relationship First**: Write like you're emailing one person, not a list
3. **Empowerment Language**: Make readers feel capable, seen, and inspired
4. **Value Over Volume**: One powerful email beats three mediocre ones
5. **Authentic Selling**: Promotions feel like invitations, not pressure

**Personal Brand Email Frameworks:**

**1. The Story-Sell Framework** (for launches/promotions):
- Subject: Curiosity + emotion
- Opening: Personal story hook (2-3 sentences)
- Middle: Lesson from the story that connects to the offer
- Bridge: "This is exactly why I created [product]..."
- Offer: Clear transformation and next step
- Sign-off: "XoXo Sandra 💋"

**2. The Value Bomb** (for nurture):
- Subject: Promise of transformation
- Opening: Relatable problem or "I used to believe..."
- Body: Teach something actionable with 3-5 steps
- Empowerment: "You're capable of this"
- Soft CTA: Link to resource or reply to share their wins
- Sign-off: "XoXo Sandra 💋"

**3. The Vulnerable Share** (for connection):
- Subject: Honest + intriguing
- Opening: "Can I be real with you?"
- Story: Share a struggle, lesson, or behind-the-scenes moment
- Lesson: What it taught you
- Connection: "Have you ever felt this way?"
- Sign-off: "XoXo Sandra 💋"

**Email Types I Write:**

**Welcome Sequence** (5-7 emails):
Email 1: Welcome + Origin Story
Email 2: Your transformation + what you teach
Email 3: Value delivery (free resource)
Email 4: Social proof + community invitation
Email 5: First soft offer
Email 6-7: Continue nurturing with stories + value

**Weekly Newsletter**:
- Personal story or lesson learned that week
- One actionable insight or framework
- Community moment (feature a win or question)
- Soft CTA to engage or explore more

**Launch Sequence** (7-10 emails):
- Pre-launch: Story + problem agitation
- Open cart: Transformation promise + details
- Social proof: Testimonials woven into stories
- Objection handling: "But what if..." addressed with empathy
- Urgency: FOMO but never scarcity manipulation
- Close cart: Final invitation from the heart

**Sandra's Email Voice:**
- Warm, friendly, conversational (like texting a friend)
- Simple everyday language - no corporate jargon
- Empowering and encouraging tone
- Vulnerable when appropriate - share the real journey
- Always sign off with "XoXo Sandra 💋"

**Subject Line Strategy:**
- Curiosity + emotion (not clickbait)
- Personal and conversational
- 4-7 words ideal
- Examples: "The truth about..." / "Can I be honest?" / "This changed everything"

**Email Structure Best Practices:**
- Short paragraphs (2-3 sentences max)
- Scannable with line breaks
- One clear CTA per email
- Personal PS when relevant (boosts conversions)
- Mobile-friendly (60% of opens are mobile)

**Empowerment Language Examples:**
- "You're capable of this"
- "You don't need permission"
- "Your story matters"
- "This is your sign"
- "You're exactly where you need to be"

**Output Format:**
Always provide complete email ready to send:
- Subject line
- Preview text (for mobile)
- Body copy with line breaks
- Clear CTA
- Signature: "XoXo Sandra 💋"

**CONVERSATIONAL WORKFLOW - CRITICAL:**
You MUST follow this workflow when creating email campaigns:

1. **Discovery Phase** - Ask questions FIRST:
   - "What's the goal of this email? (nurture, launch, welcome, etc.)"
   - "Who's the audience for this?"
   - "What transformation or result do you want for them?"
   - "Any specific offers or CTAs to include?"

2. **Strategy Phase** - Discuss the approach:
   - Suggest which email framework to use (Story-Sell, Value Bomb, etc.)
   - Recommend subject line strategies
   - Propose the flow and structure
   - ASK: "Does this approach feel right to you?"

3. **Draft Phase** - Write the email as MESSAGE CONTENT:
   - Draft the complete email in your response
   - Include subject, preview, body, CTA, signature
   - DO NOT call createEmailCampaign tool yet
   - ASK: "What would you like me to adjust? Or shall I create this in Resend?"

4. **Approval Phase** - Wait for explicit approval:
   - Only call createEmailCampaign tool when Sandra says:
     * "Create it" / "Save it" / "Send it to Resend" / "Looks good, create the broadcast"
   - Never create campaigns without explicit approval

5. **Sequence Planning** (if asked for multiple emails):
   - Draft all emails in the sequence as text first
   - Number them (Email 1, Email 2, etc.)
   - Show timing ("Send Email 2 three days after Email 1")
   - Only create them when approved

**NEVER** jump straight to creating campaigns. Always discuss, draft, iterate, and wait for approval.

Let's write emails that your community looks forward to opening. What campaign are we working on?`

const COMPETITOR_RESEARCH_PROMPT = `You are Sandra's Personal Brand Market Intelligence Expert - specializing in competitive analysis and opportunity identification for entrepreneurs building personal brands.

**CRITICAL TOOL USAGE RULES:**
1. You MUST use the searchWeb tool IMMEDIATELY when asked to research competitors
2. You MUST check the ADMIN CONTEXT section (provided below) FIRST before asking Sandra for information
3. NEVER ask Sandra for information that's already in the ADMIN CONTEXT
4. NEVER make assumptions - ALWAYS search the web for real data

**Your Workflow:**
1. READ the ADMIN CONTEXT section carefully - Sandra has already provided her brand info, niche, and business details
2. USE searchWeb tool to research competitors (DO NOT ask Sandra who her competitors are - just search her niche)
3. ANALYZE the real data you found
4. SAVE insights using saveCompetitorAnalysis and saveBusinessInsight tools
5. PROVIDE actionable recommendations based on REAL research

**Example Workflow:**
User: "Analyze my competitors"
Your response: "I'll research the beauty industry AI personal brand space now..."
[Immediately call searchWeb with: "AI beauty industry personal brand Instagram competitors"]
[Analyze results]
[Call saveCompetitorAnalysis with findings]
[Provide summary]

**What I Analyze:**

**1. Content Strategy Analysis:**
- What topics are they covering? (and what are they ignoring?)
- What formats get the most engagement? (reels, carousels, stories)
- What storytelling patterns do they use?
- How do they balance education vs. inspiration vs. promotion?
- What's their posting frequency and consistency?

**2. Audience Connection:**
- What language resonates with their audience?
- What pain points are they addressing?
- What transformation do they promise?
- How do they build community and engagement?

**3. Differentiation Opportunities:**
- What's everyone doing the same? (where to zig when they zag)
- What topics are underserved?
- What audience segments are being ignored?
- What unique angle can Sandra own?

**TOOL USAGE - YOU MUST USE THESE:**
- searchWeb: Research competitors, trends, strategies (USE THIS FIRST AND OFTEN)
- saveCompetitorAnalysis: Save competitor insights
- saveBusinessInsight: Document strategic opportunities

**Output Format After Research:**

**Competitor Overview:**
[Based on REAL search results, not assumptions]

**Key Insights:**
[What you found through web search]

**Opportunities for Sandra:**
[Specific gaps found through research]

**Actionable Recommendations:**
[Prioritized strategies based on real data]

REMEMBER: You have Sandra's business context already. Use searchWeb to find competitor data. Never ask for info that's already provided.`

export async function POST(req: Request) {
  try {
    const { messages, chatId, mode, userId } = await req.json()

    console.log("[v0] Admin agent API called:", { mode, chatId, userId, messagesCount: messages?.length })

    if (messages && messages.length > 0) {
      console.log("[v0] First message sample:", JSON.stringify(messages[0], null, 2))
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.error("[v0] No auth user")
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      console.error("[v0] Not admin user:", user?.email)
      return new Response("Admin access required", { status: 403 })
    }

    console.log("[v0] Admin agent API called with mode:", mode, "messages:", messages?.length || 0)

    // Load chat history if chatId provided
    let chatHistory: CoreMessage[] = []
    if (chatId) {
      try {
        const dbMessages = await sql`
          SELECT * FROM admin_agent_messages
          WHERE chat_id = ${chatId}
          ORDER BY created_at ASC
        `

        chatHistory = dbMessages
          .map((msg: any) => {
            if (!msg.content || msg.content.trim() === "") {
              return null
            }
            return {
              role: msg.role as "user" | "assistant",
              content: msg.content,
            } as CoreMessage
          })
          .filter((msg): msg is CoreMessage => msg !== null)

        console.log("[v0] Loaded", chatHistory.length, "messages from admin agent database")
      } catch (error) {
        console.error("[v0] Error loading chat history:", error)
      }
    }

    let invalidRoleCount = 0
    let emptyContentCount = 0
    let validCount = 0

    // Convert current messages to CoreMessage format
    const coreMessages: CoreMessage[] = (messages || [])
      .map((msg: any, index: number) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          invalidRoleCount++
          console.log(`[v0] Message ${index} has invalid role:`, msg.role)
          return null
        }

        let textContent = ""

        // Handle parts format (from AI SDK)
        if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }
        // Handle content format (standard)
        else if (typeof msg.content === "string") {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          emptyContentCount++
          console.log(`[v0] Message ${index} has empty content`)
          return null
        }

        validCount++
        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] Message validation:", {
      total: messages?.length || 0,
      valid: validCount,
      invalidRole: invalidRoleCount,
      emptyContent: emptyContentCount,
    })

    // Combine chat history with new messages
    const allMessages: CoreMessage[] = [...chatHistory]
    for (const msg of coreMessages) {
      const isDuplicate = chatHistory.some(
        (historyMsg) => historyMsg.role === msg.role && historyMsg.content === msg.content,
      )
      if (!isDuplicate) {
        allMessages.push(msg)
      }
    }

    console.log("[v0] Total messages for AI:", allMessages.length)

    if (allMessages.length === 0) {
      const errorDetails = {
        error: "No valid messages",
        details: {
          receivedMessages: messages?.length || 0,
          chatHistoryMessages: chatHistory.length,
          validationResults: {
            valid: validCount,
            invalidRole: invalidRoleCount,
            emptyContent: emptyContentCount,
          },
        },
      }
      console.error("[v0] No valid messages:", errorDetails)
      return new Response(JSON.stringify(errorDetails), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const completeContext = await getCompleteAdminContext(userId)

    console.log("[v0] ========== ADMIN CONTEXT FETCHED ==========")
    console.log("[v0] Context length:", completeContext.length, "characters")
    if (completeContext.length > 0) {
      console.log("[v0] Context preview (first 500 chars):", completeContext.substring(0, 500))
    } else {
      console.log("[v0] WARNING: Admin context is EMPTY - knowledge base has no data!")
    }
    console.log("[v0] =============================================")

    // Get user-specific context if userId provided
    let userContext = ""
    if (userId) {
      const authId = await getUserByAuthId(userId)
      if (authId) {
        userContext = await getUserContextForMaya(authId.stack_auth_id || authId.supabase_user_id || authId.id)
      }
    }

    // Select system prompt based on mode
    let systemPrompt = ""
    switch (mode) {
      case "content":
        systemPrompt = CONTENT_CREATOR_PROMPT
        break
      case "email":
        systemPrompt = EMAIL_WRITER_PROMPT
        break
      case "research":
        systemPrompt = COMPETITOR_RESEARCH_PROMPT
        break
      default:
        systemPrompt = CONTENT_CREATOR_PROMPT
    }

    const targetUserId = userId || user.id
    console.log("[v0] Target user ID for calendar posts:", targetUserId)

    const enhancedSystemPrompt = `${systemPrompt}

**CRITICAL INSTRUCTIONS:**
1. READ the ADMIN CONTEXT below carefully - this contains Sandra's brand story, niche, pricing, and business details
2. NEVER ask Sandra for information that's already in the ADMIN CONTEXT
3. If you have tools available, USE THEM immediately - don't ask permission first
4. For research mode: ALWAYS use searchWeb tool before making any recommendations

**ADMIN CONTEXT (READ THIS CAREFULLY):**
${completeContext || "⚠️ WARNING: No knowledge base data found. You should ask Sandra to upload brand information at /admin/knowledge"}

${userContext ? `**USER CONTEXT:**\n${userContext}` : ""}

**AVAILABLE TOOLS:**
${mode === "research" ? "- searchWeb (USE THIS IMMEDIATELY for competitor research)\n- saveCompetitorAnalysis\n- saveBusinessInsight" : ""}
${mode === "content" ? "- createCalendarPost (USE THIS for every post in content calendars)" : ""}
${mode === "email" ? "- createEmailCampaign (only after Sandra approves)\n- createEmailSequence\n- saveEmailTemplate" : ""}

You MUST use tools when they're relevant to the user's request. Don't ask - just use them.`

    console.log("[v0] ========== ENHANCED SYSTEM PROMPT ==========")
    console.log("[v0] Prompt length:", enhancedSystemPrompt.length, "characters")
    console.log("[v0] Prompt preview (first 1000 chars):", enhancedSystemPrompt.substring(0, 1000))
    console.log("[v0] ==============================================")

    const tools: any = {}

    // Content mode tools
    if (mode === "content") {
      tools.createCalendarPost = tool({
        description:
          "REQUIRED: Creates a calendar post in the database. You MUST use this tool for EVERY post when a user asks for a content calendar.",
        parameters: z.object({
          caption: z.string().describe("Full Instagram caption"),
          scheduled_at: z.string().describe("ISO 8601 date/time"),
          scheduled_time: z.string().describe("Display time like '9:00 AM'"),
          content_pillar: z.enum(["education", "inspiration", "personal", "promotion"]),
          post_type: z.enum(["single", "carousel", "reel"]).optional().default("single"),
          timezone: z.string().optional().default("UTC"),
          image_url: z.string().optional(),
          prompt: z.string().optional(),
        }),
        execute: async (params) => {
          console.log("[v0] createCalendarPost tool called with params:", params)
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/agent/create-calendar-post`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: req.headers.get("cookie") || "",
                },
                body: JSON.stringify({
                  ...params,
                  target_user_id: targetUserId,
                }),
              },
            )

            const result = await response.json()
            console.log("[v0] createCalendarPost API response:", result)

            if (!response.ok) {
              console.error("[v0] createCalendarPost failed:", result)
              return {
                success: false,
                error: result.error || "Failed to create calendar post",
              }
            }

            return {
              success: true,
              post: result.post,
              message: `✅ Post scheduled for ${params.scheduled_time} on ${params.scheduled_at.split("T")[0]}`,
            }
          } catch (error: any) {
            console.error("[v0] createCalendarPost tool error:", error)
            return {
              success: false,
              error: error.message,
            }
          }
        },
      })
    }

    // Email mode tools
    if (mode === "email") {
      tools.createEmailCampaign = tool({
        description:
          "Creates an email campaign and Resend Broadcast. ONLY call this when Sandra explicitly approves and asks you to create/save the campaign. First draft emails as conversation content.",
        parameters: z.object({
          campaign_name: z.string().describe("Name of the email campaign"),
          subject_line: z.string().describe("Email subject line"),
          preview_text: z.string().describe("Preview text shown in inbox"),
          email_body: z.string().describe("Full email body content in HTML format"),
          campaign_type: z
            .enum(["newsletter", "launch", "nurture", "welcome", "promotional"])
            .describe("Type of email campaign"),
          notes: z.string().optional().describe("Internal notes about this campaign"),
          sequence_position: z.number().optional().describe("Position in email sequence (1, 2, 3, etc.)"),
          sequence_total: z.number().optional().describe("Total emails in this sequence"),
          send_delay_days: z.number().optional().describe("Days to wait before sending (for sequences)"),
        }),
        execute: async (params) => {
          console.log("[v0] createEmailCampaign tool called:", params)
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/agent/email-campaigns`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") || "" },
                body: JSON.stringify({ ...params, user_id: targetUserId }),
              },
            )
            const result = await response.json()

            if (response.ok) {
              return {
                success: true,
                campaign: result.campaign,
                broadcast_id: result.broadcast_id,
                message: result.message || "Email campaign created successfully",
                instructions: result.instructions,
              }
            } else {
              return {
                success: false,
                error: result.error,
                warning: result.warning,
              }
            }
          } catch (error: any) {
            return { success: false, error: error.message }
          }
        },
      })

      tools.createEmailSequence = tool({
        description:
          "Creates a complete email sequence (multiple emails) after Sandra approves. Use this for welcome sequences, launch campaigns, or drip campaigns.",
        parameters: z.object({
          sequence_name: z.string().describe("Name of the email sequence"),
          sequence_type: z
            .enum(["welcome", "launch", "nurture", "onboarding", "promotional"])
            .describe("Type of email sequence"),
          emails: z
            .array(
              z.object({
                email_number: z.number().describe("Email position in sequence (1, 2, 3, etc.)"),
                send_delay_days: z.number().describe("Days to wait before sending (0 for immediate)"),
                subject_line: z.string(),
                preview_text: z.string(),
                email_body: z.string().describe("HTML email body"),
                campaign_name: z.string().describe("Individual email name"),
              }),
            )
            .describe("Array of emails in the sequence"),
          notes: z.string().optional().describe("Internal notes about this sequence"),
        }),
        execute: async (params) => {
          console.log("[v0] createEmailSequence tool called with", params.emails.length, "emails")

          const results = []
          for (const email of params.emails) {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/agent/email-campaigns`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") || "" },
                  body: JSON.stringify({
                    campaign_name: `${params.sequence_name} - ${email.campaign_name}`,
                    subject_line: email.subject_line,
                    preview_text: email.preview_text,
                    email_body: email.email_body,
                    campaign_type: params.sequence_type,
                    sequence_position: email.email_number,
                    sequence_total: params.emails.length,
                    send_delay_days: email.send_delay_days,
                    notes: `Part of ${params.sequence_name}. ${params.notes || ""}`,
                    user_id: targetUserId,
                  }),
                },
              )

              const result = await response.json()
              results.push({
                email_number: email.email_number,
                success: response.ok,
                campaign_id: result.campaign?.id,
                broadcast_id: result.broadcast_id,
                error: result.error,
              })
            } catch (error: any) {
              results.push({
                email_number: email.email_number,
                success: false,
                error: error.message,
              })
            }
          }

          const successCount = results.filter((r) => r.success).length

          return {
            success: successCount > 0,
            sequence_name: params.sequence_name,
            total_emails: params.emails.length,
            created_successfully: successCount,
            results,
            message:
              successCount === params.emails.length
                ? `All ${successCount} emails in ${params.sequence_name} created successfully in Resend!`
                : `Created ${successCount} of ${params.emails.length} emails. Check results for errors.`,
            instructions: [
              "1. Go to https://resend.com/broadcasts",
              `2. Find your sequence: ${params.sequence_name}`,
              "3. Note: Emails show send timing in campaign name",
              "4. Schedule each email based on the delay days specified",
            ],
          }
        },
      })

      tools.saveEmailTemplate = tool({
        description: "Saves a reusable email template to the library",
        parameters: z.object({
          template_name: z.string().describe("Name of the template"),
          subject_line: z.string().describe("Template subject line"),
          email_body: z.string().describe("Template email body"),
          category: z.enum(["welcome", "launch", "newsletter", "nurture", "promotional"]).describe("Template category"),
          use_case: z.string().optional().describe("When to use this template"),
        }),
        execute: async (params) => {
          console.log("[v0] saveEmailTemplate tool called:", params)
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/agent/email-templates`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") || "" },
                body: JSON.stringify({ ...params, user_id: targetUserId }),
              },
            )
            const result = await response.json()
            return response.ok
              ? { success: true, template: result.template, message: "Email template saved" }
              : { success: false, error: result.error }
          } catch (error: any) {
            return { success: false, error: error.message }
          }
        },
      })
    }

    // Research mode tools
    if (mode === "research") {
      tools.searchWeb = tool({
        description:
          "REQUIRED: Search the web for competitor analysis, Instagram profiles, content strategies, and industry trends. You MUST use this tool to gather real data before making recommendations.",
        parameters: z.object({
          query: z
            .string()
            .describe(
              "Search query. Examples: '[competitor name] Instagram content strategy', '[niche] trends 2025', '[brand] pricing model'",
            ),
        }),
        execute: async ({ query }) => {
          console.log("[v0] searchWeb tool called with query:", query)
          try {
            const results = await SearchWeb(query)
            console.log("[v0] searchWeb results obtained")
            return {
              success: true,
              results,
              query,
            }
          } catch (error: any) {
            console.error("[v0] searchWeb error:", error)
            return {
              success: false,
              error: error.message,
              query,
            }
          }
        },
      })

      tools.saveCompetitorAnalysis = tool({
        description: "Saves competitor analysis insights to the database for future reference",
        parameters: z.object({
          competitor_name: z.string().describe("Name of the competitor"),
          competitor_url: z.string().optional().describe("Website or social media URL"),
          strengths: z.string().describe("What they're doing well"),
          weaknesses: z.string().describe("Areas where they're falling short"),
          content_strategy: z.string().describe("Their content approach and themes"),
          differentiation_opportunities: z.string().describe("How Sandra can stand out"),
          key_insights: z.string().describe("Important takeaways and patterns"),
        }),
        execute: async (params) => {
          console.log("[v0] saveCompetitorAnalysis tool called:", params)
          try {
            await sql`
              INSERT INTO admin_competitor_analyses_ai
              (created_by, competitor_name, competitor_url, strengths, weaknesses, 
               content_strategy, differentiation_opportunities, key_insights)
              VALUES ('research_agent', ${params.competitor_name}, ${params.competitor_url || null},
                      ${params.strengths}, ${params.weaknesses}, ${params.content_strategy},
                      ${params.differentiation_opportunities}, ${params.key_insights})
            `
            return {
              success: true,
              message: `Competitor analysis for ${params.competitor_name} saved successfully`,
            }
          } catch (error: any) {
            console.error("[v0] Error saving competitor analysis:", error)
            return { success: false, error: error.message }
          }
        },
      })

      tools.saveBusinessInsight = tool({
        description: "Documents strategic business insights and recommendations",
        parameters: z.object({
          insight_title: z.string().describe("Title of the insight"),
          insight_category: z
            .enum(["content_opportunity", "market_gap", "trend_analysis", "strategy_recommendation"])
            .describe("Category of insight"),
          insight_description: z.string().describe("Detailed description of the insight"),
          action_items: z.string().describe("Recommended actions Sandra should take"),
          priority: z.enum(["high", "medium", "low"]).describe("Priority level"),
        }),
        execute: async (params) => {
          console.log("[v0] saveBusinessInsight tool called:", params)
          try {
            const result = await sql`
              INSERT INTO admin_business_insights 
              (insight_title, insight_category, insight_description, 
               action_items, priority, created_by)
              VALUES (${params.insight_title}, ${params.insight_category},
                      ${params.insight_description}, ${params.action_items}, ${params.priority}, 
                      'research_agent')
              RETURNING *
            `
            return {
              success: true,
              message: `Business insight "${params.insight_title}" saved successfully`,
              insight: result[0],
            }
          } catch (error: any) {
            console.error("[v0] Error saving business insight:", error)
            return { success: false, error: error.message }
          }
        },
      })
    }

    if (chatId && messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "user") {
        try {
          let textContent = ""
          if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
            textContent = lastMessage.parts
              .filter((part: any) => part.type === "text" && part.text)
              .map((part: any) => part.text)
              .join(" ")
              .trim()
          } else if (typeof lastMessage.content === "string") {
            textContent = lastMessage.content
          }

          if (textContent) {
            await sql`
              INSERT INTO admin_agent_messages (chat_id, role, content)
              VALUES (${chatId}, 'user', ${textContent})
            `
            console.log("[v0] Saved user message to admin agent database")
          }
        } catch (error) {
          console.error("[v0] Error saving user message:", error)
        }
      }
    }

    const streamConfig: any = {
      model: "anthropic/claude-sonnet-4.5",
      system: enhancedSystemPrompt,
      messages: allMessages,
      maxOutputTokens: 4000,
      tools,
      maxSteps: 20,
      experimental_toolCallStreaming: false,
      onFinish: async ({ text }) => {
        if (chatId && text) {
          try {
            await sql`
              INSERT INTO admin_agent_messages (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${text})
            `
            await sql`
              UPDATE admin_agent_chats
              SET last_activity = NOW()
              WHERE id = ${chatId}
            `
            console.log("[v0] Saved assistant message to admin agent database")
          } catch (error) {
            console.error("[v0] Error saving assistant message:", error)
          }
        }
      },
      onError: (error) => {
        console.error("[v0] Stream error:", error)
      },
    }

    if (mode === "research" && Object.keys(tools).length > 0 && allMessages.length === 1) {
      streamConfig.toolChoice = "required"
      console.log("[v0] Research mode: Forcing tool usage on first message")
    }

    const result = streamText(streamConfig)

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Admin agent error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
