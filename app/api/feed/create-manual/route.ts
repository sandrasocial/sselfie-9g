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

    // Get optional title and feedStyle from request body
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
    const feedStyle = body.feedStyle || null // "luxury", "minimal", or "beige"

    // Create feed layout with layout_type: 'grid_3x3' for full feeds (3x3 grid = 9 posts)
    // Set status to 'saved' so feed appears immediately in Feed Planner
    // Include feed_style if provided
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
          feed_style,
          created_by
        )
        VALUES (
          ${user.id},
          ${title},
          ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
          NULL,
          'saved',
          'grid_3x3',
          ${feedStyle},
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
            layout_type,
            feed_style
          )
          VALUES (
            ${user.id},
            ${title},
            ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
            NULL,
            'saved',
            'grid_3x3',
            ${feedStyle}
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

    // Create 9 empty posts (position 1-9) for 3x3 grid
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

    // Store template prompt in position 1 for frame extraction (paid blueprint users)
    if (feedStyle) {
      try {
        const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
        
        // Get category from user_personal_brand or use feedStyle as category
        const personalBrand = await sql`
          SELECT visual_aesthetic
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 1
        ` as any[]
        
        let category: string = feedStyle // Default to feedStyle as category
        if (personalBrand && personalBrand.length > 0 && personalBrand[0].visual_aesthetic) {
          try {
            const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
              ? JSON.parse(personalBrand[0].visual_aesthetic)
              : personalBrand[0].visual_aesthetic
            
            if (Array.isArray(aesthetics) && aesthetics.length > 0) {
              category = aesthetics[0]?.toLowerCase().trim() || feedStyle
            }
          } catch (e) {
            console.warn(`[v0] Failed to parse visual_aesthetic:`, e)
          }
        }
        
        const mood = feedStyle
        const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
        const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
        const templatePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
        
        if (templatePrompt) {
          await sql`
            UPDATE feed_posts
            SET prompt = ${templatePrompt}
            WHERE feed_layout_id = ${feedId} AND position = 1
          `
          console.log(`[v0] ✅ Stored template ${templateKey} in position 1 for feed ${feedId}`)
        } else {
          console.warn(`[v0] ⚠️ Template ${templateKey} not found - position 1 will generate prompt on first generation`)
        }
      } catch (error) {
        console.error("[v0] Error storing template in position 1:", error)
        // Continue - template will be generated on first generation
      }
    }

    console.log(`[v0] Created full feed ${feedId} with ${posts.length} empty posts for user ${user.id} (layout_type: grid_3x3)`)

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

