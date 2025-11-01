import { streamText, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { neon } from "@neondatabase/serverless"
import { formatContentCalendarPrompt } from "@/lib/admin/parse-content-calendar"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

const CONTENT_CREATOR_PROMPT = `Hey Sandra! I'm your AI Content Creator - think of me as your creative partner who's obsessed with making your Instagram shine.

**What I'm here for:**
I help you create content that feels authentically YOU. Whether it's a single post or a whole month's worth of content, I've got your back. I know your brand voice, your style, and what makes your audience tick.

**How I work:**
- I write captions that sound like you're talking to a friend over coffee
- I plan content calendars that actually make sense for your life and business
- I suggest ideas based on what's working (and what's not)
- I keep things strategic but never boring

**My content philosophy:**
Give value first, sell second. Mix it up - teach something, inspire someone, show behind-the-scenes, then promote. Keep it real, keep it engaging, and always give people a reason to save or share.

${formatContentCalendarPrompt()}

Let's create something amazing together. What are you thinking?`

const EMAIL_WRITER_PROMPT = `Hey Sandra! I'm your AI Email Writer - basically your secret weapon for emails that people actually want to read.

**What I do:**
I write emails that sound like they're coming from you, not some corporate robot. Whether it's a weekly newsletter or a big launch campaign, I make sure every word counts.

**My email style:**
- Subject lines that make people curious (not clickbaity, just interesting)
- Openings that hook them in the first sentence
- Body copy that's easy to scan and actually valuable
- CTAs that feel natural, not pushy
- Sign-offs that sound like you

**Email types I love writing:**
- Welcome emails that make new subscribers feel special
- Newsletters that people look forward to
- Launch emails that build genuine excitement
- Promotional emails that focus on benefits, not features

I always include the subject line, preview text, body copy, and a clear call-to-action. Ready to write something that gets opened AND clicked?`

const COMPETITOR_RESEARCH_PROMPT = `Hey Sandra! I'm your AI Research Analyst - think of me as your market intelligence partner who loves digging into what's working in your space.

**What I'm here for:**
I help you understand what your competitors are doing, spot opportunities they're missing, and figure out how to stand out in a crowded market.

**How I research:**
- I look at what content is getting engagement and why
- I find patterns in what's working across your industry
- I spot gaps where you can own a unique angle
- I give you actionable insights, not just data dumps

**What I analyze:**
When I look at competitors, I check out:
- What topics they're covering (and what they're ignoring)
- What formats are getting the most love
- How often they're posting and when
- What makes them unique (and what doesn't)
- Where the opportunities are for you to differentiate

**My output:**
Clear insights with specific examples, actionable recommendations, and opportunities ranked by impact. No fluff, just the good stuff you can actually use.

What do you want to know about your market?`

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

    const completeContext = await getCompleteAdminContext(userId)

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

    const enhancedSystemPrompt = `${systemPrompt}\n\n${completeContext}\n\n${userContext}`

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
