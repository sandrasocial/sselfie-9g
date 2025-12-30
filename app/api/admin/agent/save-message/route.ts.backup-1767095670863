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

    const { chatId, role, content } = await request.json()

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, role, content" },
        { status: 400 }
      )
    }

    // Save message to database
    await sql`
      INSERT INTO admin_agent_messages (chat_id, role, content, created_at)
      VALUES (${chatId}, ${role}, ${content}, NOW())
    `

    // Update chat last_activity
    await sql`
      UPDATE admin_agent_chats
      SET last_activity = NOW()
      WHERE id = ${chatId}
    `

    console.log("[v0] Saved admin agent message to chat:", chatId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving admin agent message:", error)
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }
}
