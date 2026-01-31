import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const sql = getDb()

    // Fetch user's styleguides
    const guides = await sql`
      SELECT 
        id,
        name,
        style_description,
        reference_images,
        color_scheme,
        mood_keywords,
        created_at
      FROM user_styleguides
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at DESC
    `

    return NextResponse.json({ guides })
  } catch (error) {
    console.error("[v0] Error fetching guides:", error)
    return NextResponse.json(
      { error: "Failed to fetch guides", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

