// STUDIO PRO MODE - Nano Banana Pro generation only
// Classic mode uses /api/maya/generate-image (Flux)

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { buildNanoBananaPrompt } from "@/lib/maya/nano-banana-prompt-builder"
import { getUserCredits, deductCredits, addCredits } from "@/lib/credits"
import { put } from "@vercel/blob"
import { guardProModeRoute } from "@/lib/maya/type-guards"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    // AUTHENTICATION (use helper for consistent cookie handling)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // MAP to Neon user ID
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // GET request data
    const {
      mode,
      userRequest,
      inputImages,
      resolution = "2K",
      aspectRatio = "1:1"
    } = await req.json()

    if (!mode) {
      return NextResponse.json({ error: "Mode is required" }, { status: 400 })
    }

    if (!userRequest || userRequest.trim().length === 0) {
      return NextResponse.json({ error: "User request is required" }, { status: 400 })
    }

    console.log("[STUDIO-PRO] Generation request:", {
      userId: neonUserId,
      mode,
      resolution,
      imageCount: inputImages?.baseImages?.length || 0,
    })

    // BUILD optimized Nano Banana prompt
    let optimizedPrompt: string
    let sceneDescription: string
    try {
      const result = await buildNanoBananaPrompt({
        userId: neonUserId,
        mode: mode as any,
        userRequest,
        inputImages: inputImages || {},
      })
      optimizedPrompt = result.optimizedPrompt
      sceneDescription = result.sceneDescription
      console.log("[STUDIO-PRO] Prompt built successfully:", {
        promptLength: optimizedPrompt.length,
        sceneDescription
      })
    } catch (promptError) {
      console.error("[STUDIO-PRO] Failed to build prompt:", promptError)
      const errorDetails = promptError instanceof Error ? promptError.message : String(promptError)
      const errorStack = promptError instanceof Error ? promptError.stack : undefined
      console.error("[STUDIO-PRO] Error details:", { errorDetails, errorStack })
      return NextResponse.json(
        { 
          error: "Failed to build generation prompt",
          details: errorDetails
        },
        { status: 500 }
      )
    }

    // CALCULATE credits
    const creditsRequired = getStudioProCreditCost(resolution as "1K" | "2K" | "4K")

    // CHECK credits
    const currentBalance = await getUserCredits(neonUserId)
    
    if (currentBalance < creditsRequired) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. Need ${creditsRequired} credits, you have ${currentBalance}.` 
        },
        { status: 402 }
      )
    }

    // COLLECT image URLs from input (up to 14 total)
    // Order: selfies (baseImages) first, then products, then styleRefs
    const imageUrls: string[] = []
    
    // Add base images first (these establish character consistency - selfies)
    if (inputImages?.baseImages && inputImages.baseImages.length > 0) {
      const baseUrls = inputImages.baseImages
        .map((img: any) => img.url)
        .filter((url: string) => url && typeof url === 'string' && url.startsWith('http'))
      
      imageUrls.push(...baseUrls)
      console.log("[STUDIO-PRO] Added", baseUrls.length, "selfie image(s)")
    }
    
    // Add product images
    if (inputImages?.productImages && inputImages.productImages.length > 0) {
      const productUrls = inputImages.productImages
        .map((img: any) => img.url)
        .filter((url: string) => url && typeof url === 'string' && url.startsWith('http'))
      
      imageUrls.push(...productUrls)
      console.log("[STUDIO-PRO] Added", productUrls.length, "product image(s)")
    }
    
    // Add style reference images
    if (inputImages?.styleRefs && inputImages.styleRefs.length > 0) {
      const styleUrls = inputImages.styleRefs
        .map((img: any) => img.url)
        .filter((url: string) => url && typeof url === 'string' && url.startsWith('http'))
      
      imageUrls.push(...styleUrls)
      console.log("[STUDIO-PRO] Added", styleUrls.length, "style reference image(s)")
    }

    // Validate we have images
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one input image is required" },
        { status: 400 }
      )
    }

    // Validate total count (Nano Banana Pro supports up to 14 images)
    if (imageUrls.length > 14) {
      return NextResponse.json(
        { error: `Maximum 14 images allowed, received ${imageUrls.length}` },
        { status: 400 }
      )
    }

    console.log("[STUDIO-PRO] Total images to send:", imageUrls.length, "URLs:", imageUrls.map(url => url.substring(0, 50) + "..."))

    // DEDUCT credits BEFORE generation (prevents free generations)
    const tempReferenceId = `studio-pro-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const deductionResult = await deductCredits(
      neonUserId,
      creditsRequired,
      "image",
      `Studio Pro ${mode}: ${sceneDescription}`,
      tempReferenceId
    )

    if (!deductionResult.success) {
      console.error("[STUDIO-PRO] Credit deduction failed:", deductionResult.error)
      return NextResponse.json(
        { 
          error: "Failed to deduct credits",
          details: deductionResult.error || "Please try again"
        },
        { status: 500 }
      )
    }

    console.log("[STUDIO-PRO] Credits deducted:", {
      amount: creditsRequired,
      newBalance: deductionResult.newBalance,
    })

    // GENERATE with Nano Banana Pro
    let generation
    try {
            console.log("[STUDIO-PRO] Calling Nano Banana Pro with:", {
              promptLength: optimizedPrompt.length,
              promptPreview: optimizedPrompt.substring(0, 150) + "...",
              promptFull: optimizedPrompt, // Log full prompt for debugging
              imageCount: imageUrls.length,
              aspectRatio,
              resolution,
            })

      generation = await generateWithNanoBanana({
        prompt: optimizedPrompt,
        image_input: imageUrls, // Array of image URLs (up to 14)
        aspect_ratio: aspectRatio as any,
        resolution: resolution as any,
        output_format: "png", // Default to PNG for quality
        safety_filter_level: "block_only_high", // Most permissive
      })
    } catch (error) {
      console.error("[STUDIO-PRO] Nano Banana generation failed:", error)
      
      // REFUND credits since generation failed
      try {
        const { addCredits } = await import("@/lib/credits")
        await addCredits(
          neonUserId,
          creditsRequired,
          "refund",
          `Refund for failed Studio Pro generation: ${mode}`,
          undefined,
          false
        )
        console.log("[STUDIO-PRO] Credits refunded due to generation failure")
      } catch (refundError) {
        console.error("[STUDIO-PRO] Failed to refund credits:", refundError)
        // Non-fatal, log and continue
      }
      
      return NextResponse.json(
        { 
          error: "Failed to start generation",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      )
    }

    // UPDATE credit transaction with actual predictionId
    try {
      // Use subquery to get the most recent transaction matching criteria
      await sql`
        UPDATE credit_transactions
        SET reference_id = ${generation.predictionId}
        WHERE id = (
          SELECT id
          FROM credit_transactions
          WHERE user_id = ${neonUserId}
            AND reference_id = ${tempReferenceId}
            AND created_at > NOW() - INTERVAL '1 minute'
          ORDER BY created_at DESC
          LIMIT 1
        )
      `
      console.log("[STUDIO-PRO] Updated credit transaction with predictionId:", generation.predictionId)
    } catch (updateError) {
      console.error("[STUDIO-PRO] Failed to update credit record:", updateError)
      // Non-fatal, continue
    }

    // SAVE to ai_images table (same as regular Maya generations)
    // Status will be updated when generation completes
    await sql`
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
        ${neonUserId},
        '',
        ${userRequest},
        ${optimizedPrompt},
        ${generation.predictionId},
        'processing',
        'studio_pro',
        ${mode},
        NOW()
      )
    `

    console.log("[STUDIO-PRO] Generation started:", generation.predictionId)

    return NextResponse.json({
      success: true,
      predictionId: generation.predictionId,
      status: generation.status,
      sceneDescription,
      creditsDeducted: creditsRequired,
    })

  } catch (error) {
    console.error("[STUDIO-PRO] Generation error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[STUDIO-PRO] Error details:", { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: errorMessage || "Failed to generate Studio Pro content",
        details: errorStack
      },
      { status: 500 }
    )
  }
}
