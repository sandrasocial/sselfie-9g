import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { sql } from "@/lib/db/client"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDefaultVariationId, getFeedStyleV2ByName, getFeedStyleVariationById } from "@/lib/feed-planner/feed-style-prompt-loader"
import { getPreviewPromptForStyle } from "@/lib/feed-planner/feed-style-generation"

const ADMIN_EMAIL = "ssa@ssasocial.com"

const V2_STYLES = [
  "Dark & Moody",
  "Beige Aesthetic",
  "Light & Minimalistic",
  "Luxury Future Self",
  "Casual Bohemian",
  "Athletic & Wellness",
  "Coastal Aesthetics",
]

const LEGACY_STYLE_MAP: Record<string, string> = {
  luxury: "Dark & Moody",
  minimal: "Light & Minimalistic",
  beige: "Beige Aesthetic",
}

const normalizeV2Style = (value: string | null | undefined): string | null => {
  if (!value || typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null
  const legacyMatch = LEGACY_STYLE_MAP[raw.toLowerCase()]
  if (legacyMatch) return legacyMatch
  return V2_STYLES.find((style) => style.toLowerCase() === raw.toLowerCase()) || null
}

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

    // Guard 3: Resolve V2 style (feed_layout → blueprint_subscribers → personal brand)
    let feedStyleName: string | null = null
    let preferredVariationId: number | null = null

    if (userId) {
      const [personalBrand] = await sql`
        SELECT settings_preference, feed_style_variation_id
        FROM user_personal_brand
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 1
      `

      const [userFeedLayout] = await sql`
        SELECT feed_style, feed_style_variation_id
        FROM feed_layouts
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (userFeedLayout?.feed_style) {
        feedStyleName = normalizeV2Style(userFeedLayout.feed_style)
        preferredVariationId = userFeedLayout.feed_style_variation_id
          ? Number(userFeedLayout.feed_style_variation_id)
          : null
      }

      if (!feedStyleName && data.feed_style) {
        feedStyleName = normalizeV2Style(data.feed_style)
      }

      if (!feedStyleName && personalBrand?.settings_preference) {
        try {
          const settings = typeof personalBrand.settings_preference === "string"
            ? JSON.parse(personalBrand.settings_preference)
            : personalBrand.settings_preference
          if (Array.isArray(settings) && settings.length > 0) {
            feedStyleName = normalizeV2Style(settings[0])
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (!preferredVariationId && personalBrand?.feed_style_variation_id) {
        preferredVariationId = Number(personalBrand.feed_style_variation_id)
      }
    }

    if (!feedStyleName) {
      const userIdHash = createHash("sha256").update(String(userId || accessToken)).digest("hex")
      console.log("[v0] CONTRACT_MISSING", { missing: ["feed_style"], route: "generate-paid", userIdHash })
      return NextResponse.json(
        { error: "FEED_STYLE_REQUIRED", missing: ["feed_style"] },
        { status: 422 }
      )
    }

    console.log(`[v0][paid-blueprint] Using V2 style: ${feedStyleName}`)

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

    // Build V2 preview prompt
    let injectedTemplate: string
    try {
      const style = await getFeedStyleV2ByName(feedStyleName)
      if (!style || !style.enabled) {
        return NextResponse.json(
          { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
          { status: 422 },
        )
      }

      let variationId = await getDefaultVariationId(style.id)
      if (preferredVariationId) {
        const variation = await getFeedStyleVariationById(preferredVariationId)
        if (variation && variation.enabled && variation.feed_style_id === style.id) {
          variationId = variation.id
        }
      }

      injectedTemplate = await getPreviewPromptForStyle(style.id, variationId)
      console.log(`[v0][paid-blueprint] ✅ V2 preview prompt generated (${injectedTemplate.split(/\s+/).length} words)`)
    } catch (sceneError: any) {
      console.error(`[v0][paid-blueprint] ❌ V2 preview prompt generation failed:`, sceneError)
      return NextResponse.json(
        {
          error: "PREVIEW_PROMPT_GENERATION_FAILED",
          details: sceneError.message || "V2 preview prompt generation failed. Please contact support.",
        },
        { status: 500 },
      )
    }

    // Generate ONE grid with Nano Banana Pro using canonical preview prompt
    const result = await generateWithNanoBanana({
      prompt: injectedTemplate,
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
