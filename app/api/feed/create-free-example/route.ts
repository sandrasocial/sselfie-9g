import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

/**
 * Create Free Example Feed
 * 
 * Phase 5.3.2: Creates a feed with ONE post for free users
 * Used when free users access Feed Planner for the first time
 * This gives them an example grid to generate one image
 */
export async function POST(req: NextRequest) {
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

    // Check if user is free user
    const access = await getFeedPlannerAccess(user.id.toString())
    if (!access.isFree) {
      return NextResponse.json(
        { error: "Only free users can create example feeds" },
        { status: 403 }
      )
    }

    const sql = getDb()

    // Check if user already has a feed
    const existingFeeds = await sql`
      SELECT id FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]

    if (existingFeeds.length > 0) {
      // User already has a feed, return it
      const feedId = existingFeeds[0].id
      const posts = await sql`
        SELECT * FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        ORDER BY position ASC
      ` as any[]

      return NextResponse.json({
        feedId,
        feed: existingFeeds[0],
        posts,
      })
    }

    // Create feed layout
    const title = `My Feed - ${new Date().toLocaleDateString()}`
    let feedResult: any[]
    try {
      feedResult = await sql`
        INSERT INTO feed_layouts (
          user_id,
          brand_name,
          username,
          description,
          status,
          created_by
        )
        VALUES (
          ${user.id},
          ${title},
          ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
          NULL,
          'saved',
          'manual'
        )
        RETURNING *
      ` as any[]
    } catch (error: any) {
      // If created_by field doesn't exist, try without it
      if (error?.message?.includes('created_by') || error?.code === '42703') {
        console.log("[v0] created_by field not found, creating feed without it")
        feedResult = await sql`
          INSERT INTO feed_layouts (
            user_id,
            brand_name,
            username,
            description,
            status
          )
          VALUES (
            ${user.id},
            ${title},
            ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
            NULL,
            'saved'
          )
          RETURNING *
        ` as any[]
      } else {
        throw error
      }
    }

    if (feedResult.length === 0) {
      return NextResponse.json({ error: "Failed to create feed" }, { status: 500 })
    }

    const feedLayout = feedResult[0]
    const feedId = feedLayout.id

    // Phase 5.3.2: Create ONE empty post (position 1) for free users
    const postResult = await sql`
      INSERT INTO feed_posts (
        feed_layout_id,
        user_id,
        position,
        post_type,
        image_url,
        caption,
        generation_status,
        content_pillar,
        prompt,
        generation_mode
      )
      VALUES (
        ${feedId},
        ${user.id},
        1,
        'user',
        NULL,
        NULL,
        'pending',
        NULL,
        NULL,
        'pro'  -- Use Pro Mode (Nano Banana Pro) for free example
      )
      RETURNING *
    ` as any[]

    console.log(`[v0] Created free example feed ${feedId} with 1 post for user ${user.id}`)

    return NextResponse.json({
      feedId,
      feed: feedLayout,
      posts: postResult,
    })
  } catch (error: any) {
    console.error("[v0] Error creating free example feed:", {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      details: error?.details,
    })
    
    const errorMessage = error?.message || "Internal server error"
    const isDatabaseError = error?.code?.startsWith('42') || error?.code?.startsWith('23')
    
    return NextResponse.json(
      { 
        error: isDatabaseError ? "Database error" : "Internal server error", 
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}