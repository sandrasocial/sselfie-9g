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

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon database")
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] ✅ Neon user found:", neonUser.id)

    // Check and deduct credits BEFORE starting the Replicate call to prevent race conditions
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

    // Deduct credits BEFORE Replicate call to prevent race conditions with credit purchases
    const deductionResult = await deductCredits(neonUser.id, CREDIT_COSTS.ANIMATION, "animation", `Animated image: ${imageId}`)
    if (!deductionResult.success) {
      console.error("[v0] ❌ Failed to deduct credits:", deductionResult.error)
      return NextResponse.json(
        {
          error: "Failed to deduct credits",
          details: deductionResult.error || "Unable to process credit deduction. Please try again.",
        },
        { status: 500 },
      )
    }
    console.log("[v0] ✅ Deducted", CREDIT_COSTS.ANIMATION, "credits for video generation. New balance:", deductionResult.newBalance)

    // Get user's trained LoRA model
    const userDataResult = await sql`
      SELECT 
        um.lora_weights_url,
        um.trigger_word,
        um.training_status
      FROM user_models um
      WHERE um.user_id = ${neonUser.id}
      AND um.training_status = 'completed'
      AND (um.is_test = false OR um.is_test IS NULL)
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

    // Note: WAN-2.5 I2V does not natively support LoRA weights
    // LoRA data is kept for reference but not used in video generation
    // Character consistency relies on the input image quality and motion prompt precision

    console.log("[v0] ========== USER MODEL DATA ==========")
    console.log("[v0] ✅ Training status:", userData.training_status)
    console.log("[v0] ℹ️  LoRA weights URL:", loraWeightsUrl || "N/A (not used for WAN-2.5)")
    console.log("[v0] ℹ️  Trigger word:", userData.trigger_word || "N/A (not used for WAN-2.5)")
    console.log("[v0] Note: WAN-2.5 I2V does not support LoRA - character consistency via input image")
    console.log("[v0] ========================================")

    const replicate = getReplicateClient()

    // Enhanced motion prompt
    const baseMotionPrompt = enhanceMotionPrompt(motionPrompt, imageDescription)

    // Controlled seed variation for consistency with variety
    // Use a seed range (0-999999) for reproducibility while maintaining variety
    // This allows for consistent character appearance while varying motion
    const controlledSeed = Math.floor(Math.random() * 1000000)

    // Prompt expansion enabled for better video quality
    const enablePromptExpansion = true

    // WAN 2.5 architecture: Motion + Camera Movement structure
    const predictionInput = {
      image: imageUrl,
      prompt: baseMotionPrompt,
      duration: 5, // wan-2.5 supports 5 or 10 seconds
      resolution: "1080p", // "720p" or "1080p"
      negative_prompt:
        "blurry, low quality, distorted face, warping, morphing, identity drift, unnatural motion, flickering, artifacts, extra limbs, duplicate person, no extra characters, jittery edges, camera shake",
      enable_prompt_expansion: enablePromptExpansion, // Enabled for better video quality
      seed: controlledSeed, // Controlled seed variation (0-999999) for consistency with variety
    }

    console.log("[v0] ========== WAN-2.5-I2V-FAST INPUT ==========")
    console.log("[v0] Model: wan-video/wan-2.5-i2v-fast")
    console.log("[v0] Image URL:", predictionInput.image)
    console.log("[v0] Motion prompt:", predictionInput.prompt)
    console.log("[v0] Duration:", predictionInput.duration, "seconds (5s for optimal quality)")
    console.log("[v0] Resolution:", predictionInput.resolution)
    console.log("[v0] Negative prompt:", predictionInput.negative_prompt)
    console.log("[v0] Prompt expansion:", predictionInput.enable_prompt_expansion, "(enabled for better video quality)")
    console.log("[v0] Seed:", predictionInput.seed, "(controlled variation: 0-999999 for consistency with variety)")
    console.log("[v0] LoRA support: Not available in WAN-2.5 (native LoRA not supported)")
    console.log("[v0] Full prediction input:", JSON.stringify(predictionInput, null, 2))
    console.log("[v0] ================================================")

    // Create Replicate prediction (credits already deducted above)
    let prediction
    try {
      prediction = await replicate.predictions.create({
        model: "wan-video/wan-2.5-i2v-fast",
        input: predictionInput,
      })

      console.log("[v0] ========== REPLICATE VIDEO RESPONSE ==========")
      console.log("[v0] ✅ Prediction created successfully")
      console.log("[v0] Prediction ID:", prediction.id)
      console.log("[v0] Prediction status:", prediction.status)
      console.log("[v0] Full prediction:", JSON.stringify(prediction, null, 2))
      console.log("[v0] ================================================")
    } catch (replicateError) {
      // If Replicate call fails, refund the credits using addCredits
      console.error("[v0] ❌ Replicate API call failed, refunding credits:", replicateError)
      const { addCredits } = await import("@/lib/credits")
      const refundResult = await addCredits(neonUser.id, CREDIT_COSTS.ANIMATION, "refund", `Refund for failed video generation: ${imageId}`)
      if (refundResult.success) {
        console.log("[v0] ✅ Credits refunded. New balance:", refundResult.newBalance)
      } else {
        console.error("[v0] ❌ Failed to refund credits:", refundResult.error)
      }
      throw replicateError
    }

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
