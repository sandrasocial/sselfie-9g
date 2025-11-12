import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const supabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const users = await sql`
      SELECT role FROM users WHERE supabase_user_id = ${user.id}
    `

    if (users.length === 0 || users[0].role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
    }

    // Find user by email
    const targetUsers = await sql`
      SELECT id, email, supabase_user_id, created_at
      FROM users
      WHERE email = ${email}
    `

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetUser = targetUsers[0]

    // Get training models
    const models = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${targetUser.id}
      ORDER BY created_at DESC
    `

    // Get training images
    const images = await sql`
      SELECT id, filename, processing_status, created_at
      FROM selfie_uploads
      WHERE user_id = ${targetUser.id}
      ORDER BY created_at DESC
    `

    // Calculate statistics
    const trainingModels = models.filter((m) => m.training_status === "training")
    const completedModels = models.filter((m) => m.training_status === "completed")
    const failedModels = models.filter((m) => m.training_status === "failed")

    // Check for stuck training
    const stuckModels = trainingModels.filter((model) => {
      if (model.started_at) {
        const elapsed = Math.round((Date.now() - new Date(model.started_at).getTime()) / 1000 / 60)
        return elapsed > 60 && model.training_progress < 50
      }
      return false
    })

    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
      },
      models: models.map((m) => ({
        id: m.id,
        name: m.model_name,
        status: m.training_status,
        progress: m.training_progress,
        training_id: m.training_id,
        trigger_word: m.trigger_word,
        lora_weights_url: m.lora_weights_url,
        started_at: m.started_at,
        completed_at: m.completed_at,
        failure_reason: m.failure_reason,
        elapsed_minutes: m.started_at ? Math.round((Date.now() - new Date(m.started_at).getTime()) / 1000 / 60) : null,
      })),
      images: {
        total: images.length,
        list: images.map((i) => ({
          id: i.id,
          filename: i.filename,
          status: i.processing_status,
          created_at: i.created_at,
        })),
      },
      statistics: {
        training: trainingModels.length,
        completed: completedModels.length,
        failed: failedModels.length,
        stuck: stuckModels.length,
      },
      alerts: stuckModels.map((m) => ({
        model_id: m.id,
        message: `Model ${m.id} has been training for ${Math.round((Date.now() - new Date(m.started_at).getTime()) / 1000 / 60)} minutes at ${m.training_progress}% progress`,
        severity: "warning",
      })),
    })
  } catch (error) {
    console.error("[v0] Error checking user training:", error)
    return NextResponse.json(
      {
        error: "Failed to check training status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
