import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    // Find user
    const users = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = users[0]

    // Get stuck training
    const models = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${targetUser.id}
      AND training_status IN ('training', 'processing')
    `

    if (models.length === 0) {
      return NextResponse.json({ error: "No active training found" }, { status: 404 })
    }

    const model = models[0]

    // Cancel on Replicate if training ID exists
    if (model.training_id) {
      try {
        await fetch(`https://api.replicate.com/v1/trainings/${model.training_id}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        })
      } catch (error) {
        console.error("[v0] Failed to cancel Replicate training:", error)
      }
    }

    // Reset the model
    await sql`
      UPDATE user_models
      SET 
        training_status = 'failed',
        failure_reason = 'Training reset by admin - no images uploaded. Please upload images and try again.',
        training_id = NULL,
        replicate_model_id = NULL,
        training_progress = 0,
        updated_at = NOW()
      WHERE id = ${model.id}
    `

    return NextResponse.json({
      success: true,
      message: `Training reset for ${targetUser.email}. User can now upload images and start a new training.`,
      modelId: model.id,
      resetDetails: {
        previousTrainingId: model.training_id,
        previousStatus: model.training_status,
        previousProgress: model.training_progress,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error resetting training:", error)
    return NextResponse.json({ error: error.message || "Failed to reset training" }, { status: 500 })
  }
}
