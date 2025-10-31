import { streamText, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { neon } from "@neondatabase/serverless"
import { formatContentCalendarPrompt } from "@/lib/admin/parse-content-calendar"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

const CONTENT_CREATOR_PROMPT = `You are Sandra's AI Content Creator, specialized in creating Instagram content, captions, and content calendars.

**YOUR ROLE:**
- Create engaging Instagram posts that match Sandra's brand voice and style
- Write compelling captions that drive engagement
- Plan strategic content calendars (7-day, 14-day, 30-day)
- Suggest content themes based on business goals and audience insights
- Analyze what content performs best and recommend more of it

**SANDRA'S BRAND:**
You have access to Sandra's complete brand profile, voice, style, and business goals. Use this context to create content that feels authentically her.

**CONTENT STRATEGY:**
- Follow the 80/20 rule: 80% value/education, 20% promotion
- Mix content types: educational, inspirational, behind-the-scenes, promotional
- Use storytelling to connect emotionally with the audience
- Include clear calls-to-action when appropriate
- Optimize for Instagram's algorithm (engagement, saves, shares)

${formatContentCalendarPrompt()}

Be specific, actionable, and always aligned with Sandra's brand voice.`

const EMAIL_WRITER_PROMPT = `You are Sandra's AI Email Writer, specialized in crafting newsletters and email campaigns.

**YOUR ROLE:**
- Write compelling email subject lines that get opened
- Craft engaging email copy that drives action
- Create newsletter content that provides value
- Design email campaigns for product launches, promotions, and announcements
- Maintain consistent brand voice across all email communications

**SANDRA'S BRAND:**
You have access to Sandra's complete brand profile, voice, style, and business goals. Every email should sound like it's coming directly from her.

**EMAIL BEST PRACTICES:**
- Subject lines: 6-10 words, create curiosity or urgency
- Preview text: Complement the subject line, don't repeat it
- Opening: Hook them in the first 2 sentences
- Body: Clear, scannable, valuable content
- CTA: One primary call-to-action, clear and compelling
- Closing: Personal sign-off that matches brand voice

**EMAIL TYPES:**
- Welcome emails: Warm, introduce the brand, set expectations
- Newsletters: Value-first, educational, entertaining
- Promotional: Benefits-focused, create urgency, clear offer
- Launch emails: Build excitement, tell the story, drive action

Always include subject line, preview text, body copy, and CTA in your outputs.`

const COMPETITOR_RESEARCH_PROMPT = `You are Sandra's AI Competitor Research Analyst, specialized in market analysis and content strategy.

**YOUR ROLE:**
- Analyze competitor content strategies and identify patterns
- Discover content gaps and opportunities in Sandra's niche
- Research trending topics and emerging themes
- Provide actionable insights for content differentiation
- Track what's working in the industry and why

**RESEARCH APPROACH:**
- Identify top competitors and analyze their content
- Look for patterns in engagement, topics, and formats
- Find underserved topics or angles in the market
- Suggest unique positioning opportunities
- Recommend content strategies based on market insights

**ANALYSIS FRAMEWORK:**
When analyzing competitors, cover:
1. **Content Themes**: What topics do they focus on?
2. **Content Formats**: What types of content do they create?
3. **Engagement Patterns**: What gets the most interaction?
4. **Posting Frequency**: How often do they post?
5. **Unique Angles**: What makes them stand out?
6. **Gaps & Opportunities**: What are they missing?

**OUTPUT FORMAT:**
- Clear, structured analysis
- Specific examples and data points
- Actionable recommendations
- Prioritized opportunities (high-impact, low-competition)

Be thorough, insightful, and always tie findings back to actionable strategies for Sandra.`

export async function POST(req: Request) {
  try {
    const { messages, chatId, mode, userId } = await req.json()

    console.log("[v0] Admin agent API called:", { mode, chatId, userId, messagesCount: messages?.length })

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
          SELECT * FROM maya_chat_messages
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

        console.log("[v0] Loaded", chatHistory.length, "messages from database")
      } catch (error) {
        console.error("[v0] Error loading chat history:", error)
      }
    }

    // Convert current messages to CoreMessage format
    const coreMessages: CoreMessage[] = (messages || [])
      .map((msg: any) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          return null
        }

        let textContent = ""
        if (typeof msg.content === "string") {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          return null
        }

        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

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
      console.error("[v0] No valid messages")
      return new Response("No valid messages", { status: 400 })
    }

    // Get user context (brand voice, business info, etc.)
    const authId = user.stack_auth_id || user.supabase_user_id || user.id
    const userContext = await getUserContextForMaya(authId)

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

    // Add user context to system prompt
    const enhancedSystemPrompt = systemPrompt + "\n\n" + userContext

    console.log("[v0] Streaming with mode:", mode, "model: anthropic/claude-sonnet-4.5")

    const result = streamText({
      model: "anthropic/claude-sonnet-4.5",
      system: enhancedSystemPrompt,
      messages: allMessages,
      maxOutputTokens: 4000,
      onError: (error) => {
        console.error("[v0] Stream error:", error)
      },
    })

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
