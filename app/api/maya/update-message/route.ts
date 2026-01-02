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

    const { messageId, content, append } = await request.json()

    if (!messageId || !content) {
      return NextResponse.json({ error: "messageId and content are required" }, { status: 400 })
    }

    // If append is true, append to existing content; otherwise replace
    if (append) {
      const [existingMessage] = await sql`
        SELECT content FROM maya_chat_messages
        WHERE id = ${messageId}
        LIMIT 1
      `
      
      if (existingMessage && existingMessage.content) {
        // Check if marker already exists to prevent duplicates
        if (!existingMessage.content.includes(content.trim())) {
          await sql`
            UPDATE maya_chat_messages
            SET content = ${existingMessage.content + '\n\n' + content.trim()}, updated_at = NOW()
            WHERE id = ${messageId}
          `
        }
      } else {
        await sql`
          UPDATE maya_chat_messages
          SET content = ${content.trim()}, updated_at = NOW()
          WHERE id = ${messageId}
        `
      }
    } else {
      await sql`
        UPDATE maya_chat_messages
        SET content = ${content}, updated_at = NOW()
        WHERE id = ${messageId}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating message:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update message" },
      { status: 500 }
    )
  }
}

