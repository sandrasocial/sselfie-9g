import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getFeedPlannerV2Flag } from "@/lib/feed-planner-v2/feature-flag"
import {
  getDefaultVariationId,
  getFeedStyleV2ByName,
  getFeedStyleVariationById,
} from "@/lib/feed-planner-v2/prompt-loader"

/**
 * Create Preview Feed
 * 
 * Creates a feed with ONE post for preview feed generation (9:16 aspect ratio)
 * Available to all users (free and paid) - credit check already implemented in generation
 * Sets layout_type: 'preview' to distinguish from full feeds
 * 
 * Accepts optional feedStyle in request body to override user's default style
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

    const useFeedPlannerV2 = await getFeedPlannerV2Flag(user.id)
    if (!useFeedPlannerV2) {
      console.warn(
        "[v0] Feed Planner V2 flag is off for user, but preview feeds are V2-only now. Proceeding."
      )
    }

    // Parse request body for feedStyle, visualAesthetic, and fashionStyle
    let requestedFeedStyle: string | null = null
    let requestedVisualAesthetic: any = null
    let requestedFashionStyle: any = null
    let requestedVariationId: number | null = null
    
    try {
      const body = await req.json().catch(() => ({}))
      
      // Parse feedStyle
      if (body.feedStyle && typeof body.feedStyle === 'string') {
        const rawStyle = body.feedStyle.trim()
        const validV2Styles = [
          "Dark & Moody",
          "Beige Aesthetic",
          "Light & Minimalistic",
          "Luxury Future Self",
          "Casual Bohemian",
          "Athletic & Wellness",
          "Coastal Aesthetics",
        ]
        const match = validV2Styles.find(
          (style) => style.toLowerCase() === rawStyle.toLowerCase()
        )
        if (!match) {
          console.warn(`[v0] Invalid V2 feedStyle requested: ${rawStyle}, rejecting`)
          requestedFeedStyle = null
        } else {
          requestedFeedStyle = match
        }
      }
      
      // Parse visualAesthetic (array) - will be stored in feed_layouts
      if (body.visualAesthetic && Array.isArray(body.visualAesthetic) && body.visualAesthetic.length > 0) {
        requestedVisualAesthetic = body.visualAesthetic.map((v: string) => v.toLowerCase().trim())
        console.log(`[v0] Preview feed will use visualAesthetic:`, requestedVisualAesthetic)
      }
      
      // Parse fashionStyle (array) - will be stored in feed_layouts
      if (body.fashionStyle && Array.isArray(body.fashionStyle) && body.fashionStyle.length > 0) {
        requestedFashionStyle = body.fashionStyle.map((v: string) => v.toLowerCase().trim())
        console.log(`[v0] Preview feed will use fashionStyle:`, requestedFashionStyle)
      }

      if (body.feedStyleVariationId !== undefined && body.feedStyleVariationId !== null) {
        const numericVariation = Number(body.feedStyleVariationId)
        requestedVariationId = Number.isFinite(numericVariation) ? numericVariation : null
      }
    } catch (e) {
      // No body or invalid JSON
      console.log(`[v0] No body in request, feedStyle will be required`)
    }

    // Removed free-only restriction - all users can create preview feeds
    // Credit check is already implemented in generate-single endpoint

    const sql = getDb()

    // ALWAYS create a NEW preview feed - never reuse existing feeds
    // Users should be able to create multiple preview feeds with different styles
    // This allows them to test different feed styles without losing previous work

    // Get wizard context using canonical category resolver
    let feedStyleToStore: string | null = requestedFeedStyle // Use requested feedStyle first
    let feedStyleVariationIdToStore: number | null = null
    let personalBrandVariationId: number | null = null
    
    try {
      // If no feedStyle provided, try to get from personal brand
      if (!feedStyleToStore) {
        const [personalBrand] = await sql`
          SELECT settings_preference, feed_style_variation_id
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY updated_at DESC
          LIMIT 1
        `
        personalBrandVariationId = personalBrand?.feed_style_variation_id
          ? Number(personalBrand.feed_style_variation_id)
          : null
        const settingsPreference = personalBrand?.settings_preference

        if (settingsPreference) {
          try {
            const settings = typeof settingsPreference === "string"
              ? JSON.parse(settingsPreference)
              : settingsPreference
            if (Array.isArray(settings) && settings.length > 0) {
              const rawStyle = settings[0]?.trim?.() || null
              feedStyleToStore = rawStyle
            }
          } catch {
            // Ignore parse errors; fall through to validation
          }
        }

        if (!feedStyleToStore) {
          return NextResponse.json(
            { error: "FEED_STYLE_REQUIRED", details: "Feed style is required for V2 preview feeds." },
            { status: 422 }
          )
        }
      }

      if (!requestedVariationId && !personalBrandVariationId) {
        const [personalBrand] = await sql`
          SELECT feed_style_variation_id
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY updated_at DESC
          LIMIT 1
        `
        personalBrandVariationId = personalBrand?.feed_style_variation_id
          ? Number(personalBrand.feed_style_variation_id)
          : null
      }
      
      // REQUIRED VALIDATION: feedStyle must be provided or resolved
      if (!feedStyleToStore) {
        return NextResponse.json(
          { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a preview feed." },
          { status: 422 }
        )
      }
      
      console.log(`[v0] Preview feed will use feedStyle: ${feedStyleToStore}`)

      if (feedStyleToStore) {
        const style = await getFeedStyleV2ByName(feedStyleToStore)
        if (!style) {
          return NextResponse.json(
            { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
            { status: 422 }
          )
        }

        if (requestedVariationId) {
          const variation = await getFeedStyleVariationById(requestedVariationId)
          if (!variation || !variation.enabled || variation.feed_style_id !== style.id) {
            return NextResponse.json(
              { error: "FEED_STYLE_VARIATION_INVALID", details: "Selected variation is not valid for this style." },
              { status: 422 }
            )
          }
          feedStyleVariationIdToStore = variation.id
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
      
    } catch (error) {
      console.error("[v0] Error resolving feed style for free example:", error)
      // If feedStyle is missing at this point, return error (should have been caught above)
      if (!feedStyleToStore) {
        return NextResponse.json(
          { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a preview feed." },
          { status: 422 }
        )
      }
      // Continue without prompt - prompt will be generated during preview generation
    }

    // Create feed layout with layout_type: 'preview'
    // Include feed-specific visual_aesthetic and fashion_style if provided
    const title = `Preview Feed - ${new Date().toLocaleDateString()}`
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
          'preview',
          ${feedStyleToStore},
          ${feedStyleVariationIdToStore},
          ${requestedVisualAesthetic ? requestedVisualAesthetic : null}::jsonb,
          ${requestedFashionStyle ? requestedFashionStyle : null}::jsonb,
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
              created_by
            )
            VALUES (
              ${user.id},
              ${title},
              ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
              NULL,
              'saved',
              'preview',
              ${feedStyleToStore},
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
                feed_style
              )
              VALUES (
                ${user.id},
                ${title},
                ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
                NULL,
                'saved',
                'preview',
                ${feedStyleToStore}
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

    console.log(`[v0] Created preview feed ${feedId} with 1 post for user ${user.id} (layout_type: preview, Pro Mode, prompt: pending)`)

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