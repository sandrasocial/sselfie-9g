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
    console.log("[v0] ✅ Using Maya's intelligent motion prompt:", userPrompt)
    return userPrompt
  }
  
  // Only use fallback if Maya somehow didn't provide a prompt (shouldn't happen)
  console.log("[v0] ⚠️ WARNING: No motion prompt from Maya, using minimal fallback")
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

    const predictionInput = {
      image: imageUrl,
      prompt: enhanceMotionPrompt(motionPrompt, imageDescription),
      resolution: "720p", // 720p for better quality (1280x720), 480p for faster generation (832x480)
      go_fast: true, // Enable fast generation mode
      num_frames: 101, // 6.25 seconds (101 frames) - optimal for scroll-stopping engagement
      frames_per_second: 16, // Standard frame rate (pricing based on this)
      sample_shift: 12, // Sample shift factor for quality (default: 12, range: 1-20)
      interpolate_output: true, // Interpolate to 30 FPS for smooth playback
      disable_safety_checker: false, // Keep safety checker enabled
      lora_weights_transformer: loraWeightsUrl, // HIGH transformer LoRA for character consistency
      lora_weights_transformer_2: loraWeightsUrl, // LOW transformer_2 LoRA for character consistency
      lora_scale_transformer: 1.3, // Increased LoRA strength from 1.0 to 1.3 for stronger character consistency in videos
      lora_scale_transformer_2: 1.3,
    }

    console.log("[v0] ========== WAN-2.2-I2V-FAST INPUT ==========")
    console.log("[v0] Model: wan-video/wan-2.2-i2v-fast")
    console.log("[v0] Image URL:", predictionInput.image)
    console.log("[v0] Enhanced motion prompt:", predictionInput.prompt)
    console.log("[v0] Resolution:", predictionInput.resolution)
    console.log("[v0] Go fast:", predictionInput.go_fast)
    console.log("[v0] Num frames:", predictionInput.num_frames, "(6.25 seconds for scroll-stopping engagement)")
    console.log("[v0] FPS:", predictionInput.frames_per_second)
    console.log("[v0] Sample shift:", predictionInput.sample_shift)
    console.log("[v0] Interpolate output:", predictionInput.interpolate_output)
    console.log("[v0] ✅ LoRA weights (transformer):", predictionInput.lora_weights_transformer)
    console.log("[v0] ✅ LoRA weights (transformer_2):", predictionInput.lora_weights_transformer_2)
    console.log(
      "[v0] ✅ LoRA scale (transformer):",
      predictionInput.lora_scale_transformer,
      "(1.3 for strong character consistency)",
    )
    console.log(
      "[v0] ✅ LoRA scale (transformer_2):",
      predictionInput.lora_scale_transformer_2,
      "(1.3 for strong character consistency)",
    )
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
