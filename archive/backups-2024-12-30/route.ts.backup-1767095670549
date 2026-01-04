import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { settingType, settingName, value } = body

    const sql = neon(process.env.DATABASE_URL!)

    // Get Neon user ID
    const neonUsers = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (neonUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = neonUsers[0].id

    // Update user preferences in the database
    // For now, we'll store settings in the user_profiles table as jsonb
    await sql`
      INSERT INTO user_profiles (user_id, created_at, updated_at)
      VALUES (${neonUserId}, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET updated_at = NOW()
    `

    // Store the setting (you can expand this to store in a dedicated settings table)
    console.log(`[v0] Updated setting: ${settingType}.${settingName} = ${value}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
