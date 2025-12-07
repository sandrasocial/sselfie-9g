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
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== save-message API START ==========")

    const supabase = await createServerClient()

    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[v0] ❌ Unauthorized - no user", {
        hasError: !!authError,
        errorMessage: authError?.message,
        hasUser: !!user,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { chatId, role, content, conceptCards } = body

    console.log("[v0] Parsed data:", {
      chatId,
      role,
      contentLength: content?.length || 0,
      hasConceptCards: !!conceptCards,
      conceptCardsCount: Array.isArray(conceptCards) ? conceptCards.length : 0,
      conceptCards,
    })

    if (!chatId || !role) {
      console.log("[v0] ❌ Missing required fields")
      return NextResponse.json({ error: "Missing required fields: chatId and role" }, { status: 400 })
    }

    const safeContent = content || ""

    if (role === "user") {
      const existingMessages = await getChatMessages(chatId)
      const userMessages = existingMessages.filter((msg) => msg.role === "user")

      // If this is the first user message, generate and update the chat title
      if (userMessages.length === 0) {
        const title = await generateChatTitle(safeContent)
        await updateChatTitle(chatId, title)
        console.log("[v0] Generated chat title:", title)
      }
    }

    // Save message with retry logic for rate limits
    let retries = 3
    let message = null

    while (retries > 0) {
      try {
        console.log("[v0] Calling saveChatMessage with:", {
          chatId,
          role,
          contentLength: safeContent?.length || 0,
          conceptCardsCount: Array.isArray(conceptCards) ? conceptCards.length : 0,
        })

        message = await saveChatMessage(chatId, role, safeContent, conceptCards)

        console.log("[v0] ✅ Message saved to database:", {
          messageId: message.id,
          hasConceptCards: !!message.concept_cards,
          conceptCardsCount: Array.isArray(message.concept_cards) ? message.concept_cards.length : 0,
        })

        break // Success, exit retry loop
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        console.error("[v0] ❌ Error in saveChatMessage:", errorMessage)

        // Check if it's a rate limit error
        if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
          retries--
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            const waitTime = (4 - retries) * 1000 // 1s, 2s, 3s
            console.log("[v0] Rate limited, retrying in", waitTime, "ms")
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
        console.log("[v0] Learning from interaction with", conceptCards.length, "concepts")
        await learnFromInteraction(neonUser.id, {
          conceptsGenerated: conceptCards,
          topics: conceptCards.map((c: any) => c.category).filter(Boolean),
        })
      } catch (error) {
        // Don't fail the request if learning fails
        console.error("[v0] Error learning from interaction:", error)
      }
    }

    console.log("[v0] ========== save-message API END (success) ==========")
    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("[v0] ========== save-message API END (error) ==========")
    console.error("[v0] Error saving message:", errorMessage)

    if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 })
    }

    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }
}
