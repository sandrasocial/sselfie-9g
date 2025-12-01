import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    // Rate limiting
    const rateLimitCheck = await checkAdminRateLimit(request, `admin:${admin.neonUserId}`)
    if (rateLimitCheck) return rateLimitCheck

    // Input validation
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get("chatId")

    if (!chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 })
    }

    const chatIdNum = Number.parseInt(chatId, 10)
    if (Number.isNaN(chatIdNum)) {
      return NextResponse.json({ error: "Invalid chatId format" }, { status: 400 })
    }

    // Fetch chat details
    const chatResult = await sql`
      SELECT * FROM admin_agent_chats
      WHERE id = ${chatIdNum}
      AND admin_user_id = ${admin.neonUserId}
      LIMIT 1
    `

    if (chatResult.length === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chat = chatResult[0]

    // Fetch messages for this chat
    const messages = await sql`
      SELECT * FROM admin_agent_messages
      WHERE chat_id = ${chatIdNum}
      ORDER BY created_at ASC
    `

    console.log("[v0] Loaded admin chat:", chatIdNum, "Messages:", messages.length)

    // Format messages with parts structure matching Maya's format
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id.toString(),
      role: msg.role,
      createdAt: msg.created_at,
      content: msg.content,
    }))

    return NextResponse.json({
      chatId: chat.id,
      chatTitle: chat.chat_title,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("[v0] Error loading admin chat:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}
