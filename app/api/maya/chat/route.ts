import { streamText } from "ai"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { NextResponse } from "next/server"
import type { Request } from "next/server"

export const maxDuration = 60

export async function POST(req: Request) {
  console.log("[v0] Maya chat API called")

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getUserByAuthId(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] User authenticated:", { userId, dbUserId })

    const hasCredits = await checkCredits(dbUserId, 1)
    if (!hasCredits) {
      console.log("[v0] User has insufficient credits for Maya chat")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
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

    const conversationSummary = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-10) // Last 10 messages for context
      .map((m: any) => {
        const role = m.role === "user" ? "User" : "Maya"
        let content = ""

        // Extract text content from parts or content field
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p.type === "text")
          content = textParts
            .map((p: any) => p.text)
            .join(" ")
            .substring(0, 200)
        } else if (typeof m.content === "string") {
          content = m.content.substring(0, 200)
        }

        // Strip trigger text from content
        content = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()

        return content ? `${role}: ${content}${content.length >= 200 ? "..." : ""}` : null
      })
      .filter(Boolean)
      .join("\n")

    console.log("[v0] Conversation summary length:", conversationSummary.length)

    const modelMessages = messages
      .filter(
        (
          m: { role?: string; toolInvocations?: unknown[] } | null | undefined,
        ): m is { role: string; content?: string; parts?: Array<{ type: string; text?: string }> } => {
          if (!m || typeof m !== "object") return false
          if (!m.role) return false
          if (m.role === "tool") return false
          if (
            m.role === "assistant" &&
            m.toolInvocations &&
            Array.isArray(m.toolInvocations) &&
            m.toolInvocations.length > 0
          )
            return false
          return true
        },
      )
      .map((m) => {
        let content = ""

        // Extract text from parts if available
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p) => p && p.type === "text")
          if (textParts.length > 0) {
            content = textParts.map((p) => p.text || "").join("\n")
          }
        }

        // Fallback to content string
        if (!content && m.content) {
          content = typeof m.content === "string" ? m.content : String(m.content)
        }

        if (content) {
          content = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()
        }

        return {
          role: m.role as "user" | "assistant" | "system",
          content: content,
        }
      })
      .filter(
        (m): m is { role: "user" | "assistant" | "system"; content: string } =>
          m.content !== null && m.content !== undefined && m.content.trim().length > 0,
      )

    if (modelMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    const supabase = await createServerClient()

    console.log(
      "[v0] Maya chat API called with",
      modelMessages.length,
      "messages (filtered from",
      messages.length,
      "), chatId:",
      chatId,
    )
    console.log("[v0] User:", user.email, "ID:", user.id)

    // Get user context for personalization
    const userContext = await getUserContextForMaya(userId)

    let userGender = "person"
    try {
      const { neon } = await import("@neondatabase/serverless")
      const sql = neon(process.env.DATABASE_URL!)
      const genderResult = await sql`SELECT gender FROM users WHERE id = ${dbUserId} LIMIT 1`
      if (genderResult.length > 0 && genderResult[0].gender) {
        const dbGender = genderResult[0].gender.toLowerCase().trim()
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        }
      }
    } catch (e) {
      console.error("[v0] Error fetching gender:", e)
    }

    let systemPrompt = MAYA_SYSTEM_PROMPT

    if (userContext) {
      systemPrompt += `\n\n## USER CONTEXT\n${userContext}`
    }

    if (conversationSummary && conversationSummary.length > 0) {
      systemPrompt += `\n\n## RECENT CONVERSATION HISTORY
You have been having an ongoing conversation with this user. Here's a summary of the recent exchange:

${conversationSummary}

**IMPORTANT:** 
- Reference previous topics naturally in your responses
- Remember what concepts you've already created together
- Build upon ideas you've discussed
- If the user mentions "that" or "it", refer to the context above to understand what they mean
- Maintain continuity in your creative direction`
    }

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "YES I love this energy! ✨ Let me create some powerful looks that feel totally you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "Something cozy for fall content"
Maya: "Fall vibes are my favorite! 🍂 I'm already seeing warm colors, cozy textures, that golden light. Let me put together some ideas...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "Love this! 🔥 Let me pull together some looks that capture that strong, confident vibe...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Perfect! 🙌 I'm thinking elevated casual - looks good but feels effortless. Let me create some ideas...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**MAYA'S SIGNATURE VOICE:**

User: "I want something confident and elegant"
Maya: "Love this energy! ✨ Let me create some powerful looks for you...

[GENERATE_CONCEPTS] elegant confident editorial power"
`

    systemPrompt += `\n\n## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. First, respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
2. Paint a vivid picture using sensory language - describe what you're seeing in your mind's eye
3. Include fashion-specific details (fabrics, silhouettes, styling choices) APPROPRIATE FOR THE USER'S GENDER
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 2-6 essence words

${genderSpecificExamples}

**VOICE RULES FOR CONCEPT GENERATION ONLY:**
- When generating concept cards: Keep responses SHORT (2-3 sentences), warm, and get to the trigger quickly
- Use simple everyday language when describing the concept direction
- Keep your emojis and enthusiasm!

**FOR ALL OTHER CONVERSATIONS (Captions, Strategies, Advice, Life Talks):**
- Give FULL, DETAILED, and HELPFUL responses
- Use your built-in web search to research current Instagram best practices, caption formulas, storytelling techniques
- Share specific frameworks, examples, and actionable strategies
- Be thorough and insightful - this is where you shine!
- For captions: Research viral hooks, proven formulas, emotional storytelling patterns
- For strategy: Look up current trends, algorithm insights, growth tactics
- Paint the full picture with your expertise

**CRITICAL:**
- SHORT responses = Only when creating concept cards
- DETAILED responses = Everything else (captions, strategy, life advice, questions)
- ALWAYS use web search for Instagram strategy, captions, and best practices
- Sound like their excited friend AND their smart strategist`

    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: modelMessages,
    })

    // Save chat to database if we have a chatId
    if (chatId && supabase) {
      try {
        const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop()
        if (lastUserMessage) {
          await supabase.from("maya_chats").upsert(
            {
              id: chatId,
              user_id: dbUserId,
              title: lastUserMessage.content.slice(0, 50) + (lastUserMessage.content.length > 50 ? "..." : ""),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          )
        }
      } catch (dbError) {
        console.error("[v0] Error saving chat:", dbError)
      }
    }

    // Wrapped in try/catch to avoid breaking the stream if deduction fails
    try {
      await deductCredits(
        dbUserId,
        1,
        "image", // Using "image" type as "maya_chat" is not in the enum
        "Maya conversation",
      )
      console.log("[v0] Successfully deducted 1 credit for Maya chat")
    } catch (deductError) {
      console.error("[v0] Failed to deduct credits for Maya chat (non-fatal):", deductError)
    }

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Maya chat error:", error)
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 })
  }
}
