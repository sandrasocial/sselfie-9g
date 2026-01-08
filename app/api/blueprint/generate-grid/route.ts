import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt } from "@/lib/maya/blueprint-photoshoot-templates"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { selfieImages, category, mood, email } = await req.json()

    // Validate email is provided
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required. Please complete email capture first." },
        { status: 400 },
      )
    }

    // Check if email exists and has generated strategy
    const subscriber = await sql`
      SELECT id, strategy_generated, grid_generated, grid_url, grid_frame_urls
      FROM blueprint_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      return NextResponse.json(
        { error: "Email not found. Please complete email capture first." },
        { status: 404 },
      )
    }

    const subscriberData = subscriber[0]

    // Check if strategy is generated first
    if (!subscriberData.strategy_generated) {
      return NextResponse.json(
        { error: "Please generate your strategy first before creating a grid." },
        { status: 400 },
      )
    }

    // If grid already generated, return saved grid
    if (subscriberData.grid_generated && subscriberData.grid_url && subscriberData.grid_frame_urls) {
      console.log("[Blueprint] Returning saved grid for email:", email)
      return NextResponse.json({
        success: true,
        gridUrl: subscriberData.grid_url,
        frameUrls: subscriberData.grid_frame_urls,
        fromCache: true,
      })
    }

    // Validate selfie images
    if (!selfieImages || !Array.isArray(selfieImages) || selfieImages.length === 0) {
      return NextResponse.json({ error: "At least 1 selfie image is required" }, { status: 400 })
    }

    if (selfieImages.length > 3) {
      return NextResponse.json({ error: "Maximum 3 selfie images allowed" }, { status: 400 })
    }

    // Validate category
    const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Valid category required. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate mood
    const validMoods = ["luxury", "minimal", "beige"]
    if (!mood || !validMoods.includes(mood)) {
      return NextResponse.json(
        { error: "Valid mood required. Must be one of: luxury (Dark & Moody), minimal (Light & Minimalistic), beige (Beige Aesthetic)" },
        { status: 400 },
      )
    }

    // Validate image URLs
    const validImageUrls = selfieImages.filter(
      (url: string) => typeof url === "string" && url.startsWith("http"),
    )

    if (validImageUrls.length === 0) {
      return NextResponse.json({ error: "Invalid image URLs provided" }, { status: 400 })
    }

    console.log(`[Blueprint] Generating grid with ${validImageUrls.length} selfie(s) for category: ${category}, mood: ${mood}`)

    // Get prompt from template library
    let prompt: string
    try {
      prompt = getBlueprintPhotoshootPrompt(category, mood)
    } catch (error) {
      console.error("[Blueprint] Template error:", error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Prompt template not available. Please contact support.",
        },
        { status: 500 },
      )
    }

    // Generate grid with Nano Banana Pro
    const result = await generateWithNanoBanana({
      prompt,
      image_input: validImageUrls,
      aspect_ratio: "1:1",
      resolution: "2K", // Free tier - 2K resolution
      output_format: "png",
      safety_filter_level: "block_only_high",
    })

    console.log(`[Blueprint] Grid generation started: ${result.predictionId} for email: ${email}`)

    // Save prediction ID to database (will be updated when grid completes)
    try {
      await sql`
        UPDATE blueprint_subscribers
        SET grid_prediction_id = ${result.predictionId}
        WHERE email = ${email}
      `
    } catch (dbError) {
      console.error("[Blueprint] Error saving prediction ID:", dbError)
      // Continue even if save fails
    }

    return NextResponse.json({
      success: true,
      predictionId: result.predictionId,
      status: result.status,
    })
  } catch (error) {
    console.error("[Blueprint] Generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
