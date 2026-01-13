import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

/**
 * Create Manual Feed
 * 
 * Creates an empty feed with 9 placeholder posts that can be filled manually.
 * User can upload images or select from gallery, then add captions.
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

    const sql = getDb()

    // Get optional title from request body
    let body: any = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (e) {
      // Body is empty or invalid JSON, use defaults
      console.log("[v0] No body or invalid JSON, using defaults")
    }
    const title = body.title || `My Feed - ${new Date().toLocaleDateString()}`

    // Create feed layout with layout_type: 'grid_3x4' for full feeds
    // Set status to 'saved' so feed appears immediately in Feed Planner
    // Try with created_by field first, fallback if field doesn't exist
    let feedResult: any[]
    try {
      feedResult = await sql`
        INSERT INTO feed_layouts (
          user_id,
          brand_name,
          username,
          description,
          status,
          layout_type,
          created_by
        )
        VALUES (
          ${user.id},
          ${title},
          ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
          NULL,
          'saved',
          'grid_3x4',
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
            status,
            layout_type
          )
          VALUES (
            ${user.id},
            ${title},
            ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
            NULL,
            'saved',
            'grid_3x4'
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

    // Create 9 empty posts (position 1-9)
    const posts = []
    for (let position = 1; position <= 9; position++) {
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
          prompt
        )
        VALUES (
          ${feedId},
          ${user.id},
          ${position},
          'user',
          NULL,
          NULL,
          'pending',
          NULL,
          NULL
        )
        RETURNING *
      ` as any[]

      if (postResult.length > 0) {
        posts.push(postResult[0])
      }
    }

    console.log(`[v0] Created full feed ${feedId} with ${posts.length} empty posts for user ${user.id} (layout_type: grid_3x4)`)

    return NextResponse.json({
      feedId,
      feed: feedLayout,
      posts,
    })
  } catch (error: any) {
    console.error("[v0] Error creating manual feed:", {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      details: error?.details,
    })
    
    // Return more specific error message
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

