import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { loadChatById } from "@/lib/data/maya"
import { sql } from "@/lib/db/client"
import { supportsFeedCardsInChat } from "@/lib/maya/chat-type"


/**
 * Update an existing message's content
 * Used for saving feed markers and other metadata to messages
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { messageId, chatId, content, append = false, feedCards, conceptCards } = body

    console.log("[update-message] Request received:", {
      messageId,
      chatId,
      contentLength: content?.length || 0,
      hasFeedCards: !!feedCards,
      feedCardsCount: Array.isArray(feedCards) ? feedCards.length : 0,
      hasConceptCards: !!conceptCards,
      conceptCardsCount: Array.isArray(conceptCards) ? conceptCards.length : 0,
    })

    // 🔴 FIX: Allow empty content string (for concept card updates that only update JSONB)
    // Only require messageId - content can be empty string or undefined
    if (!messageId) {
      return NextResponse.json(
        { error: "Missing required field: messageId" },
        { status: 400 }
      )
    }
    
    // Default content to empty string if not provided (for JSONB-only updates)
    const safeContent = content !== undefined ? content : ""

    // Ensure messageId is a number (or resolve from chatId when client-only IDs are used)
    let messageIdNum = typeof messageId === "string" ? Number.parseInt(messageId, 10) : Number(messageId)
    if (Number.isNaN(messageIdNum)) {
      const fallbackChatId =
        typeof chatId === "string" ? Number.parseInt(chatId, 10) : Number(chatId)

      if (Number.isNaN(fallbackChatId)) {
        return NextResponse.json(
          { error: "Invalid messageId format" },
          { status: 400 }
        )
      }

      const chatForLookup = await loadChatById(fallbackChatId, neonUser.id)
      if (!chatForLookup) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }

      const [latestAssistantMessage] = await sql`
        SELECT id
        FROM maya_chat_messages
        WHERE chat_id = ${fallbackChatId}
          AND role = 'assistant'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `

      if (!latestAssistantMessage?.id) {
        return NextResponse.json(
          { error: "No assistant messages found for chat" },
          { status: 404 }
        )
      }

      messageIdNum = Number(latestAssistantMessage.id)
      console.log("[update-message] Resolved non-numeric messageId via latest assistant message:", {
        fallbackChatId,
        resolvedMessageId: messageIdNum,
      })
    }

    // Get current message content
    const [currentMessage] = await sql`
      SELECT content, chat_id FROM maya_chat_messages
      WHERE id = ${messageIdNum}
      LIMIT 1
    `

    if (!currentMessage) {
      console.error("[update-message] ❌ Message not found:", messageIdNum)
      // Return 404 with clear error message so frontend can handle it (e.g., save message first)
      return NextResponse.json({ 
        error: "Message not found",
        messageId: messageIdNum,
        suggestion: "Message may not exist in database yet. Try saving the message first."
      }, { status: 404 })
    }

    // Verify message belongs to user's chat and get chat_type
    const chat = await loadChatById(currentMessage.chat_id, neonUser.id)
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    if (chat.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // CRITICAL FIX: Validate chat_type before updating feed cards
    const chatType = chat.chat_type || "maya" // Default to "maya" for legacy chats

    // Inline Maya feed cards can now persist in standard Maya/Pro chats and the legacy feed planner thread.
    if (feedCards && Array.isArray(feedCards) && feedCards.length > 0) {
      if (!supportsFeedCardsInChat(chatType)) {
        console.warn("[update-message] ⚠️ Attempted to update feed cards in wrong chat type:", {
          messageId: messageIdNum,
          chatId: currentMessage.chat_id,
          chatType,
          feedCardsCount: feedCards.length,
          message: "Feed cards only allowed in Maya, Pro, or Feed Planner chats",
        })
        return NextResponse.json({ 
          error: "Invalid chat type for feed cards",
          details: `Feed cards can only be updated in Maya, Pro, or Feed Planner chats, but chat is type ${chatType}`,
        }, { status: 400 })
      }
    }

    // Update content (append or replace)
    // Use safeContent which defaults to empty string if content was undefined
    const updatedContent = append
      ? `${currentMessage.content || ""}\n${safeContent}`
      : safeContent

    // Update concept_cards JSONB if provided
    if (conceptCards && Array.isArray(conceptCards)) {
      try {
        // CRITICAL: Get existing concept_cards and merge with new ones
        // This allows updating a single concept without replacing all concepts
        const [currentMessageData] = await sql`
          SELECT concept_cards FROM maya_chat_messages
          WHERE id = ${messageIdNum}
          LIMIT 1
        `
        
        let existingConcepts: any[] = []
        if (currentMessageData?.concept_cards && Array.isArray(currentMessageData.concept_cards)) {
          existingConcepts = currentMessageData.concept_cards
        }
        
        // Merge: update by stable id first, then by title+prompt fallback for legacy rows
        const mergedConcepts = [...existingConcepts]
        conceptCards.forEach((updatedConcept: any, updatedIndex: number) => {
          const updatedId = updatedConcept.id || `concept-${messageIdNum}-${updatedIndex}`
          const updatedTitle = typeof updatedConcept.title === "string" ? updatedConcept.title.trim().toLowerCase() : ""
          const updatedPrompt = typeof updatedConcept.prompt === "string" ? updatedConcept.prompt.trim().toLowerCase() : ""

          let existingIndex = mergedConcepts.findIndex((c: any, existingIndex: number) => {
            const existingId = c.id || `concept-${messageIdNum}-${existingIndex}`
            return existingId === updatedId
          })

          if (existingIndex < 0 && (updatedTitle || updatedPrompt)) {
            existingIndex = mergedConcepts.findIndex((c: any) => {
              const existingTitle = typeof c?.title === "string" ? c.title.trim().toLowerCase() : ""
              const existingPrompt = typeof c?.prompt === "string" ? c.prompt.trim().toLowerCase() : ""
              if (updatedTitle && existingTitle && updatedTitle !== existingTitle) return false
              if (updatedPrompt && existingPrompt && updatedPrompt !== existingPrompt) return false
              return !!(updatedTitle || updatedPrompt)
            })
          }

          if (existingIndex >= 0) {
            mergedConcepts[existingIndex] = {
              ...mergedConcepts[existingIndex],
              ...updatedConcept,
              id: mergedConcepts[existingIndex]?.id || updatedId,
            }
          } else {
            mergedConcepts.push({
              ...updatedConcept,
              id: updatedId,
            })
          }
        })
        
        const conceptCardsJson = JSON.stringify(mergedConcepts)
        console.log("[update-message] Updating message with concept cards:", {
          messageId: messageIdNum,
          conceptCardsCount: conceptCards.length,
          mergedCount: mergedConcepts.length,
          existingCount: existingConcepts.length,
          firstConcept: conceptCards[0] ? Object.keys(conceptCards[0]) : null,
        })
        
        // Update concept_cards column with merged concepts
        await sql`
          UPDATE maya_chat_messages
          SET concept_cards = ${conceptCardsJson}
          WHERE id = ${messageIdNum}
        `
        console.log("[update-message] ✅ Updated message with concept cards:", mergedConcepts.length)
      } catch (dbError: any) {
        console.error("[update-message] ❌ Database error updating concept cards:", {
          error: dbError?.message || String(dbError),
          stack: dbError?.stack,
          messageId: messageIdNum,
          conceptCardsCount: conceptCards.length,
        })
        throw dbError
      }
    }

    // Update content and feed cards (feed_cards column) if provided
    if (feedCards && Array.isArray(feedCards)) {
      let feedCardsJson: string | null = null
      try {
        feedCardsJson = JSON.stringify(feedCards)
        console.log("[update-message] Updating message with feed cards:", {
          messageId: messageIdNum,
          feedCardsCount: feedCards.length,
          feedCardsJsonLength: feedCardsJson.length,
          firstFeedCard: feedCards[0] ? Object.keys(feedCards[0]) : null,
        })
        
        // Use feed_cards column (matches concept_cards pattern)
        // NOTE: maya_chat_messages table does not have updated_at column
        await sql`
          UPDATE maya_chat_messages
          SET content = ${updatedContent}, feed_cards = ${feedCardsJson}
          WHERE id = ${messageIdNum}
        `
        console.log("[update-message] ✅ Updated message with feed cards:", feedCards.length)
      } catch (dbError: any) {
        console.error("[update-message] ❌ Database error updating feed cards:", {
          error: dbError?.message || String(dbError),
          stack: dbError?.stack,
          messageId: messageIdNum,
          feedCardsCount: feedCards.length,
          feedCardsJson: feedCardsJson ? feedCardsJson.substring(0, 200) : "Failed to stringify", // First 200 chars for debugging
        })
        throw dbError
      }
    } else if (!conceptCards) {
      // Only update content if neither feedCards nor conceptCards are provided
      // NOTE: maya_chat_messages table does not have updated_at column
      await sql`
        UPDATE maya_chat_messages
        SET content = ${updatedContent}
        WHERE id = ${messageIdNum}
      `
    } else if (conceptCards && !feedCards) {
      // concept_cards were already updated above.
      // Only touch content if a non-empty value was explicitly provided.
      if (safeContent) {
        await sql`
          UPDATE maya_chat_messages
          SET content = ${updatedContent}
          WHERE id = ${messageIdNum}
        `
      }
    }

    // Invalidate cache
    try {
      const { getRedisClient, CacheKeys } = await import("@/lib/redis")
      const redis = getRedisClient()
      const cacheKey = CacheKeys.mayaChatMessages(currentMessage.chat_id)
      if (typeof cacheKey === "string" && cacheKey.length > 0) {
        await redis.del(cacheKey)
      }
    } catch (cacheError) {
      // Non-critical - cache invalidation failure
      console.warn("[update-message] Cache invalidation failed:", cacheError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack || ""
    console.error("[update-message] ❌ Error:", {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
    })
    return NextResponse.json(
      { 
        error: "Failed to update message",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
