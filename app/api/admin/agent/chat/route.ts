import { streamText, tool, type CoreMessage } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getCompleteAdminContext } from "@/lib/admin/get-complete-context"
import { neon } from "@neondatabase/serverless"
import { z } from "zod"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

const UNIFIED_AGENT_PROMPT = `You are Sandra's Personal Brand AI Assistant - your role is to GENERATE content, not to save it.

**Your Job:**
1. Listen to what Sandra needs (content calendar, email, research)
2. Generate high-quality content
3. Present it clearly in your response
4. Sandra will click "Save" buttons to actually save your work

**CRITICAL: DO NOT use tools automatically**
- You generate content ONLY
- Sandra clicks explicit action buttons to save
- This prevents confusion and gives Sandra full control

**What You Can Create:**

1. **Content Calendars** - Instagram posts with captions, timing, and strategy
2. **Email Campaigns** - Newsletters, launches, nurture sequences in Sandra's voice
3. **Competitor Research** - Strategic analysis and differentiation opportunities

**Sandra's Brand Voice:**
- Warm, personal, conversational (like texting a friend)
- Empowering and encouraging
- Real and relatable - share the messy middle
- Simple everyday language
- Sign emails with "xo Sandra"

**Output Format:**
Present content clearly so Sandra can review before saving.

${getCompleteAdminContext}

Let's create something great. What do you need?`

export async function POST(req: Request) {
  try {
    const { messages, chatId, userId } = await req.json()

    console.log("[v0] Admin agent API called:", { chatId, userId, messagesCount: messages?.length })

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

    console.log("[v0] Admin agent API called with messages:", messages?.length || 0)

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

    // Get user-specific context if userId provided
    let userContext = ""
    if (userId) {
      const authId = await getUserByAuthId(userId)
      if (authId) {
        userContext = await getUserContextForMaya(authId.stack_auth_id || authId.supabase_user_id || authId.id)
      }
    }

    const enhancedSystemPrompt = `${UNIFIED_AGENT_PROMPT}

**ADMIN CONTEXT:**
${completeContext}

${userContext ? `**USER CONTEXT:**\n${userContext}` : ""}`

    console.log("[v0] Streaming with model: anthropic/claude-sonnet-4.5")

    const result = streamText({
      model: "anthropic/claude-sonnet-4.5",
      system: enhancedSystemPrompt,
      messages: allMessages,
      maxOutputTokens: 4000,
      onFinish: async ({ text }) => {
        if (chatId && text) {
          try {
            await sql`
              INSERT INTO maya_chat_messages (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${text})
            `
            await sql`
              UPDATE maya_chats
              SET last_activity = NOW()
              WHERE id = ${chatId}
            `
          } catch (error) {
            console.error("Error saving assistant message:", error)
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("Admin agent error:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
