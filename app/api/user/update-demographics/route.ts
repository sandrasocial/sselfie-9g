import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getUserByAuthId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { gender, ethnicity, physical_preferences } = await request.json()

    // Validate gender
    const validGenders = ["woman", "man", "non-binary"]
    if (gender && !validGenders.includes(gender)) {
      return NextResponse.json({ error: "Invalid gender value" }, { status: 400 })
    }

    // Validate ethnicity
    const validEthnicities = [
      "Black",
      "White",
      "Asian",
      "Latina/Latino",
      "Middle Eastern",
      "South Asian",
      "Mixed",
      "Other",
      "Prefer not to say",
    ]
    if (ethnicity && !validEthnicities.includes(ethnicity)) {
      return NextResponse.json({ error: "Invalid ethnicity value" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    if (gender !== undefined || ethnicity !== undefined) {
      if (gender !== undefined && ethnicity !== undefined) {
        await sql`
          UPDATE users
          SET gender = ${gender}, ethnicity = ${ethnicity}, updated_at = NOW()
          WHERE id = ${dbUser.id}
        `
      } else if (gender !== undefined) {
        await sql`
          UPDATE users
          SET gender = ${gender}, updated_at = NOW()
          WHERE id = ${dbUser.id}
        `
      } else if (ethnicity !== undefined) {
        await sql`
          UPDATE users
          SET ethnicity = ${ethnicity}, updated_at = NOW()
          WHERE id = ${dbUser.id}
        `
      }
    }

    if (physical_preferences !== undefined) {
      // First check if personal brand exists
      const brandCheck = await sql`
        SELECT id FROM user_personal_brand
        WHERE user_id = ${dbUser.id}
      `

      if (brandCheck.length > 0) {
        // Update existing record
        await sql`
          UPDATE user_personal_brand
          SET 
            physical_preferences = ${physical_preferences},
            updated_at = NOW()
          WHERE user_id = ${dbUser.id}
        `
      } else {
        // Create new record with physical preferences
        await sql`
          INSERT INTO user_personal_brand (user_id, physical_preferences, created_at, updated_at)
          VALUES (${dbUser.id}, ${physical_preferences}, NOW(), NOW())
        `
      }
    }

    const userResult = await sql`
      SELECT gender, ethnicity 
      FROM users 
      WHERE id = ${dbUser.id}
    `

    const brandResult = await sql`
      SELECT physical_preferences
      FROM user_personal_brand
      WHERE user_id = ${dbUser.id}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: "Failed to update demographics" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      gender: userResult[0].gender,
      ethnicity: userResult[0].ethnicity,
      physical_preferences: brandResult.length > 0 ? brandResult[0].physical_preferences : null,
    })
  } catch (error) {
    console.error("[v0] Error updating demographics:", error)
    return NextResponse.json({ error: "Failed to update demographics" }, { status: 500 })
  }
}
