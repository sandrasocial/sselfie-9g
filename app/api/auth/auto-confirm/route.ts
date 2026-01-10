import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncUserWithNeon } from "@/lib/user-sync"

/**
 * POST /api/auth/auto-confirm
 * 
 * Auto-confirms user email after signup (like paid users)
 * Uses Supabase Admin API to set email_confirm: true
 * 
 * This allows users to login immediately without waiting for email confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[Auth Auto-Confirm] Auto-confirming email for:", email, userId ? `(userId: ${userId})` : "")

    const supabaseAdmin = createAdminClient()
    
    let userToConfirm = userId

    // If userId provided, use it directly (more efficient)
    if (!userToConfirm) {
      // Fallback: List users to find by email (less efficient but works)
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error("[Auth Auto-Confirm] Error listing users:", listError)
        return NextResponse.json({ error: "Failed to find user" }, { status: 500 })
      }

      const user = usersData.users.find((u) => u.email === email)
      
      if (!user) {
        console.error("[Auth Auto-Confirm] User not found:", email)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      userToConfirm = user.id
    }

    // Auto-confirm email using Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userToConfirm, {
      email_confirm: true,
    })

    if (updateError) {
      console.error("[Auth Auto-Confirm] Error confirming email:", updateError)
      return NextResponse.json({ error: "Failed to confirm email" }, { status: 500 })
    }

    console.log("[Auth Auto-Confirm] ✅ Email auto-confirmed for:", email)

    // Sync user with Neon database
    try {
      const neonUser = await syncUserWithNeon(userToConfirm, email, updateData.user.user_metadata?.name)
      console.log("[Auth Auto-Confirm] ✅ User synced with Neon:", neonUser?.id)
    } catch (syncError) {
      console.error("[Auth Auto-Confirm] ⚠️ Error syncing with Neon (non-critical):", syncError)
      // Don't fail if sync fails - email is already confirmed
    }

    return NextResponse.json({
      success: true,
      message: "Email auto-confirmed successfully",
      userId: userToConfirm,
    })
  } catch (error) {
    console.error("[Auth Auto-Confirm] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to auto-confirm email" },
      { status: 500 },
    )
  }
}
