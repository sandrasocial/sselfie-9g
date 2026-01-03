import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Update a chat message's content (e.g., to add feed card markers for persistence)
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getUserByAuthId } = await import("@/lib/user-mapping")
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { messageId, content, append } = await request.json()

    if (!messageId || !content) {
      return NextResponse.json({ error: "messageId and content are required" }, { status: 400 })
    }

    // Verify message exists and belongs to user (security check)
    const [existingMessage] = await sql`
      SELECT m.content, m.chat_id, c.user_id
      FROM maya_chat_messages m
      INNER JOIN maya_chats c ON m.chat_id = c.id
      WHERE m.id = ${messageId}
      AND c.user_id = ${neonUser.id}
      LIMIT 1
    `
    
    if (!existingMessage) {
      console.error("[UPDATE-MESSAGE] ❌ Message not found or access denied:", { messageId, userId: neonUser.id })
      return NextResponse.json({ error: "Message not found or access denied" }, { status: 404 })
    }

    // If append is true, append to existing content; otherwise replace
    if (append) {
      if (existingMessage.content) {
        // Check if marker already exists to prevent duplicates
        if (!existingMessage.content.includes(content.trim())) {
          await sql`
            UPDATE maya_chat_messages
            SET content = ${existingMessage.content + '\n\n' + content.trim()}, updated_at = NOW()
            WHERE id = ${messageId}
            AND EXISTS (
              SELECT 1 FROM maya_chats c 
              WHERE c.id = maya_chat_messages.chat_id 
              AND c.user_id = ${neonUser.id}
            )
          `
          console.log("[UPDATE-MESSAGE] ✅ Appended content to message:", messageId)
        } else {
          console.log("[UPDATE-MESSAGE] ⚠️ Marker already exists in message, skipping duplicate")
        }
      } else {
        await sql`
          UPDATE maya_chat_messages
          SET content = ${content.trim()}, updated_at = NOW()
          WHERE id = ${messageId}
          AND EXISTS (
            SELECT 1 FROM maya_chats c 
            WHERE c.id = maya_chat_messages.chat_id 
            AND c.user_id = ${neonUser.id}
          )
        `
        console.log("[UPDATE-MESSAGE] ✅ Set content for message:", messageId)
      }
    } else {
      await sql`
        UPDATE maya_chat_messages
        SET content = ${content}, updated_at = NOW()
        WHERE id = ${messageId}
        AND EXISTS (
          SELECT 1 FROM maya_chats c 
          WHERE c.id = maya_chat_messages.chat_id 
          AND c.user_id = ${neonUser.id}
        )
      `
      console.log("[UPDATE-MESSAGE] ✅ Replaced content for message:", messageId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[UPDATE-MESSAGE] ❌ Error updating message:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update message" },
      { status: 500 }
    )
  }
}

