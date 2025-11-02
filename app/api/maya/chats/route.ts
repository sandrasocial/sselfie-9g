import { type NextRequest, NextResponse } from "next/server"
import { getUserChats } from "@/lib/data/maya"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching chat history...")

    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[v0] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Supabase user ID:", user.id)

    const neonUser = await getUserByAuthId(user.id)

    if (!neonUser) {
      console.log("[v0] No Neon user found for auth user:", user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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
