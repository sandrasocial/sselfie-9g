import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, bio, location, instagram } = await request.json()

    const sql = neon(process.env.DATABASE_URL!)

    const neonUser = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id} LIMIT 1
    `

    if (neonUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = neonUser[0].id

    // Update user profile in users table
    await sql`
      UPDATE users
      SET 
        display_name = ${name},
        updated_at = NOW()
      WHERE id = ${neonUserId}
    `

    const existingProfile = await sql`
      SELECT id FROM user_profiles WHERE user_id = ${neonUserId}
    `

    if (existingProfile.length > 0) {
      await sql`
        UPDATE user_profiles
        SET 
          bio = ${bio},
          location = ${location},
          instagram_handle = ${instagram},
          updated_at = NOW()
        WHERE user_id = ${neonUserId}
      `
    } else {
      await sql`
        INSERT INTO user_profiles (user_id, bio, location, instagram_handle, created_at, updated_at)
        VALUES (${neonUserId}, ${bio}, ${location}, ${instagram}, NOW(), NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
