import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { deleteChat } from "@/lib/data/maya"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get("chatId")

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 })
    }

    const chatIdNum = parseInt(chatId, 10)
    if (isNaN(chatIdNum)) {
      return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 })
    }

    const deleted = await deleteChat(chatIdNum, neonUser.id)

    if (!deleted) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 })
    }

    console.log("[v0] Chat deleted:", { chatId: chatIdNum, userId: neonUser.id })

    return NextResponse.json({ success: true, chatId: chatIdNum })
  } catch (error) {
    console.error("[v0] Error deleting chat:", error)
    return NextResponse.json(
      {
        error: "Failed to delete chat",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

