import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"
import { getUserByAuthId } from "@/lib/user-mapping"

/**
 * Get Preview Feed Data
 * 
 * Returns preview feed information for paid blueprint users who upgraded from free.
 * Used to show preview image in welcome wizard.
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

    // Get user's preview feed (layout_type: 'preview')
    const previewFeeds = await sql`
      SELECT id, created_at, layout_type
      FROM feed_layouts
      WHERE user_id = ${user.id}
        AND layout_type = 'preview'
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]

    if (previewFeeds.length === 0) {
      return NextResponse.json({ 
        hasPreviewFeed: false,
        previewImageUrl: null,
        previewFeedId: null,
      })
    }

    const previewFeed = previewFeeds[0]

    // Get the preview image (first post's image_url)
    const previewPosts = await sql`
      SELECT image_url, position
      FROM feed_posts
      WHERE feed_layout_id = ${previewFeed.id}
        AND image_url IS NOT NULL
      ORDER BY position ASC
      LIMIT 1
    ` as any[]

    const previewImageUrl = previewPosts.length > 0 ? previewPosts[0].image_url : null

    return NextResponse.json({
      hasPreviewFeed: true,
      previewImageUrl,
      previewFeedId: previewFeed.id,
      createdAt: previewFeed.created_at,
    })
  } catch (error: any) {
    console.error("[v0] [PREVIEW-FEED] Error fetching preview feed:", {
      message: error?.message || String(error),
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
