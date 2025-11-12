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
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300 // 5 minutes for file upload and processing
export const runtime = "nodejs" // Ensure Node.js runtime for file handling
export const dynamic = "force-dynamic" // Prevent static optimization

export async function POST(request: Request) {
  console.log("[v0] Upload ZIP API called - starting request processing")

  let formData
  try {
    formData = await request.formData()
    console.log("[v0] FormData parsed successfully")
  } catch (error: any) {
    console.error("[v0] Error parsing formData:", error)

    if (error.message?.includes("too large") || error.message?.includes("exceeded")) {
      return NextResponse.json(
        {
          error: "File too large",
          details:
            "The uploaded files are too large. Please use 10-15 images and ensure each photo is under 2MB. Compress your images before uploading.",
        },
        { status: 413 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to process upload",
        details: error.message || "Unknown error occurred while processing your images.",
      },
      { status: 400 },
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

  if (zipSizeMB > 60) {
    return NextResponse.json(
      {
        error: "File too large",
        details: `ZIP file is ${zipSizeMB.toFixed(2)}MB. Maximum size is 60MB. Please use fewer images or lower quality photos.`,
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

  console.log("[v0] Uploading ZIP directly to Replicate...")
  let replicateFileUrl: string
  try {
    const replicateFormData = new FormData()
    replicateFormData.append("content", zipFile, "training_images.zip")

    const uploadResponse = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: replicateFormData,
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      console.error("[v0] Failed to upload to Replicate:", errorData)
      throw new Error(`Replicate upload failed: ${JSON.stringify(errorData)}`)
    }

    const fileData = await uploadResponse.json()
    console.log("[v0] ZIP uploaded to Replicate successfully:", {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
    })

    // Use the Replicate file URL format
    replicateFileUrl = fileData.urls.get
    console.log("[v0] Replicate file URL:", replicateFileUrl)
  } catch (uploadError: any) {
    console.error("[v0] Replicate upload error:", uploadError)
    return NextResponse.json(
      {
        error: "Failed to upload training images",
        details: uploadError.message || "Could not upload images to Replicate. Please try again.",
      },
      { status: 500 },
    )
  }

  const triggerWord = `user${neonUser.id.substring(0, 8)}`
  console.log("[v0] Generated trigger word:", triggerWord)

  // Get or create training model
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

    console.log("[v0] Starting Replicate training with file URL...")
    const training = await replicate.trainings.create(
      FLUX_LORA_TRAINER.split("/")[0],
      FLUX_LORA_TRAINER.split("/")[1],
      FLUX_LORA_TRAINER_VERSION,
      {
        destination,
        input: {
          ...DEFAULT_TRAINING_PARAMS,
          input_images: replicateFileUrl,
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
