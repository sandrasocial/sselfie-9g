import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createTrainingModel } from "@/lib/data/training"
import { getReplicateClient, DEFAULT_TRAINING_PARAMS, getAdaptiveTrainingParams } from "@/lib/replicate-client"
import { createTrainingZip } from "@/lib/storage"
import { getDbClient } from "@/lib/db-singleton"
import { rateLimit } from "@/lib/rate-limit-api"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"

const sql = getDbClient()

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 5,
    windowMs: 3600000, // 1 hour
  })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message:
          "Too many training requests. You can start 5 trainings per hour. Please wait before starting another session.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    console.log("[v0] Start training API called")

    const body = await request.json()
    const { modelName, modelType, gender, imageUrls } = body

    console.log("[v0] Training request:", { modelName, modelType, gender, imageCount: imageUrls?.length })

    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get Neon user (respects admin impersonation)
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    console.log("[v0] [TRAINING] Using effective user for training:", {
      userId: neonUser.id,
      email: neonUser.email,
    })

    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.TRAINING)
    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)
      console.log("[v0] [TRAINING] ❌ Insufficient credits:", {
        userId: neonUser.id,
        currentBalance,
        required: CREDIT_COSTS.TRAINING,
        shortfall: CREDIT_COSTS.TRAINING - currentBalance,
      })

      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: CREDIT_COSTS.TRAINING,
          current: currentBalance,
          message: `Training requires ${CREDIT_COSTS.TRAINING} credits. You currently have ${currentBalance} credits. Please purchase more credits or upgrade your plan.`,
        },
        { status: 402 },
      )
    }

    // Validate images
    if (!imageUrls || imageUrls.length < 5) {
      return NextResponse.json({ error: "At least 5 training images are required" }, { status: 400 })
    }

    // Create training model record
    const model = await createTrainingModel(
      neonUser.id,
      modelName || `${neonUser.display_name || "User"}'s Model`,
      modelType || "flux-dev-lora",
      gender,
    )

    if (gender) {
      await sql`
        UPDATE users
        SET 
          gender = ${gender},
          updated_at = NOW()
        WHERE id = ${neonUser.id}
      `
      console.log("[v0] Gender saved to users table:", gender)
    }

    try {
      const replicate = getReplicateClient()

      // Create training dataset ZIP
      const datasetUrl = await createTrainingZip(imageUrls)
      
      // CRITICAL FIX: Use adaptive training parameters based on image count
      const imageCount = imageUrls?.length || 0
      const adaptiveParams = getAdaptiveTrainingParams(imageCount)
      
      if (imageCount > 0) {
        console.log(`[v0] Using adaptive training parameters for ${imageCount} images:`, {
          num_repeats: adaptiveParams.num_repeats,
          lora_rank: adaptiveParams.lora_rank,
          steps: adaptiveParams.steps,
        })
      }

      // Generate trigger word
      const triggerWord = `user${neonUser.id}`

      await deductCredits(neonUser.id, CREDIT_COSTS.TRAINING, "training", `Training model: ${modelName}`)
      console.log("[v0] Deducted", CREDIT_COSTS.TRAINING, "credits for training")

      const finalBalance = await getUserCredits(neonUser.id)
      console.log("[v0] [TRAINING] Training started. Credits remaining:", finalBalance)

      // CRITICAL FIX: Use FLUX_LORA_TRAINER_VERSION from replicate-client.ts instead of hardcoded version
      // This ensures consistency between first-time training and retraining
      const { FLUX_LORA_TRAINER, FLUX_LORA_TRAINER_VERSION } = await import("@/lib/replicate-client")
      
      // CRITICAL FIX: Check for existing model BEFORE calling getOrCreateTrainingModel
      // getOrCreateTrainingModel sets replicate_model_id to NULL, which would break this check!
      const existingModelCheck = await sql`
        SELECT replicate_model_id, trigger_word
        FROM user_models
        WHERE user_id = ${neonUser.id}
        AND training_status = 'completed'
        AND (is_test = false OR is_test IS NULL)
        ORDER BY created_at DESC
        LIMIT 1
      `

      const isRetraining = existingModelCheck.length > 0
      const destinationModelName = isRetraining && existingModelCheck[0].replicate_model_id
        ? existingModelCheck[0].replicate_model_id.split('/')[1] // Extract model name from full ID
        : `user-${neonUser.id.substring(0, 8)}-selfie-lora`
      
      const destination = `${process.env.REPLICATE_USERNAME || "sandrasocial"}/${destinationModelName}`
      
      // For retraining, preserve original trigger word
      const finalTriggerWord = isRetraining && existingModelCheck[0].trigger_word
        ? existingModelCheck[0].trigger_word
        : triggerWord

      console.log(`[v0] ${isRetraining ? 'RETRAINING' : 'FIRST-TIME TRAINING'}`)
      console.log("[v0] Using trainer:", FLUX_LORA_TRAINER)
      console.log("[v0] Using trainer version:", FLUX_LORA_TRAINER_VERSION)
      console.log("[v0] Destination model:", destination)
      console.log("[v0] Trigger word:", finalTriggerWord, isRetraining ? "(preserved)" : "(new)")

      // Start training with fast-flux-trainer
      const training = await replicate.trainings.create(
        FLUX_LORA_TRAINER.split("/")[0],
        FLUX_LORA_TRAINER.split("/")[1],
        FLUX_LORA_TRAINER_VERSION, // CRITICAL: Use constant instead of hardcoded version
        {
          destination, // CRITICAL: Reuse existing model name for retraining
          input: {
            ...adaptiveParams, // CRITICAL FIX: Use adaptive parameters based on image count
            input_images: datasetUrl,
            trigger_word: finalTriggerWord, // CRITICAL: Preserve original trigger word for retraining
          },
        },
      )

      console.log("[v0] Replicate training started:", training.id)
      console.log("[v0] Trigger word:", triggerWord)
      console.log("[v0] Using fast-flux-trainer with Claude's optimized settings")

      // Update model with training ID and trigger word
      // CRITICAL FIX: Use finalTriggerWord (preserved for retraining) instead of triggerWord
      await sql`
        UPDATE user_models
        SET 
          training_id = ${training.id},
          trigger_word = ${finalTriggerWord}, -- CRITICAL FIX: Preserve original trigger word for retraining
          training_status = 'training',
          started_at = NOW(),
          updated_at = NOW()
        WHERE id = ${model.id}
      `

      console.log("[v0] Model updated with training_id and trigger_word")

      return NextResponse.json({
        success: true,
        modelId: model.id,
        trainingId: training.id,
        triggerWord,
        message: "Training started successfully",
        creditsDeducted: CREDIT_COSTS.TRAINING,
      })
    } catch (replicateError) {
      console.error("[v0] Replicate training error:", replicateError)

      await deductCredits(neonUser.id, -CREDIT_COSTS.TRAINING, "refund", "Training failed to start - refund")
      console.log("[v0] Refunded", CREDIT_COSTS.TRAINING, "credits due to training failure")

      // Update model status to failed
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = ${String(replicateError)},
          updated_at = NOW()
        WHERE id = ${model.id}
      `

      throw replicateError
    }
  } catch (error) {
    console.error("[v0] Error starting training:", error)
    return NextResponse.json({ error: "Failed to start training" }, { status: 500 })
  }
}
