import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function extractProgressFromLogs(logs: string): number | null {
  if (!logs) return null

  // Try to find percentage in logs (e.g., "50%", "Progress: 75%", etc.)
  const percentMatch = logs.match(/(\d+)%/)
  if (percentMatch) {
    return Number.parseInt(percentMatch[1], 10)
  }

  // Try to find step progress (e.g., "Step 500/1000")
  const stepMatch = logs.match(/Step\s+(\d+)\/(\d+)/)
  if (stepMatch) {
    const current = Number.parseInt(stepMatch[1], 10)
    const total = Number.parseInt(stepMatch[2], 10)
    return Math.round((current / total) * 100)
  }

  return null
}

function estimateProgress(startedAt: Date, status: string): number {
  const elapsed = Date.now() - new Date(startedAt).getTime()
  const estimatedTotalTime = 20 * 60 * 1000 // 20 minutes in milliseconds

  if (status === "starting") {
    return Math.min(10, Math.round((elapsed / estimatedTotalTime) * 100))
  } else if (status === "processing") {
    // Start at 10% and go up to 95% based on elapsed time
    const baseProgress = 10
    const maxProgress = 95
    const timeProgress = Math.round((elapsed / estimatedTotalTime) * 100)
    return Math.min(maxProgress, Math.max(baseProgress, timeProgress))
  }

  return 10
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get("modelId")

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

    // Get model from database
    const models = await sql`
      SELECT * FROM user_models
      WHERE id = ${modelId} AND user_id = ${neonUser.id}
    `

    if (models.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = models[0]

    // If training is complete or failed, return current status
    if (model.training_status === "completed" || model.training_status === "failed") {
      return NextResponse.json({
        status: model.training_status,
        progress: model.training_progress || 100,
        model: model,
      })
    }

    // Check Replicate training status
    if (model.training_id) {
      try {
        const replicate = getReplicateClient()
        const training = await replicate.trainings.get(model.training_id)

        console.log("[v0] Replicate training status:", training.status)
        console.log("[v0] Replicate training logs:", training.logs?.substring(0, 200))

        let progress = model.training_progress || 0

        if (training.status === "succeeded") {
          progress = 100
        } else if (training.status === "processing" || training.status === "starting") {
          // Try to extract progress from logs first
          const logProgress = extractProgressFromLogs(training.logs || "")
          if (logProgress !== null) {
            progress = logProgress
            console.log("[v0] Extracted progress from logs:", progress)
          } else {
            // Estimate based on elapsed time
            progress = estimateProgress(model.started_at || model.created_at, training.status)
            console.log("[v0] Estimated progress based on time:", progress)
          }
        }

        // Update database with latest status
        if (training.status === "succeeded") {
          let loraWeightsUrl = null

          // Try multiple ways to get the LoRA weights URL
          if (training.output) {
            // Method 1: Direct weights URL
            if (training.output.weights) {
              loraWeightsUrl = training.output.weights
            }
            // Method 2: Version-based URL
            else if (training.output.version) {
              loraWeightsUrl = `https://replicate.delivery/pbxt/${training.output.version}/trained_model.tar`
            }
            // Method 3: Check if output is a string URL
            else if (typeof training.output === "string" && training.output.startsWith("http")) {
              loraWeightsUrl = training.output
            }
          }

          console.log("[v0] Training completed - LoRA weights URL:", loraWeightsUrl)
          console.log("[v0] Replicate model ID:", training.output?.model)
          console.log("[v0] Replicate version ID:", training.output?.version)

          await sql`
            UPDATE user_models
            SET 
              training_status = 'completed',
              training_progress = 100,
              replicate_model_id = ${training.output?.model || model.replicate_model_id},
              replicate_version_id = ${training.output?.version || null},
              lora_weights_url = ${loraWeightsUrl},
              lora_scale = COALESCE(lora_scale, 1.0),
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
          })
        } else {
          await sql`
            UPDATE user_models
            SET 
              training_progress = ${progress},
              updated_at = NOW()
            WHERE id = ${modelId}
          `

          return NextResponse.json({
            status: "training",
            progress: progress,
            model: {
              ...model,
              training_progress: progress,
            },
          })
        }
      } catch (replicateError) {
        console.error("[v0] Error checking Replicate status:", replicateError)
        // Return current database status if Replicate check fails
        return NextResponse.json({
          status: model.training_status,
          progress: model.training_progress || 0,
          model: model,
        })
      }
    }

    return NextResponse.json({
      status: model.training_status,
      progress: model.training_progress || 0,
      model: model,
    })
  } catch (error) {
    console.error("[v0] Error checking training progress:", error)
    return NextResponse.json({ error: "Failed to check training progress" }, { status: 500 })
  }
}
