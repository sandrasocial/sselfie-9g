import { type NextRequest, NextResponse } from "next/server"
import { getUserChats } from "@/lib/data/maya"
import { withAuth } from "@/lib/auth/with-auth"

async function handleGetChats({
  request,
  authUser,
  user: neonUser,
}: {
  request: NextRequest | Request
  authUser: { id: string }
  user: { id: string | number }
}) {
  try {
    console.log("[v0] Fetching chat history...")

    console.log("[v0] Supabase user ID:", authUser.id)

    const neonUserId = neonUser.id.toString()
    console.log("[v0] Neon user ID:", neonUserId)

    const { searchParams } = new URL(request.url)
    const chatType = searchParams.get("chatType") || undefined

    const chats = await getUserChats(neonUserId, chatType)
    console.log("[v0] Found chats:", chats.length, chatType ? `(filtered by type: ${chatType})` : "")

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Error fetching chat history:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export const GET = withAuth(handleGetChats)
