import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function extractProgressFromLogs(logs: string): number | null {
  if (!logs) return null

  const fluxStepMatch = logs.match(/step\s+(\d+)\/(\d+)/i)
  if (fluxStepMatch) {
    const current = Number.parseInt(fluxStepMatch[1], 10)
    const total = Number.parseInt(fluxStepMatch[2], 10)
    const progress = Math.round((current / total) * 100)
    if (progress > 0 && progress <= 100) {
      return progress
    }
  }

  const percentMatches = logs.match(/(\d+)%/g)
  if (percentMatches && percentMatches.length > 0) {
    // Get the last percentage mentioned (most recent progress)
    const lastPercent = percentMatches[percentMatches.length - 1]
    const percentValue = Number.parseInt(lastPercent, 10)
    // Only return if it's a meaningful progress value
    if (percentValue > 0 && percentValue <= 100) {
      return percentValue
    }
  }

  const epochMatch = logs.match(/epoch\s+(\d+)\/(\d+)/i)
  if (epochMatch) {
    const current = Number.parseInt(epochMatch[1], 10)
    const total = Number.parseInt(epochMatch[2], 10)
    const progress = Math.round((current / total) * 100)
    if (progress > 0 && progress <= 100) {
      return progress
    }
  }

  return null
}

function estimateProgress(startedAt: Date, status: string): number {
  const elapsed = Date.now() - new Date(startedAt).getTime()
  const elapsedMinutes = elapsed / (60 * 1000)

  const estimatedTotalMinutes = 5

  if (status === "starting") {
    return Math.min(10, Math.round((elapsedMinutes / estimatedTotalMinutes) * 100))
  } else if (status === "processing") {
    const baseProgress = 10
    const maxProgress = 95
    const progressRange = maxProgress - baseProgress

    const timeProgress = (elapsedMinutes / estimatedTotalMinutes) * 100
    const estimatedProgress = baseProgress + (timeProgress * progressRange) / 100

    return Math.min(maxProgress, Math.max(baseProgress, Math.round(estimatedProgress)))
  }

  return 10
}

