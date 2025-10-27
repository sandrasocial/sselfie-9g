import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("[v0] Profile stats API called")

    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Profile stats: Not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Profile stats: Auth user ID:", authUser.id)

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Profile stats: Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Profile stats: Neon user ID:", neonUser.id)

    const sql = neon(process.env.DATABASE_URL!)

    // Get total generations
    const totalGenerations = await sql`
      SELECT COUNT(*) as count FROM generated_images WHERE user_id = ${neonUser.id}
    `

    // Get monthly generations (current month)
    const monthlyGenerations = await sql`
      SELECT COUNT(*) as count 
      FROM generated_images 
      WHERE user_id = ${neonUser.id}
      AND created_at >= date_trunc('month', CURRENT_DATE)
    `

    // Get favorites count
    const favorites = await sql`
      SELECT COUNT(*) as count 
      FROM generated_images 
      WHERE user_id = ${neonUser.id} AND saved = true
    `

    // Get training model info
    const trainingModel = await sql`
      SELECT 
        trigger_word,
        training_status,
        model_type,
        created_at,
        completed_at
      FROM user_models 
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Profile stats: Returning data")

    const response = {
      totalGenerations: Number.parseInt(totalGenerations[0].count),
      monthlyGenerations: Number.parseInt(monthlyGenerations[0].count),
      favorites: Number.parseInt(favorites[0].count),
      trainingModel: trainingModel[0] || null,
    }

    console.log("[v0] Profile stats response:", response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching profile stats:", error)
    return NextResponse.json({ error: "Failed to fetch profile stats" }, { status: 500 })
  }
}
