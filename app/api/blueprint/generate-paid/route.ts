import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt, type BlueprintCategory, type BlueprintMood } from "@/lib/maya/blueprint-photoshoot-templates"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

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

    // Guard 1: Must have purchased (admin can bypass)
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

    // Admin override: Allow generation even if not purchased (for testing)
    if (!data.paid_blueprint_purchased && userIsAdmin) {
      console.log("[v0][paid-blueprint] Admin override - allowing generation for unpurchased blueprint")
    }

    // Guard 2: Must have selfies (1-3 images)
    const selfieUrls = Array.isArray(data.selfie_image_urls) ? data.selfie_image_urls : []
    const validSelfieUrls = selfieUrls.filter((url: any) => 
      typeof url === "string" && url.startsWith("http")
    )
    
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
      validSelfieUrls.splice(3) // Keep only first 3
    }

    // Guard 3: Must have form data for category/mood
    const formData = data.form_data || {}
    const category = (formData.vibe || "professional") as BlueprintCategory
    const mood = (data.feed_style || formData.feed_style || "minimal") as BlueprintMood

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

    // Get prompt from template library (same as free blueprint)
    let templatePrompt: string
    try {
      templatePrompt = getBlueprintPhotoshootPrompt(category, mood)
      console.log(`[v0][paid-blueprint] Prompt template: ${category}_${mood}`)
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

    // Generate ONE grid with Nano Banana Pro (same as free blueprint)
    const result = await generateWithNanoBanana({
      prompt: templatePrompt,
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