function calculateRemainingMinutes(startedAt: Date, currentProgress: number): number {
  const elapsed = Date.now() - new Date(startedAt).getTime()
  const elapsedMinutes = elapsed / (60 * 1000)

  // Avoid division by zero
  if (currentProgress <= 0 || currentProgress >= 100) {
    return 0
  }

  // Calculate estimated total time based on current progress and elapsed time
  const estimatedTotalMinutes = (elapsedMinutes / currentProgress) * 100

  // Calculate remaining time
  const remainingMinutes = Math.max(0, estimatedTotalMinutes - elapsedMinutes)

  return Math.round(remainingMinutes)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get("modelId")

    console.log("[v0] Training progress API called for modelId:", modelId)

    if (!modelId) {
      return NextResponse.json({ error: "Model ID required" }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const models = await sql`
      SELECT 
        id, 
        user_id, 
        replicate_model_id, 
        trigger_word, 
        training_status, 
        training_progress, 
        training_id,
        started_at,
        created_at,
        completed_at,
        replicate_version_id,
        lora_weights_url,
        failure_reason,
        estimated_completion_time,
        updated_at,
        model_name,
        trained_model_path,
        lora_scale
      FROM user_models
      WHERE id = ${modelId} AND user_id = ${neonUser.id}
    `

    if (models.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = models[0]

    console.log("[v0] Model data from database:", {
      id: model.id,
      training_id: model.training_id,
      training_status: model.training_status,
      training_progress: model.training_progress,
      started_at: model.started_at,
    })

    const debugInfo = {
      hasTrainingId: !!model.training_id,
      trainingId: model.training_id,
      trainingStatus: model.training_status,
      currentProgress: model.training_progress,
    }

    // If training is complete or failed, return current status
    if (model.training_status === "completed" || model.training_status === "failed") {
      return NextResponse.json({
        status: model.training_status,
        progress: model.training_progress || 100,
        model: model,
        debug: debugInfo,
      })
    }

    // Check Replicate training status
    if (model.training_id) {
      console.log("[v0] Checking Replicate for training_id:", model.training_id)
      try {
        const replicate = getReplicateClient()
        const training = await replicate.trainings.get(model.training_id)

        console.log(
          "[v0] Full Replicate training object:",
          JSON.stringify(
            {
              id: training.id,
              status: training.status,
              metrics: training.metrics,
              logs_length: training.logs?.length,
              output: training.output,
              created_at: training.created_at,
              started_at: training.started_at,
              completed_at: training.completed_at,
            },
            null,
            2,
          ),
        )

        debugInfo.replicateStatus = training.status
        debugInfo.replicateLogsLength = training.logs?.length || 0
        debugInfo.replicateMetrics = training.metrics

        let progress = model.training_progress || 0

        if (training.status === "succeeded") {
          progress = 100
          debugInfo.progressSource = "completed"
        } else if (training.status === "processing" || training.status === "starting") {
          if (training.metrics && typeof training.metrics === "object" && "progress" in training.metrics) {
            progress = Math.round(training.metrics.progress * 100)
            debugInfo.progressSource = "replicate_metrics"
            debugInfo.metricsProgress = progress
            console.log("[v0] Progress from Replicate metrics:", progress)
          } else {
            // Try to extract progress from logs first
            const logProgress = extractProgressFromLogs(training.logs || "")
            if (logProgress !== null) {
              progress = logProgress
              debugInfo.progressSource = "logs"
              debugInfo.extractedProgress = logProgress
              console.log("[v0] Progress from logs:", progress)
            } else {
              // Estimate based on elapsed time
              const startTime = model.started_at || model.created_at
              progress = estimateProgress(startTime, training.status)
              debugInfo.progressSource = "estimated"
              debugInfo.estimatedProgress = progress
              debugInfo.startedAt = startTime
              debugInfo.elapsedMinutes = Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
              console.log("[v0] Progress estimated:", progress, "elapsed minutes:", debugInfo.elapsedMinutes)
            }
          }
        }

        console.log("[v0] Final calculated progress:", progress)

        // Update database with latest status
        if (training.status === "succeeded") {
          let loraWeightsUrl = null
          let extractionMethod = "none"

          // CRITICAL: Try multiple ways to get the LoRA weights URL
          // This must be consistent for both first-time training and retraining
          if (training.output) {
            // Method 1: Direct weights URL (most reliable)
            if (training.output.weights) {
              loraWeightsUrl = training.output.weights
              extractionMethod = "direct_weights"
              console.log("[v0] ✅ LoRA URL extracted via Method 1: direct weights")
            }
            // Method 2: Version-based URL (construct from version hash)
            else if (training.output.version) {
              // Extract version hash if it's in format "model:hash"
              const versionHash = training.output.version.includes(':')
                ? training.output.version.split(':')[1]
                : training.output.version
              
              loraWeightsUrl = `https://replicate.delivery/pbxt/${versionHash}/flux-lora.tar`
              extractionMethod = "version_constructed"
              console.log("[v0] ✅ LoRA URL extracted via Method 2: constructed from version hash")
              console.log("[v0]   Version hash:", versionHash)
            }
            // Method 3: Check if output is a string URL
            else if (typeof training.output === "string" && training.output.startsWith("http")) {
              loraWeightsUrl = training.output
              extractionMethod = "string_url"
              console.log("[v0] ✅ LoRA URL extracted via Method 3: string URL")
            }
          }

          if (!loraWeightsUrl) {
            console.error("[v0] ❌ CRITICAL: Failed to extract LoRA weights URL!")
            console.error("[v0] Training output:", JSON.stringify(training.output, null, 2))
            // Try fallback: construct from model version if we have it
            if (training.output?.model && training.output?.version) {
              const versionHash = training.output.version.includes(':')
                ? training.output.version.split(':')[1]
                : training.output.version
              loraWeightsUrl = `https://replicate.delivery/pbxt/${versionHash}/flux-lora.tar`
              extractionMethod = "fallback_constructed"
              console.log("[v0] ⚠️  Using fallback LoRA URL construction")
            }
          }

          console.log("[v0] Training completed - LoRA weights URL:", loraWeightsUrl)
          console.log("[v0] Extraction method:", extractionMethod)
          console.log("[v0] Replicate model ID:", training.output?.model)
          console.log("[v0] Replicate version ID:", training.output?.version)
          
          if (!loraWeightsUrl) {
            console.error("[v0] ❌ CRITICAL ERROR: LoRA weights URL is NULL after all extraction methods!")
            console.error("[v0] This will cause image generation to fail!")
          }

          // CRITICAL: Preserve existing LoRA scale if it was customized (not default 1.0)
          // Only set to 1.0 if it was never set or is null
          // This ensures retraining doesn't reset a custom LoRA scale
          const preservedLoraScale = model.lora_scale && parseFloat(model.lora_scale) !== 1.0
            ? model.lora_scale
            : 1.0

          console.log("[v0] LoRA scale for completed training:", {
            original: model.lora_scale,
            preserved: preservedLoraScale,
            reason: model.lora_scale && parseFloat(model.lora_scale) !== 1.0 
              ? "Preserved custom scale" 
              : "Using default 1.0"
          })

          await sql`
            UPDATE user_models
            SET 
              training_status = 'completed',
              training_progress = 100,
              replicate_model_id = ${training.output?.model || model.replicate_model_id},
              replicate_version_id = ${training.output?.version || null},
              lora_weights_url = ${loraWeightsUrl},
              lora_scale = ${preservedLoraScale}, -- Preserve custom scale or use 1.0
              completed_at = NOW(),
              updated_at = NOW()
            WHERE id = ${modelId}
          `

          return NextResponse.json({
            status: "completed",
            progress: 100,
            model: {
              ...model,
              training_status: "completed",
              training_progress: 100,
              replicate_model_id: training.output?.model || model.replicate_model_id,
              replicate_version_id: training.output?.version,
              lora_weights_url: loraWeightsUrl,
            },
            debug: debugInfo,
          })
        } else if (training.status === "failed" || training.status === "canceled") {
          await sql`
            UPDATE user_models
            SET 
              training_status = 'failed',
              failure_reason = ${training.error || "Training failed"},
              updated_at = NOW()
            WHERE id = ${modelId}
          `

          return NextResponse.json({
            status: "failed",
            progress: model.training_progress || 0,
            error: training.error,
            debug: debugInfo,
          })
        } else {
          console.log("[v0] Updating database with progress:", progress)
          await sql`
            UPDATE user_models
            SET 
              training_progress = ${progress},
              updated_at = NOW()
            WHERE id = ${modelId}
          `
          console.log("[v0] Database updated successfully")

          return NextResponse.json({
            status: "training",
            progress: progress,
            estimated_remaining_minutes: calculateRemainingMinutes(model.started_at || model.created_at, progress),
            model: {
              ...model,
              training_progress: progress,
            },
            debug: debugInfo,
          })
        }
      } catch (replicateError: any) {
        const errorMessage = replicateError?.message || String(replicateError)
        const isTemporaryError =
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("Bad gateway") ||
          errorMessage.includes("Service unavailable")

        debugInfo.replicateError = errorMessage
        debugInfo.isTemporaryError = isTemporaryError

        console.error("[v0] Error checking Replicate status:", {
          error: errorMessage,
          isTemporary: isTemporaryError,
          trainingId: model.training_id,
        })

        // For temporary errors, estimate progress and continue showing training state
        if (isTemporaryError && model.training_status === "training") {
          const startTime = model.started_at || model.created_at
          const estimatedProgress = estimateProgress(startTime, "processing")

          console.log("[v0] Replicate API temporarily unavailable, using estimated progress:", estimatedProgress)

          // Update progress in database
          await sql`
            UPDATE user_models
            SET 
              training_progress = ${estimatedProgress},
              updated_at = NOW()
            WHERE id = ${modelId}
          `

          return NextResponse.json({
            status: "training",
            progress: estimatedProgress,
            estimated_remaining_minutes: calculateRemainingMinutes(
              model.started_at || model.created_at,
              estimatedProgress,
            ),
            model: {
              ...model,
              training_progress: estimatedProgress,
            },
            debug: debugInfo,
            warning: "Replicate API temporarily unavailable. Using estimated progress.",
          })
        }

        // For other errors or non-training states, return current database status
        return NextResponse.json({
          status: model.training_status,
          progress: model.training_progress || 0,
          model: model,
          debug: debugInfo,
          error: isTemporaryError ? "Replicate API temporarily unavailable" : "Failed to check Replicate status",
        })
      }
    } else {
      debugInfo.reason = "No training_id in database"
    }

    return NextResponse.json({
      status: model.training_status,
      progress: model.training_progress || 0,
      model: model,
      debug: debugInfo,
    })
  } catch (error) {
    console.error("[v0] Error checking training progress:", error)
    return NextResponse.json(
      {
        error: "Failed to check training progress",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
