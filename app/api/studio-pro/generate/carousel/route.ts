import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana, getStudioProCreditCost, checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { buildNanoBananaPrompt } from "@/lib/maya/nano-banana-prompt-builder"
import { getUserCredits, deductCredits, addCredits } from "@/lib/credits"
import { put } from "@vercel/blob/client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/studio-pro/generate/carousel
 * Generate carousel slides using Nano Banana Pro
 */
export async function POST(req: NextRequest) {
  try {
    // AUTHENTICATION
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      topic,
      slideCount = 5,
      slideTexts = [], // Array of text for each slide
    } = body

    // VALIDATE INPUTS
    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    if (slideCount < 3 || slideCount > 10) {
      return NextResponse.json({ error: "Slide count must be between 3 and 10" }, { status: 400 })
    }

    // VALIDATE PRO SETUP (avatar required)
    const avatarCount = await sql`
      SELECT COUNT(*) as count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `
    const hasAvatar = Number(avatarCount[0]?.count || 0) >= 3

    if (!hasAvatar) {
      return NextResponse.json(
        { 
          error: "Avatar setup incomplete",
          message: "Please complete avatar setup (minimum 3 images) before creating carousels.",
          requiresSetup: true
        },
        { status: 403 }
      )
    }

    // LOAD AVATAR IMAGES (max 5 for base images)
    const avatarImages = await sql`
      SELECT image_url
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
      ORDER BY display_order ASC, uploaded_at ASC
      LIMIT 5
    `

    if (avatarImages.length === 0) {
      return NextResponse.json(
        { error: "No avatar images found" },
        { status: 400 }
      )
    }

    // LOAD BRAND KIT
    const brandKitResult = await sql`
      SELECT * FROM brand_kits
      WHERE user_id = ${neonUser.id} AND is_default = true
      LIMIT 1
    `
    const brandKit = brandKitResult[0] || null

    // CALCULATE CREDITS (5 credits per slide)
    const creditsRequired = slideCount * 5

    // CHECK CREDITS
    const currentBalance = await getUserCredits(neonUser.id)
    if (currentBalance < creditsRequired) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. Need ${creditsRequired} credits (${slideCount} slides × 5 credits), you have ${currentBalance}.` 
        },
        { status: 402 }
      )
    }

    // CREATE WORKFLOW RECORD
    const [workflow] = await sql`
      INSERT INTO pro_workflows (
        user_id,
        workflow_type,
        status,
        context
      )
      VALUES (
        ${neonUser.id},
        'carousel',
        'in-progress',
        ${JSON.stringify({
          topic,
          slideCount,
          slideTexts,
        })}
      )
      RETURNING *
    `

    // BUILD IMAGE INPUT ARRAY
    const imageUrls: string[] = avatarImages
      .map((img: any) => img.image_url)
      .filter((url: any): url is string => url != null && typeof url === 'string' && url.trim().length > 0)
    
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid avatar image URLs found" },
        { status: 400 }
      )
    }

    // GENERATE EACH SLIDE
    const generatedSlides: string[] = []
    let totalCreditsDeducted = 0

    for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
      const slideNumber = slideIndex + 1
      const slideText = slideTexts[slideIndex] || `Slide ${slideNumber} about ${topic}`

      // BUILD PROMPT FOR THIS SLIDE
      const baseImagesForPrompt = imageUrls.map((url, index) => ({
        url,
        type: index === 0 ? 'reference-photo' : 'user-photo',
      }))

      const textElements = slideText ? [
        {
          text: slideText,
          style: slideNumber === 1 ? 'headline' : slideNumber === slideCount ? 'caption' : 'body',
        }
      ] : []

      const { optimizedPrompt } = await buildNanoBananaPrompt({
        userId: neonUser.id,
        mode: 'carousel-slides',
        userRequest: `Create carousel slide ${slideNumber} of ${slideCount} about ${topic}`,
        inputImages: {
          baseImages: baseImagesForPrompt,
          productImages: [],
          textElements,
        },
        workflowMeta: {
          slideNumber,
          totalSlides: slideCount,
          platformFormat: '1:1',
        },
        brandKit: brandKit ? {
          primaryColor: brandKit.primary_color,
          secondaryColor: brandKit.secondary_color,
          accentColor: brandKit.accent_color,
          fontStyle: brandKit.font_style,
          brandTone: brandKit.brand_tone,
        } : undefined,
      })

      // DEDUCT CREDITS (5 per slide)
      const tempReferenceId = `carousel-${workflow.id}-slide-${slideNumber}-${Date.now()}`
      const deductionResult = await deductCredits(
        neonUser.id,
        5,
        'image',
        `Carousel slide ${slideNumber}`,
        tempReferenceId
      )

      if (!deductionResult.success) {
        // Refund already deducted credits
        if (totalCreditsDeducted > 0) {
          await addCredits(neonUser.id, totalCreditsDeducted, 'bonus', `Carousel refund: ${workflow.id}`, undefined)
        }
        return NextResponse.json(
          { 
            error: "Failed to deduct credits",
            details: deductionResult.error || "Please try again"
          },
          { status: 500 }
        )
      }

      totalCreditsDeducted += 5

      // GENERATE with Nano Banana Pro
      let generation
      try {
        console.log("[CAROUSEL] Generating slide", slideNumber, "of", slideCount)

        generation = await generateWithNanoBanana({
          prompt: optimizedPrompt,
          image_input: imageUrls,
          aspect_ratio: "1:1",
          resolution: "2K",
          output_format: "png",
          safety_filter_level: "block_only_high",
        })

        // UPDATE credit transaction with actual prediction ID
        try {
          await sql`
            UPDATE credit_transactions
            SET reference_id = ${generation.predictionId}
            WHERE user_id = ${neonUser.id}
              AND reference_id = ${tempReferenceId}
              AND transaction_type = 'image'
              AND id = (
                SELECT id FROM credit_transactions
                WHERE user_id = ${neonUser.id}
                  AND reference_id = ${tempReferenceId}
                  AND transaction_type = 'image'
                ORDER BY created_at DESC
                LIMIT 1
              )
          `
        } catch (updateError) {
          console.log("[CAROUSEL] Could not update credit transaction reference:", updateError)
        }
      } catch (error: any) {
        // REFUND credits on failure
        if (totalCreditsDeducted > 0) {
          await addCredits(neonUser.id, totalCreditsDeducted, 'bonus', `Carousel refund: ${workflow.id}`, undefined)
        }
        
        console.error("[CAROUSEL] Generation failed for slide", slideNumber, ":", error)
        return NextResponse.json(
          { error: error.message || `Failed to generate slide ${slideNumber}` },
          { status: 500 }
        )
      }

      // POLL FOR COMPLETION
      let finalOutput: string | undefined
      let attempts = 0
      const maxAttempts = 60

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        const status = await checkNanoBananaPrediction(generation.predictionId)
        
        if (status.status === "succeeded" && status.output) {
          finalOutput = status.output
          break
        } else if (status.status === "failed") {
          // REFUND credits on failure
          if (totalCreditsDeducted > 0) {
            await addCredits(neonUser.id, totalCreditsDeducted, 'bonus', `Carousel refund: ${workflow.id}`, undefined)
          }
          
          return NextResponse.json(
            { error: status.error || `Failed to generate slide ${slideNumber}` },
            { status: 500 }
          )
        }

        attempts++
      }

      if (!finalOutput) {
        // REFUND credits on timeout
        if (totalCreditsDeducted > 0) {
          await addCredits(neonUser.id, totalCreditsDeducted, 'bonus', `Carousel refund: ${workflow.id}`, undefined)
        }
        
        return NextResponse.json(
          { error: `Generation timed out for slide ${slideNumber}` },
          { status: 504 }
        )
      }

      // DOWNLOAD AND RE-UPLOAD TO VERCEL BLOB
      const imageResponse = await fetch(finalOutput)
      if (!imageResponse.ok) {
        throw new Error("Failed to download generated image")
      }

      const imageBlob = await imageResponse.blob()
      const blob = await put(
        `studio-pro/carousel/${neonUser.id}/${workflow.id}-slide-${slideNumber}-${Date.now()}.png`,
        imageBlob,
        {
          access: "public",
          contentType: "image/png",
        }
      )

      generatedSlides.push(blob.url)
    }

    // SAVE TO pro_generations
    const [savedGeneration] = await sql`
      INSERT INTO pro_generations (
        user_id,
        workflow_id,
        generation_type,
        image_urls,
        prompt_used,
        settings
      )
      VALUES (
        ${neonUser.id},
        ${workflow.id},
        'carousel',
        ${JSON.stringify(generatedSlides)},
        ${`Carousel: ${topic} (${slideCount} slides)`},
        ${JSON.stringify({
          topic,
          slideCount,
          aspect_ratio: "1:1",
          resolution: "2K",
          output_format: "png",
          safety_filter_level: "block_only_high",
        })}
      )
      RETURNING *
    `

    // UPDATE WORKFLOW STATUS
    await sql`
      UPDATE pro_workflows
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${workflow.id}
    `

    console.log("[CAROUSEL] Generation completed:", {
      generationId: savedGeneration.id,
      slideCount: generatedSlides.length,
    })

    return NextResponse.json({
      success: true,
      generationId: savedGeneration.id,
      imageUrls: generatedSlides,
      workflowId: workflow.id,
      slideCount: generatedSlides.length,
    })
  } catch (error: any) {
    console.error("[CAROUSEL] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}



