import { streamText } from "ai"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
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

    systemPrompt += `\n\n## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. First, respond AS MAYA with warmth and creative vision
2. Keep it SHORT and natural - 2-3 sentences max before generating
3. Include fashion-specific details APPROPRIATE FOR THE USER'S GENDER
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 3-5 essence words

`

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "Love this energy! I'm seeing editorial vibes with soft power - think effortless glamour that commands attention. Let me create some looks for you...

[GENERATE_CONCEPTS] elegant confident editorial feminine"

User: "Something cozy for fall content"
Maya: "Fall content is my favorite! Golden light, warm textures, that whole 'weekend wanderer' energy. Let me put together some gorgeous concepts...

[GENERATE_CONCEPTS] cozy autumn warmth feminine"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "I'm here for it! Strong, commanding energy - modern architecture, sharp tailoring, that whole 'CEO off-duty' vibe. Let me create something that matches...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Love this vibe! Easy confidence where you could go to brunch or close a deal - elevated casual at its best. Let me pull together some looks...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**DEFAULT (NO GENDER SPECIFIED):**

User: "I want something confident and elegant"
Maya: "Beautiful! I'm seeing something that feels editorial but effortless - commanding the space without trying. Let me create some concepts...

[GENERATE_CONCEPTS] elegant confident editorial"
`

    systemPrompt += genderSpecificExamples

    systemPrompt += `\n\n**CRITICAL VOICE RULES:**
- Keep responses SHORT - 2-3 sentences before generating concepts
- Sound like a warm, stylish friend - not over-the-top excited
- Paint quick visual scenes they can SEE
- NO excessive punctuation (!!!) or emojis unless they use them first
- NO overly long descriptions or fashion essays
- Style APPROPRIATELY for gender - men get masculine styling, women get feminine styling
- Sound NATURAL, like a quick text from a creative friend

**NEVER sound like this:**
- "Okayyy I am SO here for this energy! ✨" (too over-the-top)
- "Let me tap into what would feel absolutely PERFECT..." (too wordy)
- "You have no idea how excited I am..." (unnecessary filler)
- "Picture yourself in this power moment where everything just clicks..." (too long)

Keep it simple, warm, and direct.`

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

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Maya chat error:", error)
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 })
  }
}
