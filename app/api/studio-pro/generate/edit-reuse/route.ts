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
 * POST /api/studio-pro/generate/edit-reuse
 * Generate edited/reused image using Nano Banana Pro
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
      baseImageUrl,
      goal,
      editInstruction,
      workflowType,
      mode,
      reuseGoal,
      textOverlay,
    } = body

    // VALIDATE INPUTS
    if (!baseImageUrl) {
      return NextResponse.json({ error: "Base image URL is required" }, { status: 400 })
    }

    if (!goal) {
      return NextResponse.json({ error: "Goal is required" }, { status: 400 })
    }

    // VALIDATE PRO SETUP (avatar OR base image provided)
    const avatarCount = await sql`
      SELECT COUNT(*) as count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `
    const hasAvatar = Number(avatarCount[0]?.count || 0) >= 3

    if (!hasAvatar && !baseImageUrl) {
      return NextResponse.json(
        { 
          error: "Avatar setup incomplete",
          message: "Please complete avatar setup (minimum 3 images) or provide a base image.",
          requiresSetup: true
        },
        { status: 403 }
      )
    }

    // DETERMINE MODE AND WORKFLOW TYPE
    let finalMode: string = mode || 'edit-image'
    let finalWorkflowType: string = workflowType || 'edit-image'
    let finalReuseGoal: string | undefined = reuseGoal

    if (goal === 'turn-into-reel-cover') {
      // Use reel-cover mode directly (not reuse-adapt) for proper prompt building
      finalMode = 'reel-cover'
      finalWorkflowType = 'reuse-adapt'
      finalReuseGoal = 'reel-cover'
    } else if (goal === 'turn-into-carousel-slide') {
      // Use carousel-slides mode directly for proper prompt building
      finalMode = 'carousel-slides'
      finalWorkflowType = 'reuse-adapt'
      finalReuseGoal = 'carousel-slide'
    } else if (goal === 'remove-object') {
      finalMode = 'remove-object'
      finalWorkflowType = 'edit-image'
    } else if (goal === 'change-outfit') {
      finalMode = 'change-outfit'
      finalWorkflowType = 'edit-image'
    } else {
      finalMode = 'edit-image'
      finalWorkflowType = 'edit-image'
    }

    // LOAD AVATAR IMAGES (max 5 for base images)
    const avatarImages = await sql`
      SELECT image_url
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
      ORDER BY display_order ASC, uploaded_at ASC
      LIMIT 5
    `

    // BUILD IMAGE INPUT ARRAY
    // Guardrail: baseImages max 5, brand assets max 3, total max 8
    const imageUrls: string[] = []

    // Add base image first (the one being edited)
    if (baseImageUrl) {
      imageUrls.push(baseImageUrl)
    }

    // Add avatar images (up to 4 more, total 5 base images max)
    const remainingBaseSlots = 5 - imageUrls.length
    for (let i = 0; i < Math.min(remainingBaseSlots, avatarImages.length); i++) {
      imageUrls.push(avatarImages[i].image_url)
    }

    // Add brand assets if needed (max 3)
    // TODO: Load brand assets when needed for product placement
    // For now, skip brand assets for edit/reuse workflows

    // Validate total count
    if (imageUrls.length > 8) {
      return NextResponse.json(
        { error: `Maximum 8 images allowed, received ${imageUrls.length}` },
        { status: 400 }
      )
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one input image is required" },
        { status: 400 }
      )
    }

    // DETERMINE ASPECT RATIO AND RESOLUTION
    let aspectRatio = "1:1"
    let resolution: "1K" | "2K" | "4K" = "2K"

    if (finalReuseGoal === 'reel-cover') {
      aspectRatio = "9:16"
      resolution = "2K"
    } else if (finalReuseGoal === 'carousel-slide') {
      aspectRatio = "1:1"
      resolution = "2K"
    }

    // BUILD PROMPT
    const workflowMeta = {
      editInstruction: editInstruction || undefined,
      reuseGoal: finalReuseGoal,
      platformFormat: aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "4:5",
    }

    const textElements = textOverlay?.title ? [
      {
        text: textOverlay.title,
        style: textOverlay.placement === 'top' ? 'headline' : textOverlay.placement === 'center' ? 'quote' : 'caption',
      }
    ] : []

    // Build inputImages structure
    // Base image (the one being edited) goes first, then avatar images for consistency
    const baseImagesForPrompt = imageUrls.map((url, index) => ({
      url,
      type: index === 0 ? 'reference-photo' : 'user-photo',
    }))

    // Build user request for prompt
    let userRequestForPrompt = editInstruction || `Edit this image: ${goal}`
    if (finalMode === 'reel-cover' && textOverlay?.title) {
      userRequestForPrompt = `Create reel cover with title: "${textOverlay.title}"`
    } else if (finalMode === 'carousel-slides' && textOverlay?.title) {
      userRequestForPrompt = `Create carousel slide with text: "${textOverlay.title}"`
    }

    // Build workflowMeta with proper fields for each mode
    const finalWorkflowMeta = {
      ...workflowMeta,
      reelTitle: finalMode === 'reel-cover' ? (textOverlay?.title || 'Untitled') : undefined,
      slideNumber: finalMode === 'carousel-slides' ? 1 : undefined,
      totalSlides: finalMode === 'carousel-slides' ? 1 : undefined,
    }

    const { optimizedPrompt } = await buildNanoBananaPrompt({
      userId: neonUser.id,
      mode: finalMode as any,
      userRequest: userRequestForPrompt,
      inputImages: {
        baseImages: baseImagesForPrompt,
        productImages: [],
        textElements,
      },
      workflowMeta: finalWorkflowMeta,
    })

    // CALCULATE CREDITS
    const creditsRequired = getStudioProCreditCost(resolution)

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
        ${finalWorkflowType},
        'in-progress',
        ${JSON.stringify({
          goal,
          editInstruction,
          reuseGoal: finalReuseGoal,
          baseImageUrl,
        })}
      )
      RETURNING *
    `

    // DEDUCT CREDITS (before generation)
    const tempReferenceId = `temp-${Date.now()}`
    const deductionResult = await deductCredits(
      neonUser.id,
      creditsRequired,
      'image', // Use 'image' transaction type (standard for image generation)
      `Studio Pro ${finalMode}`,
      tempReferenceId
    )

    if (!deductionResult.success) {
      console.error("[EDIT-REUSE] Credit deduction failed:", deductionResult.error)
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
      console.log("[EDIT-REUSE] Calling Nano Banana Pro:", {
        mode: finalMode,
        workflowType: finalWorkflowType,
        baseCount: imageUrls.length,
        assetCount: 0,
        totalCount: imageUrls.length,
        hasEditInstruction: !!editInstruction,
        hasReuseGoal: !!finalReuseGoal,
        aspectRatio,
        resolution,
      })

      generation = await generateWithNanoBanana({
        prompt: optimizedPrompt,
        image_input: imageUrls,
        aspect_ratio: aspectRatio as any,
        resolution: resolution as any,
        output_format: "png",
        safety_filter_level: "block_only_high",
      })

      // UPDATE credit transaction with actual prediction ID (optional - for tracking)
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
        // Non-critical - log but don't fail
        console.log("[EDIT-REUSE] Could not update credit transaction reference:", updateError)
      }
    } catch (error: any) {
      // REFUND credits on failure
      await addCredits(neonUser.id, creditsRequired, 'bonus', `Studio Pro refund: ${tempReferenceId}`, undefined)
      
      // Update workflow status
      await sql`
        UPDATE pro_workflows
        SET status = 'cancelled'
        WHERE id = ${workflow.id}
      `

      console.error("[EDIT-REUSE] Generation failed:", error)
      return NextResponse.json(
        { error: error.message || "Generation failed" },
        { status: 500 }
      )
    }

    // POLL FOR COMPLETION
    let finalOutput: string | undefined
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

      const status = await checkNanoBananaPrediction(generation.predictionId)
      
      if (status.status === "succeeded" && status.output) {
        finalOutput = status.output
        break
      } else if (status.status === "failed") {
        // REFUND credits on failure
        await addCredits(neonUser.id, creditsRequired, 'studio_pro_refund', `refund-${generation.predictionId}`)
        
        // Update workflow status
        await sql`
          UPDATE pro_workflows
          SET status = 'cancelled'
          WHERE id = ${workflow.id}
        `

        return NextResponse.json(
          { error: status.error || "Generation failed" },
          { status: 500 }
        )
      }

      attempts++
    }

    if (!finalOutput) {
      // REFUND credits on timeout
      await addCredits(neonUser.id, creditsRequired, 'bonus', `Studio Pro refund: ${generation.predictionId}`, undefined)
      
      // Update workflow status
      await sql`
        UPDATE pro_workflows
        SET status = 'cancelled'
        WHERE id = ${workflow.id}
      `

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
      `studio-pro/generations/${neonUser.id}/${Date.now()}-${generation.predictionId}.png`,
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
        edit_instruction,
        prompt_used,
        settings
      )
      VALUES (
        ${neonUser.id},
        ${workflow.id},
        ${finalWorkflowType},
        ${JSON.stringify([blob.url])},
        ${editInstruction || null},
        ${optimizedPrompt},
        ${JSON.stringify({
          aspect_ratio: aspectRatio,
          resolution,
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

    console.log("[EDIT-REUSE] Generation completed:", {
      generationId: savedGeneration.id,
      imageUrl: blob.url,
    })

    return NextResponse.json({
      success: true,
      generationId: savedGeneration.id,
      imageUrl: blob.url,
      imageUrls: [blob.url],
      workflowId: workflow.id,
    })
  } catch (error: any) {
    console.error("[EDIT-REUSE] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}




