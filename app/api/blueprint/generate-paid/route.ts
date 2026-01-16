import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt, type BlueprintCategory, type BlueprintMood } from "@/lib/maya/blueprint-photoshoot-templates"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCategoryAndMood, getFashionStyleForPosition, injectAndValidateTemplate } from "@/lib/feed-planner/generation-helpers"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Check if current user is admin
 */
async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const neonUser = await getUserByAuthId(user.id)
    return neonUser?.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

/**
 * POST /api/blueprint/generate-paid
 * 
 * Generate ONE grid at a time for paid blueprint (incremental pattern)
 * Uses Nano Banana Pro (same as free blueprint) with user's selfies
 * 
 * Body: { accessToken: string, gridNumber: number }
 * 
 * IMPORTANT: Idempotent - safe to retry. Client must poll /check-paid-grid for completion.
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, gridNumber } = await req.json()

    // Validate inputs
    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      )
    }

    if (!gridNumber || typeof gridNumber !== "number" || gridNumber < 1 || gridNumber > 30) {
      return NextResponse.json(
        { error: "gridNumber must be between 1 and 30" },
        { status: 400 }
      )
    }

    console.log(`[v0][paid-blueprint] Generate Grid ${gridNumber}/30 request for token:`, accessToken.substring(0, 8) + "...")

    const userIsAdmin = await isAdmin()

    // Lookup subscriber by access_token
    const subscriber = await sql`
      SELECT 
        id,
        email,
        user_id,
        paid_blueprint_purchased,
        paid_blueprint_generated,
        paid_blueprint_photo_urls,
        selfie_image_urls,
        form_data,
        feed_style
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      // Admin can still proceed (for testing)
      if (userIsAdmin) {
        console.log("[v0][paid-blueprint] Admin override - invalid token, but allowing admin access")
        return NextResponse.json(
          { 
            error: "Invalid access token",
            admin: true,
            message: "Admin override: Token not found, but admin access granted. Cannot generate without valid subscriber."
          },
          { status: 404 },
        )
      }

      console.log("[v0][paid-blueprint] Invalid access token")
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 },
      )
    }

    const data = subscriber[0]
    const email = data.email

    const featureEnabled = process.env.ENABLE_BLUEPRINT_PAID === "true"
    if (!featureEnabled && !data.paid_blueprint_purchased && !userIsAdmin) {
      return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
    }

    // Must have purchased (admin can bypass)
    if (!data.paid_blueprint_purchased && !userIsAdmin) {
      console.log("[v0][paid-blueprint] Not purchased:", email.substring(0, 3) + "***")
      return NextResponse.json(
        { 
          error: "Paid blueprint not purchased. Please purchase first.",
          requiresAction: "purchase"
        },
        { status: 403 },
      )
    }

    if (!data.paid_blueprint_purchased && userIsAdmin) {
      console.log("[v0][paid-blueprint] Admin override - allowing generation for unpurchased blueprint")
    }

    // FIX: Fetch selfies from user_avatar_images table (not blueprint_subscribers.selfie_image_urls)
    let validSelfieUrls: string[] = []
    
    // Try to get user_id from blueprint_subscribers, or look up by email
    let userId: string | null = data.user_id || null
    
    if (!userId) {
      // Fallback: Look up user by email
      const userByEmail = await sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `
      userId = userByEmail.length > 0 ? userByEmail[0].id : null
    }
    
    if (userId) {
      // Fetch selfies from user_avatar_images table
      const avatarImages = await sql`
        SELECT image_url
        FROM user_avatar_images
        WHERE user_id = ${userId}
          AND image_type = 'selfie'
          AND is_active = true
        ORDER BY display_order ASC, uploaded_at ASC
        LIMIT 3
      `
      validSelfieUrls = avatarImages.map((img: any) => img.image_url).filter((url: string) => 
        typeof url === "string" && url.startsWith("http")
      )
      console.log(`[v0][paid-blueprint] Found ${validSelfieUrls.length} selfies from user_avatar_images for user_id: ${userId}`)
    } else {
      // Fallback: Check legacy selfie_image_urls field (for backward compatibility)
      const legacySelfieUrls = Array.isArray(data.selfie_image_urls) ? data.selfie_image_urls : []
      validSelfieUrls = legacySelfieUrls.filter((url: any) => 
        typeof url === "string" && url.startsWith("http")
      )
      if (validSelfieUrls.length > 0) {
        console.log(`[v0][paid-blueprint] Using legacy selfie_image_urls (${validSelfieUrls.length} selfies)`)
      }
    }
    
    if (validSelfieUrls.length === 0) {
      console.log("[v0][paid-blueprint] No selfies found:", email.substring(0, 3) + "***")
      return NextResponse.json(
        { 
          error: "Selfies required. Please complete the free Blueprint first to upload selfies.",
          requiresAction: "complete_free_blueprint"
        },
        { status: 400 },
      )
    }

    if (validSelfieUrls.length > 3) {
      console.log("[v0][paid-blueprint] Too many selfies (taking first 3):", validSelfieUrls.length)
      validSelfieUrls = validSelfieUrls.slice(0, 3) // Keep only first 3
    }

    // Guard 3: Get category/mood using unified helper (checks feed_layouts and user_personal_brand first, falls back to blueprint_subscribers)
    let category: BlueprintCategory
    let mood: BlueprintMood
    
    if (userId) {
      // User has converted - use unified helper to check feed_layouts and user_personal_brand first
      // Try to get feedLayout if user has a feed
      let feedLayout: { feed_style?: string | null } | null = null
      const [userFeedLayout] = await sql`
        SELECT feed_style
        FROM feed_layouts
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `
      if (userFeedLayout) {
        feedLayout = userFeedLayout
        console.log(`[v0][paid-blueprint] Found feed_layout for user, feed_style: ${userFeedLayout.feed_style || 'none'}`)
      }

      // Use unified helper (will check feed_layouts.feed_style, user_personal_brand, then blueprint_subscribers)
      const result = await getCategoryAndMood(feedLayout, { id: userId }, {
        checkSettingsPreference: true,
        checkBlueprintSubscribers: true, // Enable fallback to blueprint_subscribers
        trackSource: true
      })
      category = result.category as BlueprintCategory
      mood = result.mood as BlueprintMood
    } else {
      // User hasn't converted - use data from blueprint_subscribers directly (already fetched above)
      // This matches the original behavior for non-converted users
      const formData = data.form_data || {}
      category = (formData.vibe || "professional") as BlueprintCategory
      mood = (data.feed_style || formData.feed_style || "minimal") as BlueprintMood
      console.log(`[v0][paid-blueprint] Non-converted user - using blueprint_subscribers data: ${category}_${mood}`)
    }

    console.log(`[v0][paid-blueprint] Using category: ${category}, mood: ${mood}`)

    // Get existing photo URLs
    const existingPhotoUrls = Array.isArray(data.paid_blueprint_photo_urls) ? data.paid_blueprint_photo_urls : []
    const targetIndex = gridNumber - 1

    // Idempotency: Check if this specific grid already generated
    if (existingPhotoUrls[targetIndex]) {
      console.log(`[v0][paid-blueprint] Grid ${gridNumber} already exists:`, existingPhotoUrls[targetIndex])
      return NextResponse.json({
        success: true,
        gridNumber,
        status: "completed",
        gridUrl: existingPhotoUrls[targetIndex],
        message: `Grid ${gridNumber} already generated`,
      })
    }

    console.log(`[v0][paid-blueprint] Generating Grid ${gridNumber}/30 for ${email.substring(0, 3)}*** (${validSelfieUrls.length} selfies)`)

    // Get prompt from template library
    let fullTemplate: string
    try {
      fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
      console.log(`[v0][paid-blueprint] Prompt template: ${category}_${mood} (${fullTemplate.split(/\s+/).length} words)`)
    } catch (error) {
      console.error("[v0][paid-blueprint] Template error:", error)
      return NextResponse.json(
        {
          error: error instanceof Error
            ? error.message
            : "Prompt template not available. Please contact support.",
        },
        { status: 500 },
      )
    }

    // Get user's fashion style for dynamic injection
    // For full 9-grid images, use position 1 for consistency (all 9 scenes use same style)
    // Alternatively, could use ((gridNumber - 1) % 9) + 1 to rotate styles across grids
    // If userId doesn't exist, default to 'business'
    const fashionStyle = userId ? await getFashionStyleForPosition({ id: userId }, 1) : 'business'

    // Inject dynamic content into template and validate (same as preview feeds)
    let injectedTemplate: string
    try {
      injectedTemplate = await injectAndValidateTemplate(
        fullTemplate,
        category,
        mood,
        fashionStyle,
        userId ? userId.toString() : email // Use userId if available, otherwise email as fallback for rotation tracking
      )
      console.log(`[v0][paid-blueprint] ✅ Injection successful - all placeholders replaced (${injectedTemplate.split(/\s+/).length} words)`)
    } catch (injectionError: any) {
      console.error(`[v0][paid-blueprint] ❌ Injection error:`, injectionError)
      return NextResponse.json(
        {
          error: "Failed to inject dynamic content",
          details: injectionError.message || "Template injection failed. Please contact support.",
        },
        { status: 500 },
      )
    }

    // Generate ONE grid with Nano Banana Pro using INJECTED template (not raw template)
    const result = await generateWithNanoBanana({
      prompt: injectedTemplate, // Use injected template instead of raw template
      image_input: validSelfieUrls,
      aspect_ratio: "1:1",
      resolution: "2K",  // Match free blueprint
      output_format: "png",
      safety_filter_level: "block_only_high",
    })

    console.log(`[v0][paid-blueprint] Grid ${gridNumber} generation started: ${result.predictionId}`)

    // Return immediately with predictionId (client will poll /check-paid-grid)
    return NextResponse.json({
      success: true,
      gridNumber,
      predictionId: result.predictionId,
      status: result.status,  // "starting"
      message: `Grid ${gridNumber}/30 generation started`,
    })
  } catch (error) {
    console.error("[v0][paid-blueprint] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start generation" },
      { status: 500 },
    )
  }
}
