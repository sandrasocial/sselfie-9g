import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { neon } from "@neondatabase/serverless"
import type { ImageLibrary } from "@/lib/maya/pro/category-system"

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)

/**
 * Pro Mode Library Update API Route
 * 
 * Updates user's image library in database.
 * Handles image additions/removals and intent updates.
 * Uses UPSERT to create or update library.
 */
export async function POST(req: NextRequest) {
  console.log("[v0] [PRO MODE] Library update API called")

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

    // Parse request body (userId is not needed - we get it from auth)
    const body = await req.json()
    const { selfies, products, people, vibes, intent, current_intent, userId: _ignoredUserId } = body

    // Get current library to merge updates
    const currentLibraryResult = await sql`
      SELECT 
        selfies,
        products,
        people,
        vibes,
        current_intent
      FROM user_image_libraries
      WHERE user_id = ${dbUserId}
      LIMIT 1
    `

    // Build updated library by merging current with updates
    let updatedSelfies: string[] = []
    let updatedProducts: string[] = []
    let updatedPeople: string[] = []
    let updatedVibes: string[] = []
    let updatedIntent: string | null = null

    if (currentLibraryResult.length > 0) {
      const current = currentLibraryResult[0]
      updatedSelfies = Array.isArray(current.selfies) ? current.selfies : []
      updatedProducts = Array.isArray(current.products) ? current.products : []
      updatedPeople = Array.isArray(current.people) ? current.people : []
      updatedVibes = Array.isArray(current.vibes) ? current.vibes : []
      updatedIntent = current.current_intent || null
    }

    // Apply updates
    if (selfies !== undefined) {
      updatedSelfies = Array.isArray(selfies) ? selfies : []
    }
    if (products !== undefined) {
      updatedProducts = Array.isArray(products) ? products : []
    }
    if (people !== undefined) {
      updatedPeople = Array.isArray(people) ? people : []
    }
    if (vibes !== undefined) {
      updatedVibes = Array.isArray(vibes) ? vibes : []
    }
    if (intent !== undefined) {
      updatedIntent = typeof intent === "string" ? intent : null
    }
    if (current_intent !== undefined) {
      updatedIntent = typeof current_intent === "string" ? current_intent : null
    }

    // Remove duplicates from arrays
    updatedSelfies = [...new Set(updatedSelfies)]
    updatedProducts = [...new Set(updatedProducts)]
    updatedPeople = [...new Set(updatedPeople)]
    updatedVibes = [...new Set(updatedVibes)]

    console.log("[v0] [PRO MODE] Library update:", {
      selfiesCount: updatedSelfies.length,
      productsCount: updatedProducts.length,
      peopleCount: updatedPeople.length,
      vibesCount: updatedVibes.length,
      hasIntent: !!updatedIntent,
    })

    // Update or insert library
    let updatedLibrary: any

    if (currentLibraryResult.length > 0) {
      // Update existing library
      const result = await sql`
        UPDATE user_image_libraries
        SET
          selfies = ${JSON.stringify(updatedSelfies)}::jsonb,
          products = ${JSON.stringify(updatedProducts)}::jsonb,
          people = ${JSON.stringify(updatedPeople)}::jsonb,
          vibes = ${JSON.stringify(updatedVibes)}::jsonb,
          current_intent = ${updatedIntent},
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
        throw new Error("Failed to update library")
      }

      updatedLibrary = result[0]
    } else {
      // Insert new library
      const result = await sql`
        INSERT INTO user_image_libraries (
          user_id,
          selfies,
          products,
          people,
          vibes,
          current_intent
        )
        VALUES (
          ${dbUserId},
          ${JSON.stringify(updatedSelfies)}::jsonb,
          ${JSON.stringify(updatedProducts)}::jsonb,
          ${JSON.stringify(updatedPeople)}::jsonb,
          ${JSON.stringify(updatedVibes)}::jsonb,
          ${updatedIntent}
        )
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
        throw new Error("Failed to create library")
      }

      updatedLibrary = result[0]
    }

    // Parse JSONB arrays
    const finalSelfies = Array.isArray(updatedLibrary.selfies) ? updatedLibrary.selfies : []
    const finalProducts = Array.isArray(updatedLibrary.products) ? updatedLibrary.products : []
    const finalPeople = Array.isArray(updatedLibrary.people) ? updatedLibrary.people : []
    const finalVibes = Array.isArray(updatedLibrary.vibes) ? updatedLibrary.vibes : []

    console.log("[v0] [PRO MODE] Library updated successfully")

    // Return updated library
    return NextResponse.json({
      selfies: finalSelfies,
      products: finalProducts,
      people: finalPeople,
      vibes: finalVibes,
      current_intent: updatedLibrary.current_intent || null,
      intent: updatedLibrary.current_intent || null, // Alias for compatibility
      created_at: updatedLibrary.created_at || null,
      updated_at: updatedLibrary.updated_at || null,
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Library update API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
