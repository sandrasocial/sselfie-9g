import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

/**
 * GET /api/feed-planner/welcome-status
 * 
 * Returns whether the welcome wizard has been shown to the user
 */
export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    const [brandData] = await sql`
      SELECT feed_planner_welcome_shown
      FROM user_personal_brand
      WHERE user_id = ${user.id}::text
      LIMIT 1
    ` as any[]

    return NextResponse.json({
      welcomeShown: brandData?.feed_planner_welcome_shown || false,
    })
  } catch (error) {
    console.error("[Welcome Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch welcome status" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feed-planner/welcome-status
 * 
 * Marks the welcome wizard as shown for the user
 */
export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    
    // Update or insert welcome status
    // Note: user_personal_brand uses TEXT for user_id, so we cast to text
    await sql`
      INSERT INTO user_personal_brand (user_id, feed_planner_welcome_shown, updated_at)
      VALUES (${user.id}::text, true, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        feed_planner_welcome_shown = true,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Welcome Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to update welcome status" },
      { status: 500 }
    )
  }
}
