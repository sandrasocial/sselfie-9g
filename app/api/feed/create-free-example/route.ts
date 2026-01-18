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

    // Parse request body for feedStyle, visualAesthetic, and fashionStyle (optional)
    let requestedFeedStyle: string | null = null
    let requestedVisualAesthetic: string[] | null = null
    let requestedFashionStyle: string[] | null = null
    
    try {
      const body = await req.json().catch(() => ({}))
      
      // Parse feedStyle
      if (body.feedStyle && typeof body.feedStyle === 'string') {
        requestedFeedStyle = body.feedStyle.toLowerCase().trim()
        // Validate feedStyle
        const validStyles = ['luxury', 'minimal', 'beige']
        if (!validStyles.includes(requestedFeedStyle)) {
          console.warn(`[v0] Invalid feedStyle requested: ${requestedFeedStyle}, using default`)
          requestedFeedStyle = null
        }
      }
      
      // Parse visualAesthetic (array)
      if (body.visualAesthetic && Array.isArray(body.visualAesthetic) && body.visualAesthetic.length > 0) {
        requestedVisualAesthetic = body.visualAesthetic.map((v: string) => v.toLowerCase().trim())
        console.log(`[v0] Requested visualAesthetic:`, requestedVisualAesthetic)
      }
      
      // Parse fashionStyle (array)
      if (body.fashionStyle && Array.isArray(body.fashionStyle) && body.fashionStyle.length > 0) {
        requestedFashionStyle = body.fashionStyle.map((v: string) => v.toLowerCase().trim())
        console.log(`[v0] Requested fashionStyle:`, requestedFashionStyle)
      }
    } catch (e) {
      // No body or invalid JSON - continue with default behavior
      console.log(`[v0] No body in request, using user's default`)
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
    let feedStyleToStore: string | null = null
    try {
      // Use canonical category resolver (Phase 1C/1D)
      const { category, mood } = await getCategoryAndMood(
        null,
        { id: user.id },
        {
          checkSettingsPreference: true,
          checkBlueprintSubscribers: true,
          trackSource: true,
        }
      )
      
      // Use requested feedStyle if provided (for feed_layouts storage)
      if (requestedFeedStyle) {
        feedStyleToStore = requestedFeedStyle
        console.log(`[v0] Using requested feedStyle for storage: ${requestedFeedStyle}`)
      } else {
        // Extract feedStyle from mood for storage
        feedStyleToStore = mood
      }
      
      // Get template prompt from grid library
      const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
      const { validateBlueprintTemplate } = await import("@/lib/feed-planner/extract-aesthetic-from-template")
      // Map mood correctly using MOOD_MAP
      const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
      const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
      templatePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey] || null
      
      if (templatePrompt) {
        // Validate template can be properly extracted for NanoBanana structure
        const validation = validateBlueprintTemplate(templatePrompt)
        if (!validation.isValid) {
          console.warn(`[v0] ⚠️ Template ${templateKey} has missing fields:`, validation.missingFields)
          console.warn(`[v0] ⚠️ Warnings:`, validation.warnings)
        } else {
          console.log(`[v0] ✅ Template ${templateKey} validated successfully`)
        }
        console.log(`[v0] Using template prompt from canonical resolver: ${category}_${moodMapped} (${templatePrompt.split(/\s+/).length} words)`)
      } else {
        console.log(`[v0] Template not found for ${category}_${moodMapped} - prompt will be generated on first generation`)
      }
    } catch (error) {
      console.error("[v0] Error getting template prompt for free example:", error)
      // Continue without prompt - it will be generated on first generation
    }

    // Ensure preview feeds always store a feed_style (fallback to minimal)
    if (!feedStyleToStore) {
      feedStyleToStore = "minimal"
    }

    // Create feed layout with layout_type: 'preview'
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
            'preview',
            ${feedStyleToStore}
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