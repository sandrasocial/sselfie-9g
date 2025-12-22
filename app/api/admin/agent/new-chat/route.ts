import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createNewChat } from "@/lib/data/admin-agent"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: NextRequest) {
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

    const newChat = await createNewChat(user.id, "New Chat", null)

    console.log("[v0] Created admin agent chat:", newChat.id)

    return NextResponse.json({ chatId: newChat.id })
  } catch (error) {
    console.error("[v0] Error creating admin agent chat:", error)
    return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 })
  }
}



































