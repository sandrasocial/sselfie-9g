import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get users with trained models (suitable for testing)
    // EXCLUDE admin user from test user list
    // Get the latest completed model for each user
    const users = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        u.gender,
        u.ethnicity,
        u.created_at,
        um.training_status,
        um.trigger_word,
        um.replicate_model_id
      FROM users u
      INNER JOIN user_models um ON u.id = um.user_id
      WHERE u.email != ${ADMIN_EMAIL}
      AND um.training_status = 'completed'
      ORDER BY u.created_at DESC
      LIMIT 50
    `

    // Also get users without trained models (for training tests)
    // Include test user even if no images yet, EXCLUDE admin user
    const usersWithoutModels = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.gender,
        u.ethnicity,
        COUNT(DISTINCT su.id) as image_count
      FROM users u
      LEFT JOIN selfie_uploads su ON u.id = su.user_id
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      WHERE um.id IS NULL
      AND u.email != ${ADMIN_EMAIL}
      GROUP BY u.id, u.email, u.display_name, u.gender, u.ethnicity
      HAVING COUNT(DISTINCT su.id) >= 0
      ORDER BY u.created_at DESC
      LIMIT 20
    `

    return NextResponse.json({
      success: true,
      users_with_models: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        gender: u.gender,
        ethnicity: u.ethnicity,
        has_trained_model: true,
        trigger_word: u.trigger_word,
        model_id: u.replicate_model_id,
      })),
      users_without_models: usersWithoutModels.map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        gender: u.gender,
        ethnicity: u.ethnicity,
        has_trained_model: false,
        training_images_count: Number(u.image_count) || 0,
      })),
    })
  } catch (error: any) {
    console.error("[v0] Error getting test users:", error)
    console.error("[v0] Error stack:", error.stack)
    console.error("[v0] Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    })
    return NextResponse.json(
      { 
        error: error.message || "Failed to get test users",
        details: error.detail || error.hint || String(error),
      },
      { status: 500 }
    )
  }
}























