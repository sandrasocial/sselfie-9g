import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

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

    // Get wizard context from user_personal_brand (unified wizard) - PRIMARY SOURCE
    // Use template-based prompts from grid library based on user's current style choices
    let templatePrompt = null
    let feedStyleToStore: string | null = null
    try {
      // PRIMARY: Try unified wizard (user_personal_brand)
      const personalBrand = await sql`
        SELECT settings_preference, visual_aesthetic
        FROM user_personal_brand
        WHERE user_id = ${user.id}
        ORDER BY updated_at DESC
        LIMIT 1
      ` as any[]
      
      if (personalBrand && personalBrand.length > 0) {
        let feedStyle: string | null = null
        let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
        let mood: "luxury" | "minimal" | "beige" = "minimal"
        
        // Extract feedStyle from settings_preference (unless overridden by request)
        if (requestedFeedStyle) {
          // Use requested feedStyle from modal selection
          feedStyle = requestedFeedStyle
          feedStyleToStore = feedStyle
          if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
            mood = feedStyle as "luxury" | "minimal" | "beige"
          }
          console.log(`[v0] Using requested feedStyle: ${feedStyle}`)
        } else if (personalBrand[0].settings_preference) {
          // Fall back to user's saved preference
          try {
            const settings = typeof personalBrand[0].settings_preference === 'string'
              ? JSON.parse(personalBrand[0].settings_preference)
              : personalBrand[0].settings_preference
            
            if (Array.isArray(settings) && settings.length > 0) {
              feedStyle = settings[0]?.toLowerCase().trim()
              feedStyleToStore = feedStyle // Store for feed_layouts
              if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
                mood = feedStyle as "luxury" | "minimal" | "beige"
              }
            }
          } catch (e) {
            console.warn(`[v0] Failed to parse settings_preference:`, e)
          }
        }
        
        // Extract category from visual_aesthetic (use requested if provided, otherwise saved)
        if (requestedVisualAesthetic && requestedVisualAesthetic.length > 0) {
          // Use first requested visual aesthetic as category
          const firstAesthetic = requestedVisualAesthetic[0]
          const validCategories: Array<"luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"> = 
            ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
          if (validCategories.includes(firstAesthetic as any)) {
            category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
            console.log(`[v0] Using requested visualAesthetic for category: ${category}`)
          }
        } else if (personalBrand[0].visual_aesthetic) {
          // Fall back to saved visual aesthetic
          try {
            const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
              ? JSON.parse(personalBrand[0].visual_aesthetic)
              : personalBrand[0].visual_aesthetic
            
            if (Array.isArray(aesthetics) && aesthetics.length > 0) {
              const firstAesthetic = aesthetics[0]?.toLowerCase().trim()
              const validCategories: Array<"luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"> = 
                ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
              
              if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
                category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
              }
            }
          } catch (e) {
            console.warn(`[v0] Failed to parse visual_aesthetic:`, e)
          }
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
          console.log(`[v0] Using template prompt from unified wizard: ${category}_${moodMapped} (${templatePrompt.split(/\s+/).length} words)`)
        } else {
          console.log(`[v0] Template not found for ${category}_${moodMapped} - prompt will be generated on first generation`)
        }
      } else {
        // FALLBACK: Try legacy blueprint_subscribers
        console.log(`[v0] No user_personal_brand found, checking blueprint_subscribers (legacy)...`)
        const blueprintSubscriber = await sql`
          SELECT form_data, feed_style
          FROM blueprint_subscribers
          WHERE user_id = ${user.id}
          LIMIT 1
        ` as any[]
        
        if (blueprintSubscriber.length > 0) {
          const formData = blueprintSubscriber[0].form_data || {}
          // Use requested feedStyle if provided, otherwise use saved feed_style
          const savedFeedStyle = blueprintSubscriber[0].feed_style || null
          const finalFeedStyle = requestedFeedStyle || savedFeedStyle
          feedStyleToStore = finalFeedStyle // Store for feed_layouts
          
          // Get category from form_data.vibe (same as old blueprint)
          const category = (formData.vibe || "professional") as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
          // Get mood from feed_style (use requested or saved)
          const mood = (finalFeedStyle || "minimal") as "luxury" | "minimal" | "beige"
          
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
            console.log(`[v0] Using template prompt from legacy blueprint: ${category}_${moodMapped} (${templatePrompt.split(/\s+/).length} words)`)
          }
        } else {
          console.log(`[v0] No wizard data found in either source - prompt will be generated on first generation`)
        }
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