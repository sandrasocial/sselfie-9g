/**
 * GET /api/maya/feed/list
 * 
 * Retrieve all feeds for the current user
 * Wrapper endpoint in Maya namespace for consistency
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    console.log("[MAYA-FEED] Listing feeds for user...")

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[MAYA-FEED] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      console.error("[MAYA-FEED] User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()

    // Get all feeds for user
    const feedLayouts = await sql`
      SELECT 
        id,
        title,
        description,
        brand_vibe,
        business_type,
        layout_type,
        visual_rhythm,
        color_palette,
        status,
        created_at,
        updated_at
      FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    // Get posts for each feed
    const feedsWithPosts = await Promise.all(
      feedLayouts.map(async (feed: any) => {
        // Get all posts for this feed
        const posts = await sql`
          SELECT 
            id,
            position,
            post_type,
            image_url,
            caption,
            prompt,
            generation_status,
            prediction_id,
            created_at
          FROM feed_posts
          WHERE feed_layout_id = ${feed.id}
          ORDER BY position ASC
        `

        const postCount = posts.length
        const completedCount = posts.filter((p: any) => 
          p.generation_status === 'completed' || p.generation_status === 'ready'
        ).length

        return {
          id: feed.id,
          feedId: feed.id,
          title: feed.title,
          feedTitle: feed.title,
          description: feed.description,
          overallVibe: feed.description || feed.visual_rhythm || '',
          aesthetic: feed.brand_vibe || '',
          colorPalette: feed.color_palette || '',
          status: feed.status || 'pending',
          createdAt: feed.created_at,
          created_at: feed.created_at,
          totalCredits: 0, // Will be calculated if needed
          posts: posts.map((post: any) => ({
            id: post.id,
            position: post.position,
            postType: post.post_type || 'user',
            post_type: post.post_type || 'user',
            imageUrl: post.image_url,
            image_url: post.image_url,
            caption: post.caption || '',
            prompt: post.prompt || '',
            status: post.generation_status === 'completed' ? 'complete' : 
                    post.generation_status === 'ready' ? 'complete' :
                    post.generation_status === 'generating' ? 'generating' :
                    post.generation_status === 'failed' ? 'failed' : 'pending',
            generationStatus: post.generation_status === 'completed' ? 'complete' : 
                              post.generation_status === 'ready' ? 'ready' :
                              post.generation_status === 'generating' ? 'generating' :
                              post.generation_status === 'failed' ? 'failed' : 'pending',
            predictionId: post.prediction_id,
            prediction_id: post.prediction_id,
          })),
          postCount,
          completedCount,
        }
      })
    )

    console.log(`[MAYA-FEED] ✅ Found ${feedsWithPosts.length} feeds for user`)

    return NextResponse.json({ 
      feeds: feedsWithPosts,
      count: feedsWithPosts.length
    })

  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error listing feeds:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch feeds",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

