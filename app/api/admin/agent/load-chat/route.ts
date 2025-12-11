import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/admin-agent"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
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
    const requestedChatId = searchParams.get("chatId")

    let chat
    if (requestedChatId) {
      chat = await loadChatById(Number.parseInt(requestedChatId), user.id)
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
    } else {
      // Get or create active chat
      chat = await getOrCreateActiveChat(user.id)
    }

    const messages = await getChatMessages(chat.id)

    const formattedMessages = messages.map((msg) => ({
      id: msg.id.toString(),
      role: msg.role,
      createdAt: msg.created_at,
      parts: [
        {
          type: "text",
          text: msg.content || "",
        },
      ],
    }))

    return NextResponse.json({
      chatId: chat.id,
      chatTitle: chat.chat_title,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error("[v0] Error loading admin chat:", error)
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
  }
}
