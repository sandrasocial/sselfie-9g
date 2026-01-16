import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getOrCreateTrainingModel } from "@/lib/data/training"
import { hasFullAccess } from "@/lib/subscription"
import {
  getReplicateClient,
  FLUX_LORA_TRAINER,
  FLUX_LORA_TRAINER_VERSION,
  DEFAULT_TRAINING_PARAMS,
} from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  console.log("[v0] Start training API called")

  const { zipUrl, gender, modelName } = await request.json()

  if (!zipUrl) {
    return NextResponse.json({ error: "No ZIP URL provided" }, { status: 400 })
  }

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

  const featureEnabled = process.env.ENABLE_TRAINING_AI === "true"
  if (!featureEnabled) {
    const hasAccess = await hasFullAccess(neonUser.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
    }
  }
  
  console.log("[v0] Starting training for user:", neonUser.id)

  const triggerWord = `user${neonUser.id.substring(0, 8)}`
  console.log("[v0] Generated trigger word:", triggerWord)

  const model = await getOrCreateTrainingModel(
    neonUser.id,
    modelName || `${neonUser.display_name || "User"}'s Model`,
    "flux-dev-lora",
    triggerWord,
  )

  console.log("[v0] Got or created training model:", { id: model.id })

  // Save gender to users table
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
    const replicateUsername = process.env.REPLICATE_USERNAME || "sandrasocial"
    const destinationModelName = `user-${neonUser.id.substring(0, 8)}-selfie-lora`
    const destination = `${replicateUsername}/${destinationModelName}`

    console.log("[v0] Using destination:", destination)

    // Check if destination model exists
    console.log("[v0] Checking if destination model exists on Replicate...")
    const checkModelResponse = await fetch(`https://api.replicate.com/v1/models/${destination}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
    })

    if (checkModelResponse.status === 404) {
      // Model doesn't exist, create it
      console.log("[v0] Model doesn't exist, creating it...")
      const createModelResponse = await fetch("https://api.replicate.com/v1/models", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: replicateUsername,
          name: destinationModelName,
          visibility: "private",
          hardware: "gpu-t4",
          description: `Selfie LoRA model for user ${neonUser.id}`,
        }),
      })

      if (!createModelResponse.ok && createModelResponse.status !== 409) {
        const errorData = await createModelResponse.json().catch(() => ({}))
        console.error("[v0] Failed to create destination model:", {
          status: createModelResponse.status,
          error: errorData,
        })
        throw new Error(`Failed to create destination model: ${JSON.stringify(errorData)}`)
      }

      console.log("[v0] Destination model created successfully")
    } else if (checkModelResponse.ok) {
      console.log("[v0] Destination model already exists, will use it for training")
    } else {
      const errorData = await checkModelResponse.json().catch(() => ({}))
      console.error("[v0] Error checking model existence:", {
        status: checkModelResponse.status,
        error: errorData,
      })
      throw new Error(`Failed to check model existence: ${JSON.stringify(errorData)}`)
    }

    console.log("[v0] Starting Replicate training with SDK...")
    const training = await replicate.trainings.create(
      FLUX_LORA_TRAINER.split("/")[0],
      FLUX_LORA_TRAINER.split("/")[1],
      FLUX_LORA_TRAINER_VERSION,
      {
        destination,
        input: {
          ...DEFAULT_TRAINING_PARAMS,
          input_images: zipUrl,
          trigger_word: triggerWord,
        },
      },
    )

    console.log("[v0] Replicate training started successfully:", {
      id: training.id,
      status: training.status,
      trainer: FLUX_LORA_TRAINER,
    })

    await sql`
      UPDATE user_models
      SET 
        training_id = ${training.id},
        replicate_model_id = ${destination},
        training_status = 'training',
        started_at = NOW(),
        updated_at = NOW()
      WHERE id = ${model.id}
    `

    console.log("[v0] Model updated with training_id and replicate_model_id")

    return NextResponse.json({
      success: true,
      modelId: model.id,
      trainingId: training.id,
      triggerWord,
      zipUrl,
      message: "Training started successfully",
    })
  } catch (replicateError: any) {
    console.error("[v0] Replicate training error:", replicateError)

    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = ${String(replicateError?.message || replicateError)},
        updated_at = NOW()
      WHERE id = ${model.id}
    `

    throw replicateError
  }
}
