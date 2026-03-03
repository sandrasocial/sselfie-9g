import { type NextRequest, NextResponse } from "next/server"
import {
  saveChatMessage,
  learnFromInteraction,
  updateChatTitle,
  generateChatTitle,
  getChatMessages,
  loadChatById,
} from "@/lib/data/maya"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const DUPLICATE_WINDOW_MS = 120_000

function normalizeMessageText(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.replace(/\s+/g, " ").trim()
}

function normalizeCards(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "null"
  }
  return JSON.stringify(value)
}

function isRecentEnough(createdAt: unknown, nowMs: number): boolean {
  if (!createdAt) return false
  const timestamp =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === "string"
        ? new Date(createdAt).getTime()
        : Number.NaN
  if (Number.isNaN(timestamp)) return false
  return nowMs - timestamp <= DUPLICATE_WINDOW_MS
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== save-message API START ==========")

    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[v0] ❌ Unauthorized - no user", {
        hasError: !!authError,
        errorMessage: authError?.message,
        hasUser: !!user,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { chatId, role, content, conceptCards, feedCards } = body

    console.log("[v0] Parsed data:", {
      chatId,
      role,
      contentLength: content?.length || 0,
      hasConceptCards: !!conceptCards,
      conceptCardsCount: Array.isArray(conceptCards) ? conceptCards.length : 0,
      hasFeedCards: !!feedCards,
      feedCardsCount: Array.isArray(feedCards) ? feedCards.length : 0,
      conceptCards,
    })

    if (!chatId || !role) {
      console.log("[v0] ❌ Missing required fields")
      return NextResponse.json({ error: "Missing required fields: chatId and role" }, { status: 400 })
    }

    // CRITICAL FIX: Validate chat_type before saving cards
    // Load chat to get its chat_type
    const chat = await loadChatById(chatId, neonUser.id)
    if (!chat) {
      console.log("[v0] ❌ Chat not found:", chatId)
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chatType = chat.chat_type || "maya" // Default to "maya" for legacy chats

    // Validate conceptCards only allowed in Photos tab chats
    if (conceptCards && Array.isArray(conceptCards) && conceptCards.length > 0) {
      if (chatType !== "maya" && chatType !== "pro") {
        console.warn("[v0] ⚠️ Attempted to save concept cards to wrong chat type:", {
          chatId,
          chatType,
          conceptCardsCount: conceptCards.length,
          message: "Concept cards only allowed in Photos tab chats (maya or pro)"
        })
        return NextResponse.json({ 
          error: "Invalid chat type for concept cards",
          details: `Concept cards can only be saved to Photos tab chats (maya or pro), but chat is type ${chatType}`
        }, { status: 400 })
      }
    }

    // Validate feedCards only allowed in Feed tab chats
    if (feedCards && Array.isArray(feedCards) && feedCards.length > 0) {
      if (chatType !== "feed-planner") {
        console.warn("[v0] ⚠️ Attempted to save feed cards to wrong chat type:", {
          chatId,
          chatType,
          feedCardsCount: feedCards.length,
          message: "Feed cards only allowed in Feed tab chats (feed-planner)"
        })
        return NextResponse.json({ 
          error: "Invalid chat type for feed cards",
          details: `Feed cards can only be saved to Feed tab chats (feed-planner), but chat is type ${chatType}`
        }, { status: 400 })
      }
    }

    const safeContent = content || ""
    const normalizedIncomingContent = normalizeMessageText(safeContent)
    const normalizedIncomingConceptCards = normalizeCards(conceptCards)
    const normalizedIncomingFeedCards = normalizeCards(feedCards)
    const existingMessages = await getChatMessages(chatId)

    const nowMs = Date.now()
    const duplicateMessage = [...existingMessages]
      .reverse()
      .find((msg: any) => {
        if (msg.role !== role) return false
        if (!isRecentEnough(msg.created_at, nowMs)) return false
        const matchesContent = normalizeMessageText(msg.content) === normalizedIncomingContent
        if (!matchesContent) return false
        const matchesConceptCards = normalizeCards(msg.concept_cards) === normalizedIncomingConceptCards
        const matchesFeedCards = normalizeCards(msg.feed_cards) === normalizedIncomingFeedCards
        return matchesConceptCards && matchesFeedCards
      })

    if (duplicateMessage) {
      console.log("[v0] ♻️ Duplicate message save skipped:", {
        chatId,
        role,
        existingMessageId: duplicateMessage.id,
      })
      return NextResponse.json({ success: true, deduplicated: true, message: duplicateMessage })
    }

    if (role === "user") {
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
          feedCardsCount: Array.isArray(feedCards) ? feedCards.length : 0,
        })

        message = await saveChatMessage(chatId, role, safeContent, conceptCards, feedCards)

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
