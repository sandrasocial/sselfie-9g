import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createNewChat } from "@/lib/data/maya"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const { getOrCreateNeonUser } = await import("@/lib/user-mapping")
    
    let dbUser = await getEffectiveNeonUser(user.id)
    
    // If user doesn't exist, try to create them
    if (!dbUser && user.email) {
      console.log("[v0] User not found, attempting to create:", { authUserId: user.id, email: user.email })
      try {
        dbUser = await getOrCreateNeonUser(
          user.id,
          user.email,
          user.user_metadata?.display_name || user.email.split("@")[0]
        )
        console.log("[v0] User created successfully:", { userId: dbUser.id, email: dbUser.email })
      } catch (createError: any) {
        console.error("[v0] Error creating user:", createError)
      }
    }
    
    if (!dbUser) {
      console.error("[v0] User not found in database and could not be created:", { authUserId: user.id, email: user.email })
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!dbUser.id) {
      console.error("[v0] User ID is missing:", { dbUser })
      return NextResponse.json({ error: "Invalid user data" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const chatType = body.chatType || "maya"

    console.log("[v0] Creating new chat:", {
      userId: dbUser.id,
      userIdType: typeof dbUser.id,
      chatType,
      userEmail: dbUser.email
    })

    try {
      const newChat = await createNewChat(dbUser.id, chatType)
      console.log("[v0] Chat created successfully:", { chatId: newChat.id })
      return NextResponse.json({ chatId: newChat.id })
    } catch (createError: any) {
      console.error("[v0] Error in createNewChat:", createError)
      console.error("[v0] Create error details:", {
        message: createError?.message,
        code: createError?.code,
        constraint: createError?.constraint,
        detail: createError?.detail,
        stack: createError?.stack,
      })
      // Re-throw to be caught by outer catch
      throw createError
    }

  } catch (error: any) {
    const errorDetails = {
      message: error?.message || "Unknown error",
      code: error?.code,
      constraint: error?.constraint,
      detail: error?.detail,
      name: error?.name,
    }
    
    console.error("[v0] Error creating new chat:", error)
    console.error("[v0] Full error details:", errorDetails)
    
    // Ensure we always return a valid JSON response
    return NextResponse.json(
      { 
        error: "Failed to create new chat",
        details: errorDetails.message,
        code: errorDetails.code,
        constraint: errorDetails.constraint,
        detail: errorDetails.detail,
      }, 
      { status: 500 }
    )
  }
}
