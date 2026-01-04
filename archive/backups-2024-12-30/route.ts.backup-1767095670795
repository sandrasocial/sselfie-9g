import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { deleteChat, updateChatTitle } from "@/lib/data/admin-agent"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// DELETE endpoint to delete a chat
export async function DELETE(
  request: Request,
  { params }: { params: { chatId: string } }
) {
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

    const chatId = parseInt(params.chatId)
    if (isNaN(chatId)) {
      return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 })
    }

    const deleted = await deleteChat(chatId, user.id)
    if (!deleted) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 })
    }

    console.log("[v0] Deleted admin agent chat:", chatId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting admin agent chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH endpoint to update chat title
export async function PATCH(
  request: Request,
  { params }: { params: { chatId: string } }
) {
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

    const chatId = parseInt(params.chatId)
    if (isNaN(chatId)) {
      return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 })
    }

    const { title } = await request.json()
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    await updateChatTitle(chatId, user.id, title.trim())

    console.log("[v0] Updated admin agent chat title:", chatId, title)
    return NextResponse.json({ success: true, title: title.trim() })
  } catch (error) {
    console.error("[v0] Error updating admin agent chat title:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

