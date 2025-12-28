import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(req: Request) {
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

    const body = await req.json()
    const { 
      features_built,
      personal_story,
      struggles,
      wins,
      fun_activities,
      weekly_goals,
      future_self_vision,
      published = false
    } = body

    // Calculate week start and end dates (Monday to Sunday)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(today)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    // Check if entry exists for this week
    const existing = await sql`
      SELECT id FROM weekly_journal
      WHERE user_id = ${String(user.id)}
        AND week_start_date = ${weekStart.toISOString().split('T')[0]}
    `

    if (existing.length > 0) {
      // Update existing entry
      await sql`
        UPDATE weekly_journal
        SET
          features_built = ${features_built || null},
          personal_story = ${personal_story || null},
          struggles = ${struggles || null},
          wins = ${wins || null},
          fun_activities = ${fun_activities || null},
          weekly_goals = ${weekly_goals || null},
          future_self_vision = ${future_self_vision || null},
          published = ${published},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `

      return NextResponse.json({ 
        success: true, 
        id: existing[0].id,
        message: 'Journal entry updated'
      })
    } else {
      // Create new entry
      const result = await sql`
        INSERT INTO weekly_journal (
          user_id,
          week_start_date,
          week_end_date,
          features_built,
          personal_story,
          struggles,
          wins,
          fun_activities,
          weekly_goals,
          future_self_vision,
          published
        ) VALUES (
          ${String(user.id)},
          ${weekStart.toISOString().split('T')[0]},
          ${weekEnd.toISOString().split('T')[0]},
          ${features_built || null},
          ${personal_story || null},
          ${struggles || null},
          ${wins || null},
          ${fun_activities || null},
          ${weekly_goals || null},
          ${future_self_vision || null},
          ${published}
        )
        RETURNING id
      `

      return NextResponse.json({ 
        success: true, 
        id: result[0].id,
        message: 'Journal entry saved'
      })
    }
  } catch (error: any) {
    console.error('[Journal] Error saving:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

