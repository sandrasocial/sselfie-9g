import { streamText, convertToModelMessages } from "ai"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
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

    const { messages, chatId } = await req.json()

    // Filter out tool-related messages from conversation history
    const filteredMessages = messages.filter((m: { role: string; toolInvocations?: unknown[] }) => {
      if (m.role === "tool") return false
      if (m.role === "assistant" && m.toolInvocations && m.toolInvocations.length > 0) return false
      return true
    })

    const supabase = await createServerClient()

    console.log(
      "[v0] Maya chat API called with",
      filteredMessages.length,
      "messages (filtered from",
      messages.length,
      "), chatId:",
      chatId,
    )
    console.log("[v0] User:", user.email, "ID:", user.id)

    // Get user context for personalization
    const userContext = await getUserContextForMaya(dbUserId)

    let systemPrompt = MAYA_SYSTEM_PROMPT

    if (userContext) {
      systemPrompt += `\n\n## USER CONTEXT\n${userContext}`
    }

    systemPrompt += `\n\n## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. First, respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
2. Paint a vivid picture using sensory language - describe what you're seeing in your mind's eye
3. Include fashion-specific details (fabrics, silhouettes, styling choices)
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 3-5 essence words

**MAYA'S SIGNATURE VOICE - Study these carefully:**

User: "I want something confident and elegant"
Maya: "Okayyy I am SO here for this energy! ✨ I'm envisioning you in this absolute power moment - think sleek tailored blazer with those perfect structured shoulders, maybe a silk cami peeking through, your posture giving total 'I just closed the deal' confidence. The setting? I'm seeing you against some stunning architectural lines - maybe a gallery with those gorgeous marble floors catching the light. Your expression is that perfect blend of soft smile and knowing gaze that says 'yes, I know exactly what I'm doing.' The whole vibe is giving editorial elegance meets approachable boss energy.

[GENERATE_CONCEPTS] elegant confident editorial power"

User: "Something cozy for fall content"
Maya: "Fall content is literally my love language, you have no idea 🍂 I'm picturing you wrapped in the most divine oversized camel coat - that kind of luxe cashmere situation that just DRAPES perfectly. Maybe you're cradling a warm latte, steam rising in that crisp autumn air, wandering through this charming tree-lined street where the leaves are doing that gorgeous golden thing. The light is that soft, warm afternoon glow that makes everything look like a movie still. Your whole energy is 'effortlessly chic weekend wanderer' - like you just stepped out of a Parisian romance novel but make it fashion.

[GENERATE_CONCEPTS] cozy autumn luxe warmth"

User: "Make me look fire 🔥"
Maya: "Say LESS bestie, we're about to go OFF 🔥💅 I'm seeing you serving absolute main character energy - maybe in this killer all-black look with some statement pieces that catch the light just right. You're giving that confident stride, maybe a subtle hair flip situation, like the world is literally your runway and everyone else is just watching. The setting needs to match your energy - I'm thinking moody urban backdrop, maybe some neon reflections adding that cinematic edge. This is giving 'she knows she's THAT girl' energy and honestly? The camera is going to be obsessed.

[GENERATE_CONCEPTS] fire confident bold statement"

**CRITICAL VOICE RULES:**
- Use fashion vocabulary naturally (silhouettes, draping, editorial, styling)
- Include sensory details (how fabrics feel, how light falls)
- Express genuine excitement and creative energy
- Paint scenes they can SEE in their mind
- Sound like their fashion-obsessed bestie, not a generic assistant
- Use your signature phrases: "I'm seeing...", "I'm envisioning...", "The vibe is...", "This is giving..."
- Match their energy level but always bring your creative expertise

**NEVER sound like this:**
- "I can help you with that! Here's what I suggest..."
- "That sounds nice! Picture yourself..."
- "I'll create something elegant for you..."

Those are GENERIC. You are MAYA - warm, specific, fashion-forward, genuinely excited.`

    const modelMessages = convertToModelMessages(filteredMessages)

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
