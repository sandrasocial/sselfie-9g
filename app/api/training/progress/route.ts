import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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
        progress: model.training_progress,
        model: model,
      })
    }

    // Check Replicate training status
    if (model.training_id) {
      try {
        const replicate = getReplicateClient()
        const training = await replicate.trainings.get(model.training_id)

        console.log("[v0] Replicate training status:", training.status)

        // Update database with latest status
        if (training.status === "succeeded") {
          await sql`
            UPDATE user_models
            SET 
              training_status = 'completed',
              training_progress = 100,
              replicate_model_id = ${training.output?.model || null},
              replicate_version_id = ${training.output?.version || null},
              lora_weights_url = ${training.output?.weights || null},
              lora_scale = COALESCE(lora_scale, 1.0),
              completed_at = NOW(),
              updated_at = NOW()
            WHERE id = ${modelId}
          `

          console.log("[v0] Training completed - saved LoRA weights:", training.output?.weights)
          console.log("[v0] Replicate model ID:", training.output?.model)
          console.log("[v0] Replicate version ID:", training.output?.version)

          return NextResponse.json({
            status: "completed",
            progress: 100,
            model: {
              ...model,
              training_status: "completed",
              training_progress: 100,
              replicate_model_id: training.output?.model,
              replicate_version_id: training.output?.version,
              lora_weights_url: training.output?.weights,
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
            progress: model.training_progress,
            error: training.error,
          })
        } else {
          // Training in progress
          const progress = training.status === "processing" ? 50 : 10

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
            model: model,
          })
        }
      } catch (replicateError) {
        console.error("[v0] Error checking Replicate status:", replicateError)
        // Return current database status if Replicate check fails
        return NextResponse.json({
          status: model.training_status,
          progress: model.training_progress,
          model: model,
        })
      }
    }

    return NextResponse.json({
      status: model.training_status,
      progress: model.training_progress,
      model: model,
    })
  } catch (error) {
    console.error("[v0] Error checking training progress:", error)
    return NextResponse.json({ error: "Failed to check training progress" }, { status: 500 })
  }
}
