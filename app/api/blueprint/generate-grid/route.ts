import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt } from "@/lib/maya/blueprint-photoshoot-templates"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getBlueprintEntitlement } from "@/lib/subscription"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { selfieImages, category, mood, email } = await req.json()

    // Phase 1: Support both user_id (authenticated) and email (backward compatibility)
    let userId: string | null = null
    let subscriberQuery = null

    // Try to get user_id from auth session (Studio flow)
    try {
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const neonUser = await getUserByAuthId(authUser.id)
        if (neonUser) {
          userId = neonUser.id
          console.log("[Blueprint] Using user_id from auth session:", userId)
        }
      }
    } catch (authError) {
      // Not authenticated - fall back to email-based lookup
      console.log("[Blueprint] Not authenticated, using email-based lookup")
    }

    // Query by user_id if authenticated, otherwise by email
    if (userId) {
      subscriberQuery = await sql`
        SELECT id, strategy_generated, grid_generated, grid_url, grid_frame_urls
        FROM blueprint_subscribers
        WHERE user_id = ${userId}
        LIMIT 1
      `
    } else {
      // Backward compatibility: email-based lookup
      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { error: "Email is required. Please complete email capture first." },
          { status: 400 },
        )
      }

      subscriberQuery = await sql`
        SELECT id, strategy_generated, grid_generated, grid_url, grid_frame_urls
        FROM blueprint_subscribers
        WHERE email = ${email}
        LIMIT 1
      `
    }

    if (subscriberQuery.length === 0) {
      return NextResponse.json(
        { error: userId ? "Blueprint state not found. Please start your blueprint first." : "Email not found. Please complete email capture first." },
        { status: 404 },
      )
    }

    const subscriberData = subscriberQuery[0]

    // Check if strategy is generated first
    if (!subscriberData.strategy_generated) {
      return NextResponse.json(
        { error: "Please generate your strategy first before creating a grid." },
        { status: 400 },
      )
    }

    // PR-8: If grid already generated, return saved grid (never regenerate)
    if (subscriberData.grid_generated && subscriberData.grid_url && subscriberData.grid_frame_urls) {
      console.log("[Blueprint] Grid already exists, returning saved grid for", userId ? `user_id: ${userId}` : `email: ${email}`)
      return NextResponse.json({
        success: true,
        gridUrl: subscriberData.grid_url,
        frameUrls: subscriberData.grid_frame_urls,
        fromCache: true,
        message: "Grid already generated - returning saved grid",
      })
    }

    // Decision 1: Check credits before allowing generation (only for authenticated users)
    // Each grid generation costs 2 credits (2 images × 1 credit each)
    const gridGenerationCost = 2 // 2 credits per grid (2 images)
    
    if (userId) {
      // Check if user has enough credits
      const hasEnoughCredits = await checkCredits(userId, gridGenerationCost)
      
      if (!hasEnoughCredits) {
        const currentBalance = await getUserCredits(userId)
        return NextResponse.json(
          { 
            error: `Insufficient credits. Grid generation requires ${gridGenerationCost} credits. You currently have ${currentBalance} credits. Please purchase more credits or upgrade your plan.`,
            currentBalance,
            required: gridGenerationCost,
            entitlement: await getBlueprintEntitlement(userId),
          },
          { status: 402 }, // 402 Payment Required
        )
      }
      
      console.log(`[Blueprint] Credit check passed: User ${userId} has enough credits (${await getUserCredits(userId)} credits, need ${gridGenerationCost})`)
    } else {
      // Guest users (email-based) - skip credit check for backward compatibility
      // Note: Guest flow will be deprecated in Phase 4
      console.log("[Blueprint] Guest user - skipping credit check (backward compatibility)")
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

    console.log(`[Blueprint] Grid generation started: ${result.predictionId} for`, userId ? `user_id: ${userId}` : `email: ${email}`)

    // Save prediction ID to database (will be updated when grid completes)
    // Decision 1: Deduct credits when grid generation starts (only for authenticated users)
    try {
      if (userId) {
        // Deduct credits for grid generation (2 credits = 2 images × 1 credit each)
        const creditDeduction = await deductCredits(
          userId,
          gridGenerationCost,
          "image",
          `Blueprint grid generation (${result.predictionId})`,
          result.predictionId,
        )
        
        if (creditDeduction.success) {
          console.log(`[Blueprint] ✅ Credits deducted: ${gridGenerationCost} credits for user ${userId} (balance: ${creditDeduction.newBalance})`)
        } else {
          console.error(`[Blueprint] ⚠️ Failed to deduct credits: ${creditDeduction.error}`)
          // Don't fail generation if credit deduction fails - credits may have already been deducted
          // But log the error for monitoring
        }
        
        // Save prediction ID
        await sql`
          UPDATE blueprint_subscribers
          SET grid_prediction_id = ${result.predictionId}
          WHERE user_id = ${userId}
        `
      } else {
        // Email-based (backward compatibility): Just save prediction ID (no credit deduction)
        // Note: Guest flow will be deprecated in Phase 4
        await sql`
          UPDATE blueprint_subscribers
          SET grid_prediction_id = ${result.predictionId}
          WHERE email = ${email}
        `
      }
    } catch (dbError) {
      console.error("[Blueprint] Error saving prediction ID or deducting credits:", dbError)
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
