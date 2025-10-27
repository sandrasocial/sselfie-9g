import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Settings API: GET request")

    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Settings API: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Settings API: Auth user ID:", user.id)

    // Get Neon user ID
    const userResult = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (userResult.length === 0) {
      console.log("[v0] Settings API: User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = userResult[0].id
    console.log("[v0] Settings API: Neon user ID:", neonUserId)

    // Get user settings from maya_profile
    const profileResult = await sql`
      SELECT preferences, feature_access FROM maya_profile WHERE user_id = ${neonUserId}
    `

    let settings = {
      emailNotifications: true,
      mayaUpdates: true,
      autoSaveGenerations: true,
      trainingDataConsent: true,
    }

    if (profileResult.length > 0 && profileResult[0].preferences) {
      settings = { ...settings, ...profileResult[0].preferences }
    }

    console.log("[v0] Settings API: Returning settings:", settings)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Settings API: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Settings API: POST request")

    const body = await request.json()
    console.log("[v0] Settings API: Request body:", body)

    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Settings API: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Settings API: Auth user ID:", user.id)

    // Get Neon user ID
    const userResult = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (userResult.length === 0) {
      console.log("[v0] Settings API: User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = userResult[0].id
    console.log("[v0] Settings API: Neon user ID:", neonUserId)

    // Check if maya_profile exists
    const existingProfile = await sql`
      SELECT id FROM maya_profile WHERE user_id = ${neonUserId}
    `

    if (existingProfile.length === 0) {
      // Create maya_profile with settings
      console.log("[v0] Settings API: Creating new maya_profile")
      await sql`
        INSERT INTO maya_profile (user_id, preferences, created_at, updated_at)
        VALUES (${neonUserId}, ${JSON.stringify(body)}, NOW(), NOW())
      `
    } else {
      // Update existing maya_profile
      console.log("[v0] Settings API: Updating existing maya_profile")
      await sql`
        UPDATE maya_profile
        SET preferences = ${JSON.stringify(body)}, updated_at = NOW()
        WHERE user_id = ${neonUserId}
      `
    }

    console.log("[v0] Settings API: Settings saved successfully")

    return NextResponse.json({ success: true, settings: body })
  } catch (error) {
    console.error("[v0] Settings API: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
