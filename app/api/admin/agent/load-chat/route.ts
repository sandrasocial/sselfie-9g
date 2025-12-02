import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get("chatId")

    if (!chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 })
    }

    // Fetch chat details
    const chatResult = await sql`
      SELECT * FROM admin_agent_chats
      WHERE id = ${chatId}
      AND admin_user_id = ${user.id}
      LIMIT 1
    `

    if (chatResult.length === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const chat = chatResult[0]

    // Fetch messages for this chat
    const messages = await sql`
      SELECT * FROM admin_agent_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `

    console.log("[v0] Loaded admin chat:", chatId, "Messages:", messages.length)

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
