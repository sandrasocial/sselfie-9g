/**
 * BLUEPRINT GRID GENERATION ROUTE
 * 
 * BLUEPRINT GRID — READ ONLY
 * 
 * Uses canonical scene pipeline (same as Feed Planner).
 * Must never generate single-scene prompts.
 * 
 * CANONICAL FLOW:
 * Blueprint Grid → resolveConsistentScenes → buildPreviewPromptFromScenes → Nano Banana
 * 
 * IMPORTANT:
 * Blueprint grid uses preview prompts ONLY.
 * Full planner logic is intentionally excluded.
 * 
 * This ensures:
 * - Blueprint → Feed Preview → Full Planner = one visual truth
 * - No duplicate logic
 * - No future AI confusion
 */

import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getBlueprintEntitlement } from "@/lib/subscription"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { resolveConsistentScenes, buildPreviewPromptFromScenes } from "@/lib/feed-planner/scene-consistency"

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

    // CANONICAL FEED PLANNER PIPELINE
    // Blueprint grid uses the same scene pipeline as Feed Planner
    // This ensures visual consistency: Blueprint → Feed Preview → Full Planner
    
    // Fetch user data for scene resolution
    let user: { id: string | number } | null = null
    if (userId) {
      user = { id: userId }
    } else {
      // For email-based users, we need to get user_id from subscriber
      const subscriberUserQuery = await sql`
        SELECT user_id FROM blueprint_subscribers
        WHERE email = ${email}
        LIMIT 1
      `
      if (subscriberUserQuery.length > 0 && subscriberUserQuery[0].user_id) {
        user = { id: subscriberUserQuery[0].user_id }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Cannot resolve scenes." },
        { status: 400 },
      )
    }
    
    // Construct feedLayout object for scene resolution
    // feed_style format matches Feed Planner: just the mood (e.g., "minimal", "luxury", "beige")
    // The scene resolver uses defaultCategory for category, feed_style for mood
    const feedLayout = {
      feed_style: mood, // Mood is the feed_style (e.g., "minimal", "luxury", "beige")
      visual_aesthetic: [category],
      fashion_style: null, // Will be fetched by scene resolver if needed
    }
    
    // IMPORTANT: Blueprint grid uses preview prompts ONLY
    // Full planner logic is intentionally excluded
    let prompt: string
    try {
      // Resolve all 9 scenes using canonical pipeline
      // This ensures Blueprint → Feed Preview → Full Planner = one visual truth
      const scenes = await resolveConsistentScenes(feedLayout, user, {
        checkSettingsPreference: false,
        checkBlueprintSubscribers: false,
        defaultCategory: category as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional",
      })
      
      // Build preview prompt (STRATEGY ONLY, NOT execution)
      // IMPORTANT: Blueprint grid uses preview prompts ONLY
      // Full planner logic is intentionally excluded
      // This outputs position strategies, NOT scene descriptions with outfits/locations/poses
      prompt = buildPreviewPromptFromScenes(scenes)
      
      console.log(`[Blueprint] ✅ Generated preview prompt via CANONICAL pipeline (${prompt.split(/\s+/).length} words, ${scenes.length} scenes)`)
      
      // FEED SYSTEM LOCKED — STRATEGY ≠ EXECUTION
      // Preview is now a blueprint. Single scenes now build the house.
    } catch (error) {
      console.error("[Blueprint] Scene resolution error:", error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to resolve scenes. Please contact support.",
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
