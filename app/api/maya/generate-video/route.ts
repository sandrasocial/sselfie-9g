import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

function enhanceMotionPrompt(userPrompt: string | undefined, imageDescription?: string): string {
  // If Maya (the AI agent) provided a prompt, trust it completely
  if (userPrompt && userPrompt.trim().length > 0) {
    console.log("[v0] ✅ Using AI-generated motion prompt from Claude vision analysis:", userPrompt)
    return userPrompt
  }
  
  console.log("[v0] ⚠️ WARNING: No AI motion prompt provided - this shouldn't happen!")
  console.log("[v0] Using minimal fallback, but Claude should have generated this")
  return "Standing naturally, subtle breathing motion visible"
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[v0] ❌ No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { imageUrl, imageId, motionPrompt, imageDescription } = body

    console.log("[v0] ========== VIDEO GENERATION REQUEST ==========")
    console.log("[v0] User ID:", user.id)
    console.log("[v0] Image URL:", imageUrl)
    console.log("[v0] Image ID:", imageId)
    console.log("[v0] Motion prompt:", motionPrompt)
    console.log("[v0] Image description:", imageDescription)
    console.log("[v0] ================================================")

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon database")
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] ✅ Neon user found:", neonUser.id)

    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.ANIMATION)
    if (!hasEnoughCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: CREDIT_COSTS.ANIMATION,
          message: `Video generation requires ${CREDIT_COSTS.ANIMATION} credits. Please purchase more credits or upgrade your plan.`,
        },
        { status: 402 },
      )
    }

    // Get user's trained LoRA model
    const userDataResult = await sql`
      SELECT 
        um.lora_weights_url,
        um.trigger_word,
        um.training_status
      FROM user_models um
      WHERE um.user_id = ${neonUser.id}
      AND um.training_status = 'completed'
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    console.log("[v0] ========== DATABASE QUERY RESULT ==========")
    console.log("[v0] Query returned rows:", userDataResult.length)
    if (userDataResult.length > 0) {
      console.log("[v0] User model data:", JSON.stringify(userDataResult[0], null, 2))
    }
    console.log("[v0] ================================================")

    if (userDataResult.length === 0) {
      console.log("[v0] ❌ No trained model found for user")
      return NextResponse.json({ error: "No trained model found. Please complete training first." }, { status: 400 })
    }

    const userData = userDataResult[0]
    const loraWeightsUrl = userData.lora_weights_url

    if (!loraWeightsUrl || loraWeightsUrl.trim() === "") {
      console.log("[v0] ❌ LoRA weights URL is null or empty")
      console.log("[v0] User data:", JSON.stringify(userData, null, 2))
      return NextResponse.json({ error: "LoRA weights URL not found. Please retrain your model." }, { status: 400 })
    }

    console.log("[v0] ========== USER LORA DATA ==========")
    console.log("[v0] ✅ LoRA weights URL:", loraWeightsUrl)
    console.log("[v0] Trigger word:", userData.trigger_word)
    console.log("[v0] Training status:", userData.training_status)
    console.log("[v0] ========================================")

    const replicate = getReplicateClient()

    // WAN 2.2 architecture: HIGH-noise (creative) + LOW-noise (refinement) transformers
    // User's FLUX LoRA only applies to HIGH-noise for character consistency
    // LOW-noise transformer runs native for natural motion and refinement
    const predictionInput = {
      image: imageUrl,
      prompt: enhanceMotionPrompt(motionPrompt, imageDescription),
      resolution: "720p",
      go_fast: true,
      num_frames: 101,
      frames_per_second: 16,
      sample_shift: 12,
      interpolate_output: true,
      disable_safety_checker: false,
      // HIGH-noise transformer: Apply user's trained FLUX LoRA for character consistency
      lora_weights_transformer: loraWeightsUrl,
      lora_scale_transformer: 1.0,
      // LOW-noise transformer: No LoRA (native refinement for natural motion)
      // Note: transformer_2 parameters are intentionally omitted
      // WAN 2.2 expects separate high/low noise LoRAs, but FLUX training doesn't produce these
      // Best practice: Apply LoRA only to creative stage (high-noise), let refinement run native
    }

    console.log("[v0] ========== WAN-2.2-I2V-FAST INPUT ==========")
    console.log("[v0] Model: wan-video/wan-2.2-i2v-fast")
    console.log("[v0] Image URL:", predictionInput.image)
    console.log("[v0] Enhanced motion prompt:", predictionInput.prompt)
    console.log("[v0] Resolution:", predictionInput.resolution)
    console.log("[v0] Go fast:", predictionInput.go_fast)
    console.log("[v0] Num frames:", predictionInput.num_frames, "(6.25 seconds)")
    console.log("[v0] FPS:", predictionInput.frames_per_second)
    console.log("[v0] Sample shift:", predictionInput.sample_shift)
    console.log("[v0] Interpolate output:", predictionInput.interpolate_output)
    console.log("[v0] ✅ LoRA (HIGH-noise transformer):", predictionInput.lora_weights_transformer)
    console.log("[v0] ✅ LoRA scale (HIGH-noise):", predictionInput.lora_scale_transformer)
    console.log("[v0] ℹ️  LOW-noise transformer: Native (no LoRA) for natural motion")
    console.log("[v0] Full prediction input:", JSON.stringify(predictionInput, null, 2))
    console.log("[v0] ================================================")

    const prediction = await replicate.predictions.create({
      model: "wan-video/wan-2.2-i2v-fast",
      input: predictionInput,
    })

    console.log("[v0] ========== REPLICATE VIDEO RESPONSE ==========")
    console.log("[v0] ✅ Prediction created successfully")
    console.log("[v0] Prediction ID:", prediction.id)
    console.log("[v0] Prediction status:", prediction.status)
    console.log("[v0] Full prediction:", JSON.stringify(prediction, null, 2))
    console.log("[v0] ================================================")

    await deductCredits(neonUser.id, CREDIT_COSTS.ANIMATION, "animation", `Animated image: ${imageId}`)
    console.log("[v0] Deducted", CREDIT_COSTS.ANIMATION, "credits for video generation")

    // Store video generation in database
    const insertResult = await sql`
      INSERT INTO generated_videos (
        user_id,
        image_id,
        image_source,
        motion_prompt,
        job_id,
        status,
        progress,
        created_at
      ) VALUES (
        ${neonUser.id},
        ${imageId},
        ${imageUrl},
        ${predictionInput.prompt},
        ${prediction.id},
        'processing',
        0,
        NOW()
      )
      RETURNING id
    `

    const videoId = insertResult[0].id

    console.log("[v0] ✅ Video record created in database, ID:", videoId)

    return NextResponse.json({
      success: true,
      videoId,
      predictionId: prediction.id,
      status: "processing",
      estimatedTime: "1-3 minutes",
      creditsDeducted: CREDIT_COSTS.ANIMATION,
    })
  } catch (error) {
    console.error("[v0] ========== VIDEO GENERATION ERROR ==========")
    console.error("[v0] ❌ Error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    console.error("[v0] ================================================")

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        error: "Failed to generate video",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
