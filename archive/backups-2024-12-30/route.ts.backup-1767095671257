import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Clearing feed and starting fresh")

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get existing feed
    const existingFeedResult = await sql`
      SELECT id FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingFeedResult.length === 0) {
      return NextResponse.json({ error: "No feed found" }, { status: 404 })
    }

    const feedId = existingFeedResult[0].id

    // Delete all posts from the feed
    await sql`
      DELETE FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `

    console.log("[v0] Successfully cleared feed")

    return NextResponse.json({
      success: true,
      feedId,
      message: "Feed cleared successfully. Ready to start fresh!",
    })
  } catch (error) {
    console.error("[v0] Error clearing feed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear feed" },
      { status: 500 },
    )
  }
}
