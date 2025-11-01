import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId")
    const contentType = searchParams.get("contentType") || "all"

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Get content performance history
    const performanceHistory = await sql`
      SELECT * FROM content_performance_history
      WHERE user_id = ${targetUserId}
        AND (${contentType} = 'all' OR content_type = ${contentType})
      ORDER BY success_score DESC, analyzed_at DESC
      LIMIT 50
    `

    // Get top performing content
    const topPerforming = await sql`
      SELECT 
        content_type,
        content_title,
        success_score,
        engagement_rate,
        what_worked,
        analyzed_at
      FROM content_performance_history
      WHERE user_id = ${targetUserId}
        AND success_score > 70
      ORDER BY success_score DESC
      LIMIT 10
    `

    // Get user milestones
    const milestones = await sql`
      SELECT * FROM user_milestones
      WHERE user_id = ${targetUserId}
      ORDER BY achieved_at DESC
      LIMIT 20
    `

    // Get brand evolution history
    const brandEvolution = await sql`
      SELECT * FROM brand_evolution
      WHERE user_id = ${targetUserId}
      ORDER BY changed_at DESC
      LIMIT 10
    `

    // Calculate performance trends
    const trends = await sql`
      SELECT 
        content_type,
        DATE_TRUNC('week', analyzed_at) as week,
        AVG(success_score) as avg_score,
        AVG(engagement_rate) as avg_engagement,
        COUNT(*) as content_count
      FROM content_performance_history
      WHERE user_id = ${targetUserId}
        AND analyzed_at >= NOW() - INTERVAL '3 months'
      GROUP BY content_type, DATE_TRUNC('week', analyzed_at)
      ORDER BY week DESC
    `

    return NextResponse.json({
      performanceHistory: performanceHistory || [],
      topPerforming: topPerforming || [],
      milestones: milestones || [],
      brandEvolution: brandEvolution || [],
      trends: trends || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching performance data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { type, userId, data } = body

    if (type === "content_performance") {
      const result = await sql`
        INSERT INTO content_performance_history (
          user_id, content_type, content_id, content_title, content_description,
          performance_metrics, engagement_rate, success_score, what_worked, 
          what_didnt_work, lessons_learned, analyzed_at
        ) VALUES (
          ${userId}, ${data.content_type}, ${data.content_id || null}, ${data.content_title},
          ${data.content_description || null}, ${JSON.stringify(data.performance_metrics)},
          ${data.engagement_rate || null}, ${data.success_score || 0}, ${data.what_worked || null},
          ${data.what_didnt_work || null}, ${data.lessons_learned || null}, NOW()
        )
        RETURNING *
      `
      return NextResponse.json(result[0])
    } else if (type === "milestone") {
      const result = await sql`
        INSERT INTO user_milestones (
          user_id, milestone_type, milestone_title, milestone_description,
          achieved_value, target_value, celebration_note, achieved_at
        ) VALUES (
          ${userId}, ${data.milestone_type}, ${data.milestone_title}, ${data.milestone_description || null},
          ${data.achieved_value || null}, ${data.target_value || null}, ${data.celebration_note || null}, NOW()
        )
        RETURNING *
      `
      return NextResponse.json(result[0])
    } else if (type === "brand_evolution") {
      const result = await sql`
        INSERT INTO brand_evolution (
          user_id, evolution_type, previous_state, new_state,
          reason_for_change, impact_observed, changed_at
        ) VALUES (
          ${userId}, ${data.evolution_type}, ${JSON.stringify(data.previous_state || {})},
          ${JSON.stringify(data.new_state || {})}, ${data.reason_for_change || null},
          ${data.impact_observed || null}, NOW()
        )
        RETURNING *
      `
      return NextResponse.json(result[0])
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error creating performance record:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
