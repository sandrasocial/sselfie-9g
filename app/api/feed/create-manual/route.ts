import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"
import {
  getDefaultVariationId,
  getFeedStyleV2ByName,
  getFeedStyleVariationById,
} from "@/lib/feed-planner/feed-style-prompt-loader"

/**
 * Create Manual Feed
 * 
 * Creates an empty feed with 9 placeholder posts that can be filled manually.
 * User can upload images or select from gallery, then add captions.
 */
async function handleCreateManualFeed({
  request: req,
  user,
}: {
  request: Request | NextRequest
  user: { id: string | number; name?: string | null }
}) {
  try {
    const sql = getDb()

    // Get optional title, feedStyle, visualAesthetic, and fashionStyle from request body
    let body: any = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Body is empty or invalid JSON, use defaults
      console.log("[v0] No body or invalid JSON, using defaults")
    }
    const title = body.title || `My Feed - ${new Date().toLocaleDateString()}`
    let feedStyle = body.feedStyle || null // "luxury", "minimal", or "beige"
    let visualAesthetic = body.visualAesthetic || null // Array of visual aesthetics
    let fashionStyle = body.fashionStyle || null // Array of fashion styles
    // CRITICAL: Accept feedStyleVariationId even if it's null (user explicitly selected "no variation")
    // Only treat as "not provided" if it's truly undefined
    let requestedVariationId: number | null | undefined = undefined
    if (body.feedStyleVariationId !== undefined) {
      if (body.feedStyleVariationId === null) {
        requestedVariationId = null
        console.log(`[v0] Manual feed: User explicitly selected null variation (no variation)`)
      } else {
        requestedVariationId = Number(body.feedStyleVariationId)
        if (Number.isFinite(requestedVariationId)) {
          console.log(`[v0] Manual feed: User selected variationId=${requestedVariationId}`)
        } else {
          requestedVariationId = null
          console.warn(`[v0] Manual feed: Invalid variationId in body, using null`)
        }
      }
    } else {
      console.log(`[v0] Manual feed: feedStyleVariationId not provided in request body`)
    }

    // Validate and prepare JSONB arrays
    const prepareJsonbArray = (value: any): any => {
      if (!value) return null
      if (Array.isArray(value)) {
        return value.length > 0 ? value : null
      }
      // If single string, convert to array
      if (typeof value === 'string') {
        return [value]
      }
      return null
    }

    visualAesthetic = prepareJsonbArray(visualAesthetic)
    fashionStyle = prepareJsonbArray(fashionStyle)

    let personalBrandVariationId: number | null = null
    if (!feedStyle || !requestedVariationId) {
      const [personalBrand] = await sql`
        SELECT settings_preference, feed_style_variation_id
        FROM user_personal_brand
        WHERE user_id = ${user.id}
        ORDER BY updated_at DESC
        LIMIT 1
      `
      const settingsPreference = personalBrand?.settings_preference
      personalBrandVariationId = personalBrand?.feed_style_variation_id
        ? Number(personalBrand.feed_style_variation_id)
        : null
      if (!feedStyle && settingsPreference) {
        try {
          const settings = typeof settingsPreference === "string"
            ? JSON.parse(settingsPreference)
            : settingsPreference
          if (Array.isArray(settings) && settings.length > 0) {
            const rawStyle = settings[0]?.trim?.() || null
            feedStyle = rawStyle
          }
        } catch {
          // Ignore parse errors; fall through to validation
        }
      }
    }

    if (!feedStyle) {
      return NextResponse.json(
        { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a feed." },
        { status: 422 }
      )
    }
    
    // Log feed-specific style selections that will be persisted
    if (visualAesthetic) {
      console.log(`[v0] Feed will be created with feed-specific visualAesthetic:`, visualAesthetic)
    }
    if (fashionStyle) {
      console.log(`[v0] Feed will be created with feed-specific fashionStyle:`, fashionStyle)
    }

    let feedStyleVariationIdToStore: number | null = null
    if (feedStyle) {
      const style = await getFeedStyleV2ByName(feedStyle)
      if (!style) {
        return NextResponse.json(
          { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
          { status: 422 }
        )
      }

      // CRITICAL: Prioritize requestedVariationId (from user's modal selection)
      // Only fall back to personalBrandVariationId if requestedVariationId is not provided (undefined)
      // If requestedVariationId is explicitly null, use default (user selected "no variation")
      if (requestedVariationId !== null && requestedVariationId !== undefined) {
        // User provided a specific variation ID - use it
        const variation = await getFeedStyleVariationById(requestedVariationId)
        if (!variation || !variation.enabled || variation.feed_style_id !== style.id) {
          console.warn(`[v0] Invalid variationId=${requestedVariationId} for styleId=${style.id}, falling back to default`)
          feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
        } else {
          feedStyleVariationIdToStore = variation.id
          console.log(`[v0] Using requested variationId=${feedStyleVariationIdToStore} for styleId=${style.id}`)
        }
      } else if (requestedVariationId === null) {
        // User explicitly selected null (no variation) - use default
        console.log(`[v0] User selected null variation, using default for styleId=${style.id}`)
        feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
      } else if (personalBrandVariationId) {
        const variation = await getFeedStyleVariationById(personalBrandVariationId)
        if (variation && variation.enabled && variation.feed_style_id === style.id) {
          feedStyleVariationIdToStore = variation.id
        } else {
          feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
        }
      } else {
        feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
      }
    }

    // Create feed layout with layout_type: 'grid_3x3' for full feeds (3x3 grid = 9 posts)
    // Set status to 'saved' so feed appears immediately in Feed Planner
    // Include feed_style, visual_aesthetic, and fashion_style for feed-specific overrides
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
          feed_style_variation_id,
          visual_aesthetic,
          fashion_style,
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
          ${feedStyleVariationIdToStore},
          ${visualAesthetic}::jsonb,
          ${fashionStyle}::jsonb,
          'manual'
        )
        RETURNING *
      ` as any[]
    } catch (error: any) {
      // If created_by, visual_aesthetic, or fashion_style fields don't exist, try without them
      if (
        error?.message?.includes('created_by') ||
        error?.message?.includes('visual_aesthetic') ||
        error?.message?.includes('fashion_style') ||
        error?.message?.includes('feed_style_variation_id') ||
        error?.code === '42703'
      ) {
        console.log("[v0] New columns not found, trying without visual_aesthetic/fashion_style")
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
              feed_style_variation_id,
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
              ${feedStyleVariationIdToStore},
              'manual'
            )
            RETURNING *
          ` as any[]
        } catch (error2: any) {
          // If created_by also doesn't exist, try without it
          if (error2?.message?.includes('created_by') || error2?.code === '42703') {
            console.log("[v0] created_by field not found, creating feed without it")
            feedResult = await sql`
              INSERT INTO feed_layouts (
                user_id,
                brand_name,
                username,
                description,
                status,
                layout_type,
                feed_style,
                feed_style_variation_id
              )
              VALUES (
                ${user.id},
                ${title},
                ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
                NULL,
                'saved',
                'grid_3x3',
                ${feedStyle},
                ${feedStyleVariationIdToStore}
              )
              RETURNING *
            ` as any[]
          } else {
            throw error2
          }
        }
      } else {
        throw error
      }
    }

    if (feedResult.length === 0) {
      return NextResponse.json({ error: "Failed to create feed" }, { status: 500 })
    }

    const feedLayout = feedResult[0]
    const feedId = feedLayout.id
    
    // Verify the stored values match what we intended
    const storedVariationId = feedLayout.feed_style_variation_id
    const storedFeedStyle = feedLayout.feed_style
    console.log(`[v0] Created manual feed ${feedId}: feedStyle=${storedFeedStyle} (requested: ${feedStyle}), variationId=${storedVariationId} (requested: ${feedStyleVariationIdToStore})`)
    
    // Validation: Ensure stored values match requested
    if (storedFeedStyle !== feedStyle) {
      console.error(`[v0] ⚠️ Feed style mismatch! Stored: ${storedFeedStyle}, Requested: ${feedStyle}`)
    }
    if (storedVariationId !== feedStyleVariationIdToStore) {
      console.error(`[v0] ⚠️ Variation ID mismatch! Stored: ${storedVariationId}, Requested: ${feedStyleVariationIdToStore}`)
    }

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

    // Prompts will be generated on-demand when user clicks to generate each image
    // This is simpler and more reliable than pre-generation

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
      cause: error?.cause,
    })
    
    // Return more specific error message
    const errorMessage = error?.message || "Internal server error"
    const isDatabaseError = error?.code?.startsWith('42') || error?.code?.startsWith('23') || error?.code?.startsWith('P')
    
    // For database errors, provide more context
    if (isDatabaseError) {
      return NextResponse.json(
        { 
          error: "Database error", 
          details: errorMessage,
          code: error?.code,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handleCreateManualFeed, { authMode: "retry" })
