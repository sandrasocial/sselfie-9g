import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getOrCreateTrainingModel } from "@/lib/data/training"
import {
  getReplicateClient,
  FLUX_LORA_TRAINER,
  FLUX_LORA_TRAINER_VERSION,
  DEFAULT_TRAINING_PARAMS,
  getAdaptiveTrainingParams,
} from "@/lib/replicate-client"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300 // 5 minutes for file upload and processing
export const runtime = "nodejs" // Ensure Node.js runtime for file handling
export const dynamic = "force-dynamic" // Prevent static optimization

export async function POST(request: Request) {
  console.log("[v0] Upload ZIP API called - starting request processing")
  console.log("[v0] Request headers:", {
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
  })

  // --- Parse form data safely ---
  let formData: FormData
  try {
    console.log("[v0] Attempting to parse FormData...")
    formData = await request.formData()
    console.log("[v0] FormData parsed successfully")
  } catch (error: any) {
    console.error("[v0] Error parsing formData:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split("\n").slice(0, 3),
    })

    const message = error?.message || "Unknown error while reading upload body"

    if (
      message.includes("disturbed") ||
      message.includes("locked") ||
      message.includes("already been consumed") ||
      message.includes("body stream") ||
      message.includes("Body is unusable")
    ) {
      console.error("[v0] Body stream error detected - body was already consumed by another handler")
      return NextResponse.json(
        {
          error: "Upload failed: Body is disturbed or locked",
          details:
            "The request body was already read by another process. This is usually caused by middleware or error handlers consuming the request. Please try again.",
          troubleshooting:
            "If this persists, try: 1) Refreshing the page 2) Using fewer/smaller images 3) Checking your internet connection",
        },
        { status: 400 },
      )
    }

    if (message.includes("too large") || message.includes("exceeded")) {
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
        details: message,
      },
      { status: 400 },
    )
  }

  const zipFile = formData.get("zipFile") as File
  const gender = formData.get("gender") as string
  const ethnicity = formData.get("ethnicity") as string
  const modelName = formData.get("modelName") as string
  const imageCount = formData.get("imageCount")
    ? Number.parseInt(formData.get("imageCount") as string, 10)
    : null

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

  // --- Main training flow ---
  let model: any | null = null

  try {
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

    // --- Retraining quality validation ---
    const existingModelForValidation = await sql`
      SELECT id, created_at
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingModelForValidation.length > 0 && imageCount !== null) {
      // This is a retraining - validate image count
      const previousImageCount = await sql`
        SELECT COUNT(*) as count
        FROM selfie_uploads
        WHERE user_id = ${neonUser.id}
      `
      const prevCount = Number(previousImageCount[0]?.count || 0)

      if (imageCount < 5) {
        return NextResponse.json(
          {
            error: "Insufficient images",
            details: `You need at least 5 images for training. You uploaded ${imageCount} images.`,
            minimumRequired: 5,
          },
          { status: 400 },
        )
      }

      // Warn if significantly fewer images than original (but allow it)
      if (prevCount > 0 && imageCount < prevCount * 0.5) {
        console.warn(`[v0] ⚠️ Retraining with fewer images: ${imageCount} vs original ${prevCount}`)
      }

      if (imageCount < 15) {
        console.log(
          `[v0] ℹ️ Retraining with ${imageCount} images (recommended: 15-25 for best quality)`,
        )
      }
    } else if (imageCount !== null && imageCount < 5) {
      // First-time training validation
      return NextResponse.json(
        {
          error: "Insufficient images",
          details: `You need at least 5 images for training. You uploaded ${imageCount} images.`,
          minimumRequired: 5,
        },
        { status: 400 },
      )
    }

    // Upload ZIP to Vercel Blob
    console.log("[v0] Uploading ZIP to Vercel Blob...")
    const blob = await put(`training/${neonUser.id}/${zipFile.name}`, zipFile, {
      access: "public",
      contentType: "application/zip",
      addRandomSuffix: true,
    })

    console.log("[v0] ZIP uploaded to Blob:", blob.url)

    // Get existing model info BEFORE calling getOrCreateTrainingModel
    const existingModel = await sql`
      SELECT 
        id,
        replicate_model_id,
        trigger_word, 
        lora_scale
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `

    const triggerWord =
      existingModel.length > 0 && existingModel[0].trigger_word
        ? existingModel[0].trigger_word
        : `user${neonUser.id.substring(0, 8)}`

    const isRetraining = existingModel.length > 0

    const destinationModelName =
      isRetraining && existingModel[0].replicate_model_id
        ? existingModel[0].replicate_model_id.split("/")[1]
        : `user-${neonUser.id.substring(0, 8)}-selfie-lora`

    console.log(`[v0] ${isRetraining ? "RETRAINING" : "FIRST-TIME TRAINING"}`)
    console.log(
      "[v0] Trigger word:",
      triggerWord,
      isRetraining ? "(preserved from original)" : "(new)",
    )
    console.log(
      "[v0] Destination model name:",
      destinationModelName,
      isRetraining ? "(reusing existing)" : "(new)",
    )
    if (isRetraining) {
      console.log("[v0] Original LoRA scale:", existingModel[0].lora_scale)
      console.log("[v0] Original replicate_model_id:", existingModel[0].replicate_model_id)
    }

    // Create or reuse training model row
    try {
      model = await getOrCreateTrainingModel(
        neonUser.id,
        modelName || `${neonUser.display_name || "User"}'s Model`,
        "flux-dev-lora",
        triggerWord,
      )
      console.log("[v0] Got or created training model:", { id: model.id })
    } catch (modelError: any) {
      console.error("[v0] Error getting or creating training model:", modelError)
      return NextResponse.json(
        {
          error: "Failed to prepare training model",
          details: modelError?.message || String(modelError),
        },
        { status: 500 },
      )
    }

    // Save gender and ethnicity to users table (non-critical)
    if (gender || ethnicity) {
      try {
        await sql`
          UPDATE users
          SET 
            gender = ${gender || null},
            ethnicity = ${ethnicity || null},
            updated_at = NOW()
          WHERE id = ${neonUser.id}
        `
        console.log("[v0] Gender and ethnicity saved to users table:", { gender, ethnicity })
      } catch (updateError: any) {
        console.error("[v0] Error updating user gender/ethnicity:", updateError)
      }
    }

    // --- Call Replicate and start training ---
    const replicate = getReplicateClient()
    const replicateUsername = process.env.REPLICATE_USERNAME || "sandrasocial"

    const destination = `${replicateUsername}/${destinationModelName}`

    console.log(
      "[v0] Using destination:",
      destination,
      isRetraining ? "(reusing existing)" : "(new)",
    )

    console.log("[v0] Checking if destination model exists on Replicate...")
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

    const adaptiveParams =
      imageCount !== null ? getAdaptiveTrainingParams(imageCount) : DEFAULT_TRAINING_PARAMS

    if (imageCount !== null) {
      console.log(`[v0] Using adaptive training parameters for ${imageCount} images:`, {
        num_repeats: adaptiveParams.num_repeats,
        lora_rank: adaptiveParams.lora_rank,
        steps: adaptiveParams.steps,
      })
    }

    console.log("[v0] Starting Replicate training with SDK...")
    const training = await replicate.trainings.create(
      FLUX_LORA_TRAINER.split("/")[0],
      FLUX_LORA_TRAINER.split("/")[1],
      FLUX_LORA_TRAINER_VERSION,
      {
        destination,
        input: {
          ...adaptiveParams,
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
  } catch (error: any) {
    // Top-level error handler for any unexpected failures
    console.error("[v0] [TRAINING] Error in upload-zip route:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split("\n").slice(0, 10),
      code: error?.code,
      constraint: error?.constraint,
    })

    // Best-effort: mark model as failed if it was created
    if (model?.id) {
      try {
        await sql`
          UPDATE user_models
          SET 
            training_status = 'failed',
            failure_reason = ${String(error?.message || error)},
            updated_at = NOW()
          WHERE id = ${model.id}
        `
      } catch (updateError: any) {
        console.error("[v0] Error updating model status after failure:", updateError)
      }
    }

    return NextResponse.json(
      {
        error: "Failed to start training",
        details: error?.message || String(error) || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
