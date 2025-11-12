import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createAdminClient } from "@/lib/supabase/admin"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = createAdminClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    console.log(`[v0] Admin canceling duplicate trainings for: ${email}`)

    // Find user
    const [targetUser] = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email}
    `

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all active trainings
    const activeTrainings = await sql`
      SELECT id, training_id, training_status, replicate_model_id
      FROM user_models
      WHERE user_id = ${targetUser.id}
      AND training_status = 'training'
    `

    if (activeTrainings.length === 0) {
      return NextResponse.json({
        message: "No active trainings found",
        canceled: 0,
      })
    }

    const canceledTrainings = []

    for (const training of activeTrainings) {
      // Cancel on Replicate
      try {
        const response = await fetch(`https://api.replicate.com/v1/trainings/${training.training_id}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          },
        })

        console.log(`[v0] Replicate cancel response: ${response.status}`)
      } catch (error) {
        console.error(`[v0] Error canceling on Replicate:`, error)
      }

      // Update database
      await sql`
        UPDATE user_models
        SET 
          training_status = 'failed',
          failure_reason = 'Training canceled by admin. Please restart with proper images.',
          updated_at = NOW()
        WHERE id = ${training.id}
      `

      canceledTrainings.push({
        modelId: training.id,
        trainingId: training.training_id,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Canceled ${canceledTrainings.length} training(s)`,
      canceled: canceledTrainings.length,
      trainings: canceledTrainings,
    })
  } catch (error: any) {
    console.error("[v0] Error canceling trainings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
