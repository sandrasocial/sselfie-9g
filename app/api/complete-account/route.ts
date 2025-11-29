import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { email: _ignoredEmail, password, name, token } = await request.json()

    if (!password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Require an authenticated session
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Optional secure token requirement in production
    const isPreview = (process.env.VERCEL_ENV || "").toLowerCase() === "preview"
    if (process.env.NODE_ENV === "production" && !isPreview) {
      if (!token || typeof token !== "string" || token.length < 10) {
        return NextResponse.json({ error: "Invalid or missing token" }, { status: 400 })
      }
      // Minimal token binding: enforce that password setup is pending; token is treated as a one-time gate
      // A more robust token exchange can be added later without breaking clients.
    }

    // Only allow completing the account for the currently authenticated user
    // Ignore provided email entirely; never allow setting a password for arbitrary emails
    // Additionally enforce that Supabase auth user maps to the same Neon user record
    const sessionEmail = authUser.email || ""

    // Resolve Neon user from the authenticated Supabase user
    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json(
        { error: "Account not found. Please complete your purchase first." },
        { status: 404 },
      )
    }

    const users = await sql`
      SELECT id, supabase_user_id, email, password_setup_complete 
      FROM users 
      WHERE id = ${neonUser.id}
      LIMIT 1
    `

    const userId = users[0].id
    const supabaseUserId = users[0].supabase_user_id
    const dbEmail = (users[0].email || "").toLowerCase()
    const setupComplete = users[0].password_setup_complete === true

    if (!supabaseUserId) {
      console.error("[v0] No Supabase user ID found for user")
      return NextResponse.json({ error: "Account setup incomplete. Please contact support." }, { status: 500 })
    }

    // Ensure mapping integrity
    if (supabaseUserId !== authUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure email alignment if present
    if (sessionEmail && dbEmail && sessionEmail.toLowerCase() !== dbEmail) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 403 })
    }

    // Enforce one-time setup
    if (setupComplete) {
      return NextResponse.json({ error: "Password already set" }, { status: 409 })
    }

    await sql`
      UPDATE users 
      SET 
        display_name = ${name}, 
        password_setup_complete = TRUE,
        updated_at = NOW()
      WHERE id = ${userId}
    `

    console.log("[v0] Updated user display name and password setup status")

    const supabaseAdmin = createAdminClient()

    const { data: _updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      password: password,
      email_confirm: true,
    })

    if (updateError) {
      console.error("[v0] Error updating Supabase user:", updateError)
      return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
    }

    console.log("[v0] Password set successfully")

    return NextResponse.json({
      success: true,
      message: "Account completed successfully",
    })
  } catch (error) {
    console.error("[v0] Error completing account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
