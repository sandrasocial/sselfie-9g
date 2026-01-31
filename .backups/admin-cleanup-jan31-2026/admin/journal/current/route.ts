import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Calculate week start and end dates (Monday to Sunday)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(today)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartDate = weekStart.toISOString().split('T')[0]

    // Query for current week's journal entry
    const result = await sql`
      SELECT 
        id,
        features_built,
        personal_story,
        struggles,
        wins,
        fun_activities,
        weekly_goals,
        future_self_vision,
        published,
        week_start_date,
        week_end_date,
        created_at,
        updated_at
      FROM weekly_journal
      WHERE user_id = ${String(user.id)}
        AND week_start_date = ${weekStartDate}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        journal: null
      })
    }

    return NextResponse.json({
      success: true,
      journal: result[0]
    })
  } catch (error: any) {
    console.error('[Journal Current] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

