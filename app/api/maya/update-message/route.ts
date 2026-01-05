import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
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
    const { messageId, content, append = false, feedCards } = body

    console.log("[update-message] Request received:", {
      messageId,
      contentLength: content?.length || 0,
      hasFeedCards: !!feedCards,
      feedCardsCount: Array.isArray(feedCards) ? feedCards.length : 0,
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
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Verify message belongs to user's chat
    const [chat] = await sql`
      SELECT user_id FROM maya_chats
      WHERE id = ${currentMessage.chat_id}
      LIMIT 1
    `

    if (!chat || chat.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update content (append or replace)
    const updatedContent = append
      ? `${currentMessage.content || ""}\n${content}`
      : content

    // Update content and feed cards (styling_details column) if provided
    if (feedCards && Array.isArray(feedCards)) {
      try {
        const feedCardsJson = JSON.stringify(feedCards)
        console.log("[update-message] Updating message with feed cards:", {
          messageId: messageIdNum,
          feedCardsCount: feedCards.length,
          feedCardsJsonLength: feedCardsJson.length,
          firstFeedCard: feedCards[0] ? Object.keys(feedCards[0]) : null,
        })
        
        // Use same pattern as INSERT - pass JSON string directly, Neon will handle JSONB conversion
        await sql`
          UPDATE maya_chat_messages
          SET content = ${updatedContent}, styling_details = ${feedCardsJson}, updated_at = NOW()
          WHERE id = ${messageIdNum}
        `
        console.log("[update-message] ✅ Updated message with feed cards:", feedCards.length)
      } catch (dbError: any) {
        console.error("[update-message] ❌ Database error updating feed cards:", {
          error: dbError?.message || String(dbError),
          stack: dbError?.stack,
          messageId: messageIdNum,
          feedCardsCount: feedCards.length,
          feedCardsJson: feedCardsJson?.substring(0, 200), // First 200 chars for debugging
        })
        throw dbError
      }
    } else {
      await sql`
        UPDATE maya_chat_messages
        SET content = ${updatedContent}, updated_at = NOW()
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
