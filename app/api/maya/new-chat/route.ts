import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createNewChat } from "@/lib/data/maya"

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

    const body = await request.json().catch(() => ({}))
    const chatType = body.chatType || "maya"

    const newChat = await createNewChat(dbUser.id, chatType)

    return NextResponse.json({ chatId: newChat.id })
  } catch (error) {
    console.error("[v0] Error creating new chat:", error)
    return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 })
  }
}
