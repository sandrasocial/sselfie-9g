import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

/**
 * Get Feed List
 * 
 * Returns all feeds for the current user, ordered by most recent first.
 * Includes basic feed info and post counts.
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()

    // Get all feeds for user with post counts
    // Note: Uses feed_layout_id (if feed_id exists, migration scripts handle the rename)
    const feeds = await sql`
      SELECT 
        fl.id,
        COALESCE(NULLIF(fl.brand_name, ''), NULLIF(fl.title, ''), NULLIF(fl.name, ''), 'Feed ' || fl.id::text) as title,
        fl.created_at,
        fl.created_by,
        fl.status,
        COUNT(fp.id) as post_count,
        COUNT(CASE WHEN fp.image_url IS NOT NULL THEN 1 END) as image_count
      FROM feed_layouts fl
      LEFT JOIN feed_posts fp ON fl.id = fp.feed_layout_id
      WHERE fl.user_id = ${user.id}
      GROUP BY fl.id, fl.brand_name, fl.title, fl.name, fl.created_at, fl.created_by, fl.status
      ORDER BY fl.created_at DESC
    ` as any[]

    // Format response
    const formattedFeeds = feeds.map((feed: any) => ({
      id: feed.id,
      title: feed.title || `Feed ${feed.id}`,
      created_at: feed.created_at,
      created_by: feed.created_by || null,
      status: feed.status,
      post_count: Number(feed.post_count) || 0,
      image_count: Number(feed.image_count) || 0,
    }))

    console.log(`[v0] Retrieved ${formattedFeeds.length} feeds for user ${user.id}`)

    return NextResponse.json({
      feeds: formattedFeeds,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching feed list:", {
      message: error?.message || String(error),
      stack: error?.stack,
    })
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

