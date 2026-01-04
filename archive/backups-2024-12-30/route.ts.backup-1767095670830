import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId, getNeonUserByEmail } from "@/lib/user-mapping"
import { cookies } from "next/headers"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Simple admin login-as-user endpoint
 * Verifies admin password and sets a simple session cookie
 */
export async function POST(request: Request) {
  try {
    // Verify current user is admin
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminNeonUser = await getUserByAuthId(user.id)
    if (!adminNeonUser || adminNeonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // Verify admin secret password
    const adminSecretPassword = process.env.ADMIN_SECRET_PASSWORD || "admin-secret-2024"
    if (password !== adminSecretPassword) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 })
    }

    // Find target user by email
    const targetUser = await getNeonUserByEmail(email)
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Set simple impersonation cookie (1 hour expiry)
    const cookieStore = await cookies()
    cookieStore.set("impersonate_user_id", targetUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour
    })

    console.log("[v0] [ADMIN] Admin logged in as user:", {
      adminEmail: adminNeonUser.email,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
    })

    return NextResponse.json({
      success: true,
      userId: targetUser.id,
      email: targetUser.email,
    })
  } catch (error) {
    console.error("[v0] [ADMIN] Error in login-as-user:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to login as user",
      },
      { status: 500 },
    )
  }
}
