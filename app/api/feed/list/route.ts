import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"

/**
 * Get Feed List
 * 
 * Returns all feeds for the current user, ordered by most recent first.
 * Includes basic feed info and post counts.
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user (same pattern as chat history)
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use same pattern as chat history - getEffectiveNeonUser handles impersonation
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const user = await getEffectiveNeonUser(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    
    // Use user.id directly (same as other working feed APIs)
    // Get all feeds for user with post counts using a simpler approach
    // First get all feed layouts
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${user.id}
        AND status IN ('saved', 'completed', 'draft')
      ORDER BY created_at DESC
    ` as any[]

    if (feedLayouts.length === 0) {
      return NextResponse.json({ feeds: [] })
    }

    // Get all post counts in one query using array aggregation
    const feedIds = feedLayouts.map((f: any) => f.id)
    const postCounts = await sql`
      SELECT 
        feed_layout_id,
        COUNT(*) as post_count,
        COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as image_count
      FROM feed_posts
      WHERE feed_layout_id = ANY(${feedIds})
      GROUP BY feed_layout_id
    ` as any[]

    // Create a map for quick lookup
    const countsMap = new Map(
      postCounts.map((pc: any) => [
        pc.feed_layout_id,
        { post_count: Number(pc.post_count) || 0, image_count: Number(pc.image_count) || 0 }
      ])
    )

    // Format feeds with counts
    const feeds = feedLayouts.map((feed: any) => {
      const counts = countsMap.get(feed.id) || { post_count: 0, image_count: 0 }
      const title = feed.title || feed.brand_name || `Feed ${feed.id}`

      return {
        id: feed.id,
        title,
        created_at: feed.created_at,
        status: feed.status,
        post_count: counts.post_count,
        image_count: counts.image_count,
        display_color: feed.display_color || null,
      }
    })

    return NextResponse.json({
      feeds,
    })
  } catch (error: any) {
    console.error("[v0] [FEED-LIST] Error fetching feed list:", {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      details: error?.details,
    })
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error?.message || String(error),
        code: error?.code,
      },
      { status: 500 }
    )
  }
}

