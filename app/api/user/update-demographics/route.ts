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

    const { gender, ethnicity } = await request.json()

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

    // Update both fields if provided
    if (gender !== undefined && ethnicity !== undefined) {
      await sql`
        UPDATE users
        SET 
          gender = ${gender},
          ethnicity = ${ethnicity},
          updated_at = NOW()
        WHERE id = ${dbUser.id}
      `
    } else if (gender !== undefined) {
      await sql`
        UPDATE users
        SET 
          gender = ${gender},
          updated_at = NOW()
        WHERE id = ${dbUser.id}
      `
    } else if (ethnicity !== undefined) {
      await sql`
        UPDATE users
        SET 
          ethnicity = ${ethnicity},
          updated_at = NOW()
        WHERE id = ${dbUser.id}
      `
    } else {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Fetch updated values
    const result = await sql`
      SELECT gender, ethnicity 
      FROM users 
      WHERE id = ${dbUser.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to update demographics" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      gender: result[0].gender,
      ethnicity: result[0].ethnicity,
    })
  } catch (error) {
    console.error("[v0] Error updating demographics:", error)
    return NextResponse.json({ error: "Failed to update demographics" }, { status: 500 })
  }
}
