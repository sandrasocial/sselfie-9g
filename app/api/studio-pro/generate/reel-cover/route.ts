import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateWithNanoBanana, checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { buildNanoBananaPrompt } from "@/lib/maya/nano-banana-prompt-builder"
import { getUserCredits, deductCredits, addCredits } from "@/lib/credits"
import { put } from "@vercel/blob/client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/studio-pro/generate/reel-cover
 * Generate reel cover using Nano Banana Pro (9:16 aspect ratio, text overlay support)
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
      title,
      textOverlay,
      textPlacement = 'center',
    } = body

    // VALIDATE INPUTS
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
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
          message: "Please complete avatar setup (minimum 3 images) before creating reel covers.",
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

    // CALCULATE CREDITS (5 credits for 2K, 8 for 4K)
    const resolution = '2K' // Reel covers use 2K (9:16 aspect ratio)
    const creditsRequired = 5

    // CHECK CREDITS
    const currentBalance = await getUserCredits(neonUser.id)
    if (currentBalance < creditsRequired) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. Need ${creditsRequired} credits, you have ${currentBalance}.` 
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
        'reel-cover',
        'in-progress',
        ${JSON.stringify({
          title,
          textOverlay,
          textPlacement,
        })}
      )
      RETURNING *
    `

    // BUILD IMAGE INPUT ARRAY
    const imageUrls: string[] = avatarImages.map((img: any) => img.image_url)

    // BUILD TEXT ELEMENTS (if text overlay provided)
    const textElements = textOverlay ? [
      {
        text: textOverlay,
        style: 'headline' as const,
      }
    ] : []

    // BUILD PROMPT FOR REEL COVER
    const baseImagesForPrompt = imageUrls.map((url, index) => ({
      url,
      type: index === 0 ? 'reference-photo' as const : 'user-photo' as const,
    }))

    const { optimizedPrompt } = await buildNanoBananaPrompt({
      userId: neonUser.id,
      mode: 'reel-cover',
      userRequest: `Create reel cover for: ${title}${textOverlay ? ` with text: "${textOverlay}"` : ''}`,
      inputImages: {
        baseImages: baseImagesForPrompt,
        productImages: [],
        textElements,
      },
      workflowMeta: {
        reelTitle: title,
        textPlacement: textPlacement || 'center',
        platformFormat: '9:16',
      },
      brandKit: brandKit ? {
        primaryColor: brandKit.primary_color,
        secondaryColor: brandKit.secondary_color,
        accentColor: brandKit.accent_color,
        fontStyle: brandKit.font_style,
        brandTone: brandKit.brand_tone,
      } : undefined,
    })

    // DEDUCT CREDITS
    const tempReferenceId = `reel-cover-${workflow.id}-${Date.now()}`
    const deductionResult = await deductCredits(
      neonUser.id,
      creditsRequired,
      'image',
      `Reel cover: ${title}`,
      tempReferenceId
    )

    if (!deductionResult.success) {
      return NextResponse.json(
        { 
          error: "Failed to deduct credits",
          details: deductionResult.error || "Please try again"
        },
        { status: 500 }
      )
    }

    // GENERATE with Nano Banana Pro
    let generation
    try {
      console.log("[REEL-COVER] Generating reel cover:", title)

      generation = await generateWithNanoBanana({
        prompt: optimizedPrompt,
        image_input: imageUrls,
        aspect_ratio: "9:16", // Vertical for reels
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
        console.log("[REEL-COVER] Could not update credit transaction reference:", updateError)
      }
    } catch (error: any) {
      // REFUND credits on failure
      await addCredits(neonUser.id, creditsRequired, 'bonus', `Reel cover refund: ${workflow.id}`, undefined)
      
      console.error("[REEL-COVER] Generation failed:", error)
      return NextResponse.json(
        { error: error.message || "Failed to generate reel cover" },
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
        await addCredits(neonUser.id, creditsRequired, 'bonus', `Reel cover refund: ${workflow.id}`, undefined)
        
        return NextResponse.json(
          { error: status.error || "Failed to generate reel cover" },
          { status: 500 }
        )
      }

      attempts++
    }

    if (!finalOutput) {
      // REFUND credits on timeout
      await addCredits(neonUser.id, creditsRequired, 'bonus', `Reel cover refund: ${workflow.id}`, undefined)
      
      return NextResponse.json(
        { error: "Generation timed out" },
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
      `studio-pro/reel-cover/${neonUser.id}/${workflow.id}-${Date.now()}.png`,
      imageBlob,
      {
        access: "public",
        contentType: "image/png",
      }
    )

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
        'reel-cover',
        ARRAY[${blob.url}],
        ${`Reel cover: ${title}`},
        ${JSON.stringify({
          title,
          textOverlay,
          textPlacement,
          aspect_ratio: "9:16",
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

    console.log("[REEL-COVER] Generation completed:", {
      generationId: savedGeneration.id,
      title,
    })

    return NextResponse.json({
      success: true,
      generationId: savedGeneration.id,
      imageUrl: blob.url,
      workflowId: workflow.id,
    })
  } catch (error: any) {
    console.error("[REEL-COVER] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

