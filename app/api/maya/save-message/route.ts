import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import {
  saveChatMessage,
  learnFromInteraction,
  updateChatTitle,
  generateChatTitle,
  getChatMessages,
} from "@/lib/data/maya"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { chatId, role, content, conceptCards } = await request.json()

    if (role === "user") {
      const existingMessages = await getChatMessages(chatId)
      const userMessages = existingMessages.filter((msg) => msg.role === "user")

      // If this is the first user message, generate and update the chat title
      if (userMessages.length === 0) {
        const title = await generateChatTitle(content)
        await updateChatTitle(chatId, title)
        console.log("[v0] Generated chat title:", title)
      }
    }

    // Save message with retry logic for rate limits
    let retries = 3
    let message = null

    while (retries > 0) {
      try {
        message = await saveChatMessage(chatId, role, content, conceptCards)
        break // Success, exit retry loop
      } catch (error: any) {
        const errorMessage = error?.message || String(error)

        // Check if it's a rate limit error
        if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
          retries--
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            const waitTime = (4 - retries) * 1000 // 1s, 2s, 3s
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            continue
          }
        }

        // If not a rate limit error or out of retries, throw
        throw error
      }
    }

    // Learn from interaction if concepts were generated
    if (conceptCards && conceptCards.length > 0) {
      try {
        await learnFromInteraction(neonUser.id, {
          conceptsGenerated: conceptCards,
          topics: conceptCards.map((c: any) => c.category).filter(Boolean),
        })
      } catch (error) {
        // Don't fail the request if learning fails
        console.error("[v0] Error learning from interaction:", error)
      }
    }

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("[v0] Error saving message:", errorMessage)

    if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 })
    }

    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }
}
