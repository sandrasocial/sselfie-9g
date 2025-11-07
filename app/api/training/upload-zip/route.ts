import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateTrainingModel } from "@/lib/data/training"
import {
  getReplicateClient,
  FLUX_LORA_TRAINER,
  FLUX_LORA_TRAINER_VERSION,
  DEFAULT_TRAINING_PARAMS,
} from "@/lib/replicate-client"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload ZIP API called")

    let formData
    try {
      formData = await request.formData()
    } catch (error: any) {
      console.error("[v0] Error parsing formData:", error)
      return NextResponse.json(
        {
          error: "Request too large",
          details:
            "The uploaded file is too large. Please use fewer images (10-15 recommended) or ensure photos are under 2MB each.",
        },
        { status: 413 },
      )
    }

    const zipFile = formData.get("zipFile") as File
    const gender = formData.get("gender") as string
    const modelName = formData.get("modelName") as string

    if (!zipFile) {
      return NextResponse.json({ error: "No ZIP file provided" }, { status: 400 })
    }

    const zipSizeMB = zipFile.size / 1024 / 1024
    console.log(`[v0] Received ZIP file: ${zipFile.name}, size: ${zipSizeMB.toFixed(2)}MB`)

    if (zipSizeMB > 4.5) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `ZIP file is ${zipSizeMB.toFixed(2)}MB. Maximum size is 4.5MB. Please use fewer images or lower quality photos.`,
        },
        { status: 413 },
      )
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

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Upload ZIP to Vercel Blob
    console.log("[v0] Uploading ZIP to Vercel Blob...")
    const blob = await put(`training/${neonUser.id}/${zipFile.name}`, zipFile, {
      access: "public",
      contentType: "application/zip",
    })

    console.log("[v0] ZIP uploaded to Blob:", blob.url)

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

      console.log("[v0] Creating destination model on Replicate...")
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

      if (createModelResponse.status === 409) {
        console.log("[v0] Destination model already exists, continuing with training")
      } else if (createModelResponse.status === 201 || createModelResponse.status === 200) {
        const modelData = await createModelResponse.json()
        console.log("[v0] Destination model created successfully:", modelData.name)
      } else {
        const errorData = await createModelResponse.json().catch(() => ({}))
        console.error("[v0] Failed to create destination model:", {
          status: createModelResponse.status,
          error: errorData,
        })
        throw new Error(`Failed to create destination model: ${JSON.stringify(errorData)}`)
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
            input_images: blob.url,
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
        zipUrl: blob.url,
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
  } catch (error: any) {
    console.error("[v0] Error uploading ZIP and starting training:", error)
    return NextResponse.json(
      {
        error: "Failed to start training",
        details: error?.message || String(error),
      },
      { status: 500 },
    )
  }
}
