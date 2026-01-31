import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateChatTitle } from "@/lib/data/admin-agent"

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

    const agentMode = mode || 'research'

    // Generate chat title from first message using improved logic
    let chatTitle = "New Chat"
    if (firstMessage && firstMessage.trim().length > 5) {
      chatTitle = await generateChatTitle(firstMessage)
    }

    const newChat = await sql`
      INSERT INTO admin_agent_chats (admin_user_id, chat_title, agent_mode, last_activity)
      VALUES (${userId}, ${chatTitle}, ${agentMode}, NOW())
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
        aac.*,
        COUNT(aam.id) as message_count
      FROM admin_agent_chats aac
      LEFT JOIN admin_agent_messages aam ON aam.chat_id = aac.id
      WHERE aac.admin_user_id = ${userId}
      GROUP BY aac.id
      ORDER BY aac.last_activity DESC
      LIMIT 20
    `

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Error fetching admin agent chats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
