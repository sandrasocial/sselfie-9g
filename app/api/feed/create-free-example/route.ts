import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getCategoryAndMood } from '@/lib/feed-planner/generation-helpers'

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

    // Parse request body for feedStyle, visualAesthetic, and fashionStyle
    let requestedFeedStyle: string | null = null
    let requestedVisualAesthetic: any = null
    let requestedFashionStyle: any = null
    
    try {
      const body = await req.json().catch(() => ({}))
      
      // Parse feedStyle
      if (body.feedStyle && typeof body.feedStyle === 'string') {
        requestedFeedStyle = body.feedStyle.toLowerCase().trim()
        // Validate feedStyle
        const validStyles = ['luxury', 'minimal', 'beige']
        if (!validStyles.includes(requestedFeedStyle)) {
          console.warn(`[v0] Invalid feedStyle requested: ${requestedFeedStyle}, rejecting`)
          requestedFeedStyle = null
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
    // Use template-based prompts from grid library based on user's current style choices
    let templatePrompt = null
    let feedStyleToStore: string | null = requestedFeedStyle // Use requested feedStyle first
    
    try {
      // If no feedStyle provided, try to get from personal brand
      if (!feedStyleToStore) {
        const { category, mood } = await getCategoryAndMood(
          null,
          { id: user.id },
          {
            checkSettingsPreference: true,
            checkBlueprintSubscribers: true,
            trackSource: true,
          }
        )
        feedStyleToStore = mood
      }
      
      // REQUIRED VALIDATION: feedStyle must be provided or resolved
      if (!feedStyleToStore) {
        return NextResponse.json(
          { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a preview feed." },
          { status: 422 }
        )
      }
      
      console.log(`[v0] Preview feed will use feedStyle: ${feedStyleToStore}`)
      
      // Phase 2E: Get template prompt via getBlueprintPhotoshootPrompt (includes subject identity override)
      const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
      const { validateBlueprintTemplate } = await import("@/lib/feed-planner/extract-aesthetic-from-template")
      
      // Fetch fashionStyle from user_personal_brand if not provided in request
      let fashionStyle: string | null = null
      if (requestedFashionStyle && requestedFashionStyle.length > 0) {
        fashionStyle = requestedFashionStyle[0]
      } else {
        // Try to fetch from user_personal_brand
        try {
          const brandResult = await sql`
            SELECT fashion_style FROM user_personal_brand
            WHERE user_id = ${user.id} AND is_completed = true
            LIMIT 1
          `
          if (brandResult.length > 0 && brandResult[0].fashion_style) {
            const fashionStyleArray = Array.isArray(brandResult[0].fashion_style) 
              ? brandResult[0].fashion_style 
              : [brandResult[0].fashion_style]
            if (fashionStyleArray.length > 0) {
              fashionStyle = fashionStyleArray[0]
            }
          }
        } catch (error) {
          console.warn(`[v0] Could not fetch fashionStyle from user_personal_brand:`, error)
        }
      }
      
      // Use feedStyleToStore as mood for template generation
      const moodForTemplate = feedStyleToStore as "luxury" | "minimal" | "beige"
      
      try {
        templatePrompt = getBlueprintPhotoshootPrompt(category, moodForTemplate, fashionStyle)
        
        // Validate template can be properly extracted for NanoBanana structure
        const validation = validateBlueprintTemplate(templatePrompt)
        if (!validation.isValid) {
          console.warn(`[v0] ⚠️ Template ${category}_${moodForTemplate} has missing fields:`, validation.missingFields)
          console.warn(`[v0] ⚠️ Warnings:`, validation.warnings)
        } else {
          console.log(`[v0] ✅ Template ${category}_${moodForTemplate} validated successfully`)
        }
        console.log(`[v0] Using template prompt from canonical resolver with subject identity override: ${category}_${moodForTemplate} (${templatePrompt.split(/\s+/).length} words)`)
      } catch (error) {
        console.error(`[v0] Error getting template prompt:`, error)
        templatePrompt = null
      }
    } catch (error) {
      console.error("[v0] Error getting template prompt for free example:", error)
      // If feedStyle is missing at this point, return error (should have been caught above)
      if (!feedStyleToStore) {
        return NextResponse.json(
          { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a preview feed." },
          { status: 422 }
        )
      }
      // Continue without prompt - it will be generated on first generation
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
          ${requestedVisualAesthetic ? requestedVisualAesthetic : null}::jsonb,
          ${requestedFashionStyle ? requestedFashionStyle : null}::jsonb,
          'manual'
        )
        RETURNING *
      ` as any[]
    } catch (error: any) {
      // If created_by, visual_aesthetic, or fashion_style fields don't exist, try without them
      if (error?.message?.includes('created_by') || error?.message?.includes('visual_aesthetic') || error?.message?.includes('fashion_style') || error?.code === '42703') {
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
    // templatePrompt was already determined above (before feed layout creation)
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
        ${templatePrompt},  -- Template prompt from grid library based on wizard context (or NULL if no wizard data yet)
        'pro'  -- Use Pro Mode (Nano Banana Pro) for free example
      )
      RETURNING *
    ` as any[]

    console.log(`[v0] Created preview feed ${feedId} with 1 post for user ${user.id} (layout_type: preview, Pro Mode, prompt: ${templatePrompt ? 'template' : 'pending'})`)

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