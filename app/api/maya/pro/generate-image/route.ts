import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
// Phase 1 Maya rebuild: LEGACY Pro generation route. Soft-archived (stays functional
// until the engine cutover flag is enabled, then returns 410).
import { legacyMayaRouteGuard } from "@/lib/maya/legacy-route-guard"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { checkCredits, deductCredits, getUserCredits, addCredits } from "@/lib/credits"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { sql } from "@/lib/db/client"
import { put } from "@vercel/blob"
import { routeProModeImagePromptViaAuthority } from "@/lib/generation/prompt"

export const maxDuration = 300 // 5 minutes for image generation


/**
 * Pro Mode Generate Image API Route
 * 
 * Generates images using Nano Banana Pro with full 250-500 word prompts.
 * Handles credit deduction and saves generated images to database.
 */
export async function POST(req: NextRequest) {
  const gone = legacyMayaRouteGuard("/api/maya/pro/generate-image")
  if (gone) return gone
  console.log("[v0] [PRO MODE] Generate image API called")

  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] [PRO MODE] User authenticated:", { userId, dbUserId })

    // Parse request body
    const body = await req.json()
    const {
      fullPrompt, // Full 250-500 word prompt from prompt builder
      conceptTitle,
      conceptDescription,
      category,
      linkedImages, // Array of image URLs to use as input
      resolution = "2K", // "1K", "2K", or "4K"
      aspectRatio = "1:1", // "1:1", "9:16", "16:9", "4:3", "3:4"
      chatId,
    } = body

    if (!fullPrompt || typeof fullPrompt !== "string") {
      return NextResponse.json({ error: "fullPrompt is required" }, { status: 400 })
    }

    console.log("[v0] [PRO MODE] Generation request:", {
      conceptTitle,
      category,
      promptLength: fullPrompt.length,
      linkedImagesCount: linkedImages?.length || 0,
      resolution,
      aspectRatio,
    })

    // Check credits (Studio Pro uses 2 credits per image)
    const creditCost = getStudioProCreditCost(resolution as "1K" | "2K" | "4K")
    const hasCredits = await checkCredits(dbUserId, creditCost)

    if (!hasCredits) {
      const currentBalance = await getUserCredits(dbUserId)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: creditCost,
          current: currentBalance,
          message: `Image generation requires ${creditCost} credits. You currently have ${currentBalance} credits.`,
        },
        { status: 402 }
      )
    }

    // Prepare input images (up to 14 images for Nano Banana Pro)
    const imageInput: string[] = []
    if (Array.isArray(linkedImages) && linkedImages.length > 0) {
      // Limit to 14 images (Nano Banana Pro maximum)
      imageInput.push(...linkedImages.slice(0, 14))
    }

    console.log("[v0] [PRO MODE] Using", imageInput.length, "input images")

    // Phase 3C P0-1: Route prompt through Authority Layer for audit logging
    const authorityResult = routeProModeImagePromptViaAuthority({
      fullPrompt,
      userId: dbUserId,
      category,
      conceptTitle,
      conceptDescription,
      resolution,
      aspectRatio,
    })
    const routedPrompt = authorityResult.prompt

    // Deduct credits BEFORE generation starts to prevent free generations on async flow.
    const tempReferenceId = `maya-pro-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const deductionResult = await deductCredits(
      dbUserId,
      creditCost,
      "image",
      `Pro Mode image generation (${resolution})`,
      tempReferenceId,
    )

    if (!deductionResult.success) {
      const creditError = deductionResult.error || "Failed to deduct credits"
      if (creditError.toLowerCase().includes("insufficient credits")) {
        const currentBalance = await getUserCredits(dbUserId)
        return NextResponse.json(
          {
            error: "Insufficient credits",
            required: creditCost,
            current: currentBalance,
            message: `Image generation requires ${creditCost} credits. You currently have ${currentBalance} credits.`,
          },
          { status: 402 },
        )
      }

      console.error("[v0] [PRO MODE] Credit deduction failed:", creditError)
      return NextResponse.json(
        {
          error: "Failed to deduct credits",
          details: creditError,
        },
        { status: 500 },
      )
    }

    let generationResult: Awaited<ReturnType<typeof generateWithNanoBanana>>
    try {
      generationResult = await generateWithNanoBanana({
        prompt: routedPrompt,
        image_input: imageInput.length > 0 ? imageInput : undefined,
        aspect_ratio: aspectRatio as any,
        resolution: resolution as "1K" | "2K" | "4K",
        output_format: "png",
        safety_filter_level: "block_only_high",
      })
    } catch (generationError: any) {
      console.error("[v0] [PRO MODE] Generation start failed after credit deduction:", generationError)
      try {
        await addCredits(
          dbUserId,
          creditCost,
          "refund",
          `Refund for failed Pro Mode generation start (${resolution})`,
        )
      } catch (refundError) {
        console.error("[v0] [PRO MODE] Failed to refund credits after generation start failure:", refundError)
      }

      return NextResponse.json(
        {
          error: "Failed to start generation",
          details: generationError?.message || "Unknown generation start error",
        },
        { status: 500 },
      )
    }

    console.log("[v0] [PRO MODE] Generation started:", {
      predictionId: generationResult.predictionId,
      status: generationResult.status,
    })

    // Update temporary reference with actual prediction ID for reconciliation.
    try {
      await sql`
        UPDATE credit_transactions
        SET reference_id = ${generationResult.predictionId}
        WHERE id = (
          SELECT id
          FROM credit_transactions
          WHERE user_id = ${dbUserId}
            AND reference_id = ${tempReferenceId}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `
    } catch (referenceUpdateError) {
      console.error("[v0] [PRO MODE] Failed to update credit transaction reference:", referenceUpdateError)
    }

    // If generation completed immediately, handle it
    if (generationResult.status === "succeeded" && generationResult.output) {
      // Download image and upload to Vercel Blob
      const imageResponse = await fetch(generationResult.output)
      const imageBlob = await imageResponse.blob()

      const blob = await put(
        `maya-pro-generations/${generationResult.predictionId}.png`,
        imageBlob,
        {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: true,
        }
      )

      // Save to database
      let generationId: number | null = null
      try {
        // Save to ai_images gallery and get the ID
        const [insertResult] = await sql`
          INSERT INTO ai_images (
            user_id,
            image_url,
            prompt,
            generated_prompt,
            prediction_id,
            generation_status,
            source,
            category,
            created_at
          ) VALUES (
            ${dbUserId},
            ${blob.url},
            ${conceptTitle || conceptDescription || "Pro Mode generation"},
            ${routedPrompt},
            ${generationResult.predictionId},
            'completed',
            'maya_pro',
            ${category || "concept"},
            NOW()
          )
          RETURNING id
        `

        generationId = insertResult.id
        console.log("[v0] [PRO MODE] Image saved to gallery, generationId:", generationId)
      } catch (dbError) {
        console.error("[v0] [PRO MODE] Error saving to database:", dbError)
        // Don't fail the request if database save fails - log it
      }

      return NextResponse.json({
        success: true,
        predictionId: generationResult.predictionId,
        generationId: generationId,
        imageUrl: blob.url,
        status: "succeeded",
      })
    }

    // Generation is in progress, create database record for tracking
    let generationId: number | null = null
    try {
      // Save to ai_images gallery and get the ID (for consistency with Classic Mode)
      const [insertResult] = await sql`
        INSERT INTO ai_images (
          user_id,
          image_url,
          prompt,
          generated_prompt,
          prediction_id,
          generation_status,
          source,
          category,
          created_at
        ) VALUES (
          ${dbUserId},
          '', -- Empty string for in-progress (will be updated when generation completes)
          ${conceptTitle || conceptDescription || "Pro Mode generation"},
          ${fullPrompt},
          ${generationResult.predictionId},
          'generating',
          'maya_pro',
          ${category || "concept"},
          NOW()
        )
        RETURNING id
      `
      generationId = insertResult.id
      console.log("[v0] [PRO MODE] Created generation record for tracking, generationId:", generationId)
    } catch (dbError) {
      console.error("[v0] [PRO MODE] Error creating generation record:", dbError)
      // If database insert fails, we still need to return a generationId for polling to work
      // The check-generation endpoint will create a fallback record if needed
      // For now, we'll use a temporary ID based on predictionId to ensure polling can start
      // This is a fallback - ideally the database insert should always succeed
      console.warn("[v0] [PRO MODE] Database insert failed, but generation can still be tracked via predictionId")
    }

    // Generation is in progress, return prediction ID and generationId for polling (matches Classic Mode format)
    // If generationId is null due to DB failure, still return predictionId - the check-generation endpoint can handle it
    if (!generationId) {
      console.warn("[v0] [PRO MODE] ⚠️ No generationId available, but returning predictionId for polling. Check-generation endpoint will create fallback record if needed.")
    }
    
    return NextResponse.json({
      success: true,
      predictionId: generationResult.predictionId,
      generationId: generationId, // May be null if DB insert failed, but polling can still work with predictionId
      status: generationResult.status,
      message: "Generation in progress. Poll /api/maya/pro/check-generation to check status.",
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Generate image API error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    )
  }
}
