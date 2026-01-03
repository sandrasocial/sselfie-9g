/**
 * Maya Feed - Save to Planner Route
 * 
 * Saves a generated feed to the feed planner for viewing/editing.
 * This is essentially a status update - the feed is already created,
 * this just ensures it's properly linked and accessible in the planner.
 * 
 * Note: Feed creation already saves to planner via create-from-strategy.
 * This route is for explicit "save to planner" actions if needed.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 60

/**
 * Save feed to planner
 * 
 * This endpoint ensures a feed is properly saved and accessible in the feed planner.
 * In most cases, feeds are already saved during creation, but this provides
 * an explicit endpoint for saving/updating feed status.
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[MAYA-FEED] Saving feed to planner...")

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = await request.json()

    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      )
    }

    // Verify feed exists and belongs to user
    const [feed] = await sql`
      SELECT id, user_id, status, created_at
      FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!feed) {
      return NextResponse.json(
        { error: "Feed not found or access denied" },
        { status: 404 }
      )
    }

    // Update feed status to ensure it's active and accessible
    await sql`
      UPDATE feed_layouts
      SET status = 'draft',
          updated_at = NOW()
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    // Get feed data with posts for response
    const [feedData] = await sql`
      SELECT 
        id,
        title,
        description,
        brand_name,
        grid_pattern,
        status,
        created_at
      FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
      LIMIT 1
    `

    const posts = await sql`
      SELECT 
        id,
        position,
        post_type,
        caption,
        prompt,
        image_url,
        generation_status
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      AND user_id = ${neonUser.id}
      ORDER BY position ASC
    `

    console.log("[MAYA-FEED] ✅ Feed saved to planner:", feedId)

    return NextResponse.json({
      success: true,
      feedId,
      feed: feedData,
      posts: posts || [],
      message: "Feed saved to planner successfully",
    })
  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error saving feed to planner:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save feed to planner",
      },
      { status: 500 }
    )
  }
}


