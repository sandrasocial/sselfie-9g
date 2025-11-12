import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: Request) {
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

    const { userId, mode, firstMessage } = await request.json()

    // Generate chat title from first message
    let chatTitle = "New Chat"
    if (firstMessage && firstMessage.length > 5) {
      chatTitle = firstMessage.substring(0, 50)
      if (firstMessage.length > 50) {
        chatTitle += "..."
      }
    }

    // Create chat with admin_agent type
    const newChat = await sql`
      INSERT INTO maya_chats (user_id, chat_title, chat_category, chat_type, last_activity)
      VALUES (${userId}, ${chatTitle}, ${mode}, 'admin_agent', NOW())
      RETURNING *
    `

    console.log("[v0] Created admin agent chat:", newChat[0].id)

    return NextResponse.json({ chatId: newChat[0].id })
  } catch (error) {
    console.error("[v0] Error creating admin agent chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const chats = await sql`
      SELECT 
        mc.*,
        COUNT(mcm.id) as message_count
      FROM maya_chats mc
      LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      WHERE mc.user_id = ${userId} AND mc.chat_type = 'admin_agent'
      GROUP BY mc.id
      ORDER BY mc.last_activity DESC
      LIMIT 20
    `

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Error fetching admin agent chats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
