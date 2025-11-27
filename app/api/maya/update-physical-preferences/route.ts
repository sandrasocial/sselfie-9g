import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { physicalPreferences } = await request.json()

    if (!physicalPreferences || typeof physicalPreferences !== "string") {
      return NextResponse.json({ error: "Physical preferences must be a string" }, { status: 400 })
    }

    console.log("[v0] Updating physical preferences for user:", neonUser.id)
    console.log("[v0] New preferences:", physicalPreferences)

    // Update or create personal brand with physical preferences
    const existingBrand = await sql`
      SELECT id FROM user_personal_brand 
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existingBrand.length > 0) {
      // Update existing
      await sql`
        UPDATE user_personal_brand 
        SET physical_preferences = ${physicalPreferences},
            updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
      console.log("[v0] Updated existing brand with physical preferences")
    } else {
      // Create new brand entry
      await sql`
        INSERT INTO user_personal_brand (user_id, physical_preferences, created_at, updated_at, is_completed)
        VALUES (${neonUser.id}, ${physicalPreferences}, NOW(), NOW(), false)
      `
      console.log("[v0] Created new brand with physical preferences")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating physical preferences:", error)
    return NextResponse.json({ error: "Failed to update physical preferences" }, { status: 500 })
  }
}
