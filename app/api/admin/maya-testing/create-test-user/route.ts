import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if test user already exists
    const existingTestUser = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = 'maya-test-user@sselfie.test'
      LIMIT 1
    `

    if (existingTestUser.length > 0) {
      return NextResponse.json({
        success: true,
        test_user_id: existingTestUser[0].id,
        test_user_email: existingTestUser[0].email,
        message: "Test user already exists",
      })
    }

    // Create dedicated test user (NOT the admin user)
    const testUserId = crypto.randomUUID()
    const testUserEmail = `maya-test-user@sselfie.test`

    const testUser = await sql`
      INSERT INTO users (
        id,
        email,
        display_name,
        created_at,
        updated_at
      ) VALUES (
        ${testUserId},
        ${testUserEmail},
        'Maya Test User',
        NOW(),
        NOW()
      )
      RETURNING id, email, display_name
    `

    // Grant test user some credits for testing (optional)
    await sql`
      INSERT INTO user_credits (user_id, balance, created_at, updated_at)
      VALUES (${testUserId}, 1000, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET balance = 1000, updated_at = NOW()
    `

    return NextResponse.json({
      success: true,
      test_user_id: testUser[0].id,
      test_user_email: testUser[0].email,
      message: "Test user created successfully. This is a separate user from your admin account.",
    })
  } catch (error: any) {
    console.error("[v0] Error creating test user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create test user" },
      { status: 500 }
    )
  }
}






























