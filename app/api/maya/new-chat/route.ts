import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getUserByAuthId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Create a new chat session
    const [newChat] = await sql`
      INSERT INTO maya_chats (user_id, chat_title, created_at, updated_at)
      VALUES (${dbUser.id}, 'New Chat', NOW(), NOW())
      RETURNING id
    `

    return NextResponse.json({ chatId: newChat.id })
  } catch (error) {
    console.error("[v0] Error creating new chat:", error)
    return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 })
  }
}
