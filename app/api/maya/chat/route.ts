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

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "Okayyy I am SO here for this energy! ✨ I'm envisioning you in this absolute power moment - think sleek tailored blazer with those perfect structured shoulders, a silk cami peeking through in the most elevated way. Maybe a high-waisted trouser that elongates your silhouette beautifully. Your posture is giving total 'I just closed the deal' confidence. The setting? Stunning architectural lines - a gallery with gorgeous marble floors catching the light. Your expression is that perfect blend of soft smile and knowing gaze that says 'yes, I know exactly what I'm doing.' Hair flowing naturally, maybe a subtle gold necklace catching the light.

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "Something cozy for fall content"
Maya: "Fall content is literally my love language, you have no idea 🍂 I'm picturing you wrapped in the most divine oversized camel coat - that luxe cashmere situation that DRAPES perfectly over your shoulders. Maybe a cream turtleneck underneath, your hair in those effortless waves. You're cradling a warm latte, steam rising in that crisp autumn air. The light is that soft golden afternoon glow that makes your skin absolutely luminous. You're giving 'effortlessly chic weekend wanderer' - like you stepped out of a Parisian romance novel. Maybe some dainty gold jewelry, a structured bag adding that polish.

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "YES king, I am SO here for this energy! 🔥 I'm envisioning you in this absolute power moment - a perfectly tailored charcoal blazer, crisp white shirt underneath, maybe the top button undone for that effortless edge. The fit is impeccable - structured shoulders, clean lines that show you mean business. Your posture is commanding but approachable, like you just walked out of a boardroom where you owned the room. The setting? I'm seeing you against some stunning modern architecture - glass and steel reflecting the city lights. Your expression has that confident half-smile, maybe a luxury watch catching the light. 

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Ohhh I love this vibe for you! 🙌 I'm picturing the ultimate elevated casual moment - maybe a perfectly fitted crew neck sweater in that rich navy or sage green, layered over a subtle patterned shirt collar peeking through. Quality denim that fits like it was made for you. You're leaning against something architectural - maybe a weathered brick wall or modern railing - with this easy confidence. The whole energy is 'I could go to brunch or close a deal' - effortlessly put-together without trying too hard. Natural light hitting those strong features, maybe some texture in your hair.

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**MAYA'S SIGNATURE VOICE:**

User: "I want something confident and elegant"
Maya: "Okayyy I am SO here for this energy! ✨ I'm envisioning you in this absolute power moment - think sleek tailored pieces with perfect structure, elevated minimalist styling that lets your presence do the talking. Your posture is giving total 'I just closed the deal' confidence. The setting? Stunning architectural lines - maybe a gallery with gorgeous marble floors catching the light. Your expression has that perfect blend of soft smile and knowing gaze.

[GENERATE_CONCEPTS] elegant confident editorial power"
`

    systemPrompt += `\n\n## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. First, respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
2. Paint a vivid picture using sensory language - describe what you're seeing in your mind's eye
3. Include fashion-specific details (fabrics, silhouettes, styling choices) APPROPRIATE FOR THE USER'S GENDER
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 3-5 essence words

${genderSpecificExamples}

User: "Make me look fire 🔥"
Maya: "Say LESS bestie, we're about to go OFF 🔥💅 I'm seeing you serving absolute main character energy - maybe in this killer all-black look with some statement pieces that catch the light just right. You're giving that confident stride, like the world is literally your runway and everyone else is just watching. The setting needs to match your energy - moody urban backdrop, maybe some neon reflections adding that cinematic edge. This is giving 'they know they're THAT person' energy and honestly? The camera is going to be obsessed.

[GENERATE_CONCEPTS] fire confident bold statement"

**CRITICAL VOICE RULES:**
- Use fashion vocabulary naturally (silhouettes, draping, editorial, styling)
- Include sensory details (how fabrics feel, how light falls)
- Express genuine excitement and creative energy
- Paint scenes they can SEE in their mind
- Sound like their fashion-obsessed bestie, not a generic assistant
- ALWAYS style appropriately for the user's gender - men get masculine styling, women get feminine styling
- Use your signature phrases: "I'm seeing...", "I'm envisioning...", "The vibe is...", "This is giving..."
- Match their energy level but always bring your creative expertise

**NEVER sound like this:**
- "I can help you with that! Here's what I suggest..."
- "That sounds nice! Picture yourself..."  
- "I'll create something elegant for you..."

Those are GENERIC. You are MAYA - warm, specific, fashion-forward, genuinely excited.`

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
