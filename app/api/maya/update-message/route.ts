import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { loadChatById } from "@/lib/data/maya"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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
    const { messageId, content, append = false, feedCards, conceptCards } = body

    console.log("[update-message] Request received:", {
      messageId,
      contentLength: content?.length || 0,
      hasFeedCards: !!feedCards,
      feedCardsCount: Array.isArray(feedCards) ? feedCards.length : 0,
      hasConceptCards: !!conceptCards,
      conceptCardsCount: Array.isArray(conceptCards) ? conceptCards.length : 0,
    })

    if (!messageId || content === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: messageId and content" },
        { status: 400 }
      )
    }

    // Ensure messageId is a number
    const messageIdNum = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId
    if (isNaN(messageIdNum)) {
      return NextResponse.json(
        { error: "Invalid messageId format" },
        { status: 400 }
      )
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

    // Validate feedCards only allowed in Feed tab chats
    if (feedCards && Array.isArray(feedCards) && feedCards.length > 0) {
      if (chatType !== "feed-planner") {
        console.warn("[update-message] ⚠️ Attempted to update feed cards in wrong chat type:", {
          messageId: messageIdNum,
          chatId: currentMessage.chat_id,
          chatType,
          feedCardsCount: feedCards.length,
          message: "Feed cards only allowed in Feed tab chats (feed-planner)"
        })
        return NextResponse.json({ 
          error: "Invalid chat type for feed cards",
          details: `Feed cards can only be updated in Feed tab chats (feed-planner), but chat is type ${chatType}`
        }, { status: 400 })
      }
    }

    // Update content (append or replace)
    const updatedContent = append
      ? `${currentMessage.content || ""}\n${content}`
      : content

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
        
        // Merge: Update existing concepts or add new ones
        const mergedConcepts = [...existingConcepts]
        conceptCards.forEach((updatedConcept: any) => {
          const existingIndex = mergedConcepts.findIndex((c: any) => {
            const cId = c.id || `concept-${messageIdNum}-${mergedConcepts.indexOf(c)}`
            const updatedId = updatedConcept.id || `concept-${messageIdNum}-${conceptCards.indexOf(updatedConcept)}`
            return cId === updatedId
          })
          
          if (existingIndex >= 0) {
            // Update existing concept (merge properties)
            mergedConcepts[existingIndex] = {
              ...mergedConcepts[existingIndex],
              ...updatedConcept, // Overwrite with new data (generatedImageUrl, predictionId, etc.)
            }
          } else {
            // Add new concept (shouldn't happen, but safety)
            mergedConcepts.push(updatedConcept)
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
      // Update content and concept_cards together
      await sql`
        UPDATE maya_chat_messages
        SET content = ${updatedContent}
        WHERE id = ${messageIdNum}
      `
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
