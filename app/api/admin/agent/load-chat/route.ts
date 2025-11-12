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

    // Get chat details
    const chatResult = await sql`
      SELECT * FROM admin_agent_chats
      WHERE id = ${chatId} AND admin_user_id = ${user.id}
    `

    if (chatResult.length === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Get messages
    const messages = await sql`
      SELECT * FROM admin_agent_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `

    // Format messages for AI SDK
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id.toString(),
      role: msg.role,
      content: msg.content,
      parts: [
        {
          type: "text",
          text: msg.content,
        },
      ],
    }))

    return NextResponse.json({
      chatId: chatResult[0].id,
      chatTitle: chatResult[0].chat_title,
      agentMode: chatResult[0].agent_mode,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("[v0] Error loading admin agent chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
