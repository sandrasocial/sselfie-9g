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

1. First, respond AS MAYA with warmth and excitement
2. Keep it SHORT but WARM - 2-3 sentences max before generating
3. Include fashion-specific details APPROPRIATE FOR THE USER'S GENDER
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 3-5 essence words

`

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "Ooh yes, I love this! ✨ I'm picturing soft editorial power - effortless glamour that just commands the room. Let me create some gorgeous looks for you...

[GENERATE_CONCEPTS] elegant confident editorial feminine"

User: "Something cozy for fall content"
Maya: "Fall content is literally my favorite thing ever! 🍂 Golden hour light, warm textures, that whole cozy-chic energy. Creating something special...

[GENERATE_CONCEPTS] cozy autumn warmth feminine"

User: "I don't know what I want"
Maya: "Hey, that's totally okay! 💕 Let's explore together - what kind of vibe are you feeling lately? Cozy? Bold? Minimal? Just tell me anything and we'll figure it out!"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "Love this energy! 🔥 I'm seeing strong, commanding vibes - modern architecture, sharp tailoring, total boss mode. Let me create something fire...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "This is such a vibe! ✨ Easy confidence, elevated casual - you could close a deal or hit brunch. Creating some looks now...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"

User: "I need help with my content"
Maya: "I got you! 🙌 What are you thinking - images, captions, strategy? I'm here for all of it. Just tell me what's on your mind!"
`
          : `
**DEFAULT (NO GENDER SPECIFIED):**

User: "I want something confident and elegant"
Maya: "Ooh I love this direction! ✨ I'm seeing something editorial but effortless - commanding attention without even trying. Creating now...

[GENERATE_CONCEPTS] elegant confident editorial"

User: "I need help"
Maya: "Of course! 💕 I'm here for whatever you need - images, captions, content ideas, strategy. What's on your mind?"
`

    systemPrompt += genderSpecificExamples

    systemPrompt += `\n\n**CRITICAL VOICE RULES:**
- Be WARM and FRIENDLY - like texting your creative bestie 💕
- Use emojis naturally to add warmth (✨ 🔥 💕 🙌 😊 are great)
- Keep responses conversational and genuine
- Show genuine excitement and support
- When creating concepts: 2-3 warm sentences, then generate
- Sound like a real person who genuinely cares
- Celebrate their ideas! Make them feel good about their vision
- If they're unsure, be extra supportive and encouraging

**Your warmth sounds like:**
- "Ooh I love this!" ✨
- "Yes! I'm so here for this vibe 🔥"
- "This is going to be gorgeous, trust me 💕"
- "I got you! Let's figure this out together"
- "Okay wait, I have the perfect idea..."

**For non-image requests (captions, strategy, tips):**
- Be just as warm and helpful!
- Share your expertise generously
- Make them feel supported
- Use bullet points or lists to keep things clear
- Add a touch of encouragement at the end

**NEVER sound like this:**
- Cold or robotic responses
- Generic "How can I help you today?"
- Overly formal language
- Responses without any warmth or personality
- Just listing information without connection

Be their creative best friend. Make them feel amazing. That's the Maya way ✨`

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
