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
import JSZip from "jszip"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300
export const runtime = "nodejs"

export async function POST(request: Request) {
  console.log("[v0] Create ZIP from blobs API called")

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { imageUrls, gender, modelName } = await request.json()

  if (!imageUrls || imageUrls.length < 10) {
    return NextResponse.json({ error: "At least 10 images required" }, { status: 400 })
  }

  console.log(`[v0] Creating ZIP from ${imageUrls.length} blob URLs`)

  try {
    const zip = new JSZip()

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      console.log(`[v0] Fetching image ${i + 1}/${imageUrls.length}: ${url}`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image ${i + 1}`)
      }

      const blob = await response.blob()
      zip.file(`image-${i}.jpg`, blob)
    }

    console.log("[v0] Generating ZIP file...")
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    const zipSizeMB = zipBlob.size / 1024 / 1024
    console.log(`[v0] ZIP created: ${zipSizeMB.toFixed(2)}MB`)

    const zipUrl = await put(`training/${neonUser.id}/training-${Date.now()}.zip`, zipBlob, {
      access: "public",
      contentType: "application/zip",
    })

    console.log("[v0] ZIP uploaded to Blob:", zipUrl.url)

    const triggerWord = `user${neonUser.id.substring(0, 8)}`
    console.log("[v0] Generated trigger word:", triggerWord)

    const model = await getOrCreateTrainingModel(
      neonUser.id,
      modelName || `${neonUser.display_name || "User"}'s Model`,
      "flux-dev-lora",
      triggerWord,
    )

    console.log("[v0] Got or created training model:", { id: model.id })

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

    const replicate = getReplicateClient()
    const replicateUsername = process.env.REPLICATE_USERNAME || "sandrasocial"
    const destinationModelName = `user-${neonUser.id.substring(0, 8)}-selfie-lora`
    const destination = `${replicateUsername}/${destinationModelName}`

    console.log("[v0] Using destination:", destination)

    const checkModelResponse = await fetch(`https://api.replicate.com/v1/models/${destination}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
    })

    if (checkModelResponse.status === 404) {
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
        console.error("[v0] Failed to create destination model:", errorData)
        throw new Error(`Failed to create destination model: ${JSON.stringify(errorData)}`)
      }

      console.log("[v0] Destination model created successfully")
    }

    console.log("[v0] Starting Replicate training...")
    const training = await replicate.trainings.create(
      FLUX_LORA_TRAINER.split("/")[0],
      FLUX_LORA_TRAINER.split("/")[1],
      FLUX_LORA_TRAINER_VERSION,
      {
        destination,
        input: {
          ...DEFAULT_TRAINING_PARAMS,
          input_images: zipUrl.url,
          trigger_word: triggerWord,
        },
      },
    )

    console.log("[v0] Replicate training started successfully:", training.id)

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
      zipUrl: zipUrl.url,
      message: "Training started successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error creating ZIP and starting training:", error)
    return NextResponse.json(
      {
        error: "Failed to create training",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
