import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Get strategy document for a feed from feed_strategy table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT id
      FROM feed_layouts
      WHERE id = ${feedIdInt}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json(
        { error: "Feed not found or access denied" },
        { status: 404 }
      )
    }

    // Get strategy from feed_strategy table
    const [strategy] = await sql`
      SELECT strategy_document
      FROM feed_strategy
      WHERE feed_layout_id = ${feedIdInt}
      AND user_id = ${neonUser.id}
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      strategy: strategy?.strategy_document || null,
    })
  } catch (error) {
    console.error("[GET-STRATEGY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get strategy",
      },
      { status: 500 }
    )
  }
}

