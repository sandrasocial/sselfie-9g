import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Complete account request for:", email)

    // Check if user exists in database
    const users = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Account not found. Please complete your purchase first." }, { status: 404 })
    }

    const userId = users[0].id

    // Update user name in database
    await sql`
      UPDATE users 
      SET name = ${name}, updated_at = NOW()
      WHERE id = ${userId}
    `

    console.log("[v0] Updated user name in database")

    const supabaseAdmin = createAdminClient()

    // Update Supabase auth user with password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
    })

    if (authError) {
      console.error("[v0] Error updating Supabase user:", authError)
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
