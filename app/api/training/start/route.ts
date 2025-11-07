import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createTrainingModel } from "@/lib/data/training"
import { getReplicateClient, FLUX_LORA_TRAINER, DEFAULT_TRAINING_PARAMS } from "@/lib/replicate-client"
import { createTrainingZip } from "@/lib/storage"
import { neon } from "@neondatabase/serverless"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
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

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

      // Generate trigger word
      const triggerWord = `user${neonUser.id}`

      await deductCredits(neonUser.id, CREDIT_COSTS.TRAINING, "training", `Training model: ${modelName}`)
      console.log("[v0] Deducted", CREDIT_COSTS.TRAINING, "credits for training")

      const finalBalance = await getUserCredits(neonUser.id)
      console.log("[v0] [TRAINING] Training started. Credits remaining:", finalBalance)

      // Start training
      const training = await replicate.trainings.create(
        FLUX_LORA_TRAINER.split("/")[0],
        FLUX_LORA_TRAINER.split("/")[1],
        {
          destination: `${process.env.REPLICATE_USERNAME || "sandrasocial"}/${neonUser.id}-selfie-lora-${Date.now()}`,
          input: {
            ...DEFAULT_TRAINING_PARAMS,
            input_images: datasetUrl,
            trigger_word: triggerWord,
          },
        },
      )

      console.log("[v0] Replicate training started:", training.id)
      console.log("[v0] Trigger word:", triggerWord)

      // Update model with training ID and trigger word
      await sql`
        UPDATE user_models
        SET 
          training_id = ${training.id},
          trigger_word = ${triggerWord},
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
