import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { modelId } = await request.json()

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

    // Get the model and verify ownership
    const models = await sql`
      SELECT 
        id, 
        user_id, 
        training_id,
        training_status
      FROM user_models
      WHERE id = ${modelId} AND user_id = ${neonUser.id}
    `

    if (models.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = models[0]

    if (!model.training_id) {
      return NextResponse.json({ error: "No active training to cancel" }, { status: 400 })
    }

    if (model.training_status !== "training" && model.training_status !== "processing") {
      return NextResponse.json({ error: "Training is not in progress", status: model.training_status }, { status: 400 })
    }

    console.log("[v0] Canceling training:", { modelId, trainingId: model.training_id })

    try {
      // Cancel the training on Replicate
      const replicate = getReplicateClient()
      await replicate.trainings.cancel(model.training_id)

      console.log("[v0] Training canceled on Replicate")

      // Update database to mark as canceled/failed
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = 'Canceled by user',
          updated_at = NOW()
        WHERE id = ${modelId}
      `

      console.log("[v0] Database updated with canceled status")

      return NextResponse.json({
        success: true,
        message: "Training canceled successfully",
      })
    } catch (replicateError: any) {
      console.error("[v0] Error canceling training on Replicate:", replicateError)

      // Even if Replicate fails, update our database
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = 'Canceled by user (Replicate error)',
          updated_at = NOW()
        WHERE id = ${modelId}
      `

      return NextResponse.json({
        success: true,
        message: "Training marked as canceled in database",
        warning: "Could not confirm cancellation with Replicate",
      })
    }
  } catch (error) {
    console.error("[v0] Error canceling training:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel training",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
