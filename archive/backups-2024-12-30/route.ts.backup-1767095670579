import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { neon } from "@neondatabase/serverless"

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)

/**
 * Pro Mode Library Clear API Route
 * 
 * Clears all images and intent from user's library.
 * Resets library to empty state.
 */
export async function POST(req: NextRequest) {
  console.log("[v0] [PRO MODE] Library clear API called")

  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] [PRO MODE] User authenticated:", { userId, dbUserId })

    // Check if library exists
    const libraryExists = await sql`
      SELECT id FROM user_image_libraries
      WHERE user_id = ${dbUserId}
      LIMIT 1
    `

    if (libraryExists.length === 0) {
      // Library doesn't exist, return empty library
      console.log("[v0] [PRO MODE] Library doesn't exist, returning empty library")
      return NextResponse.json({
        selfies: [],
        products: [],
        people: [],
        vibes: [],
        current_intent: null,
        intent: null,
        created_at: null,
        updated_at: null,
      })
    }

    // Clear library: set all arrays to empty and intent to null
    const result = await sql`
      UPDATE user_image_libraries
      SET
        selfies = '[]'::jsonb,
        products = '[]'::jsonb,
        people = '[]'::jsonb,
        vibes = '[]'::jsonb,
        current_intent = NULL,
        updated_at = NOW()
      WHERE user_id = ${dbUserId}
      RETURNING
        selfies,
        products,
        people,
        vibes,
        current_intent,
        created_at,
        updated_at
    `

    if (result.length === 0) {
      throw new Error("Failed to clear library")
    }

    const clearedLibrary = result[0]

    // Parse JSONB arrays (should be empty arrays)
    const selfies = Array.isArray(clearedLibrary.selfies) ? clearedLibrary.selfies : []
    const products = Array.isArray(clearedLibrary.products) ? clearedLibrary.products : []
    const people = Array.isArray(clearedLibrary.people) ? clearedLibrary.people : []
    const vibes = Array.isArray(clearedLibrary.vibes) ? clearedLibrary.vibes : []

    console.log("[v0] [PRO MODE] Library cleared successfully")

    // Return cleared library
    return NextResponse.json({
      selfies,
      products,
      people,
      vibes,
      current_intent: null,
      intent: null,
      created_at: clearedLibrary.created_at || null,
      updated_at: clearedLibrary.updated_at || null,
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Library clear API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
