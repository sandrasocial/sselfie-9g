import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * API endpoint to mark blueprint welcome wizard as completed
 * Sets: onboarding_completed = true, blueprint_welcome_shown_at = NOW()
 * This allows Decision 2 testing by preventing the training onboarding wizard from showing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update users table: Set onboarding_completed = true and blueprint_welcome_shown_at = NOW()
    await sql`
      UPDATE users
      SET 
        onboarding_completed = TRUE,
        blueprint_welcome_shown_at = NOW(),
        updated_at = NOW()
      WHERE id = ${neonUser.id}
    `

    console.log(`[Blueprint Welcome] ✅ Marked onboarding_completed=true for user ${neonUser.id}`)

    return NextResponse.json({
      success: true,
      message: "Blueprint welcome wizard marked as completed",
    })
  } catch (error) {
    console.error("[Blueprint Welcome] Error completing welcome wizard:", error)
    return NextResponse.json({ error: "Failed to complete welcome wizard" }, { status: 500 })
  }
}
