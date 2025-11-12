import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

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

    // Get the model
    const models = await sql`
      SELECT id, user_id, training_id, training_status
      FROM user_models
      WHERE id = ${modelId} AND user_id = ${neonUser.id}
    `

    if (models.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = models[0]

    // Check if training can be canceled
    if (model.training_status === "completed" || model.training_status === "failed") {
      return NextResponse.json({ error: "Training already finished" }, { status: 400 })
    }

    if (!model.training_id) {
      return NextResponse.json({ error: "No active training found" }, { status: 400 })
    }

    console.log("[v0] Canceling training:", model.training_id)

    // Cancel on Replicate
    try {
      const replicate = getReplicateClient()
      await replicate.trainings.cancel(model.training_id)
      console.log("[v0] Training canceled on Replicate")
    } catch (replicateError) {
      console.error("[v0] Error canceling on Replicate:", replicateError)
      // Continue anyway to update database
    }

    // Update database
    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = 'Canceled by user',
        updated_at = NOW()
      WHERE id = ${modelId}
    `

    console.log("[v0] Training marked as canceled in database")

    return NextResponse.json({ success: true, message: "Training canceled successfully" })
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
