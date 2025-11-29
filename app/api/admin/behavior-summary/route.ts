import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/behavior-summary
 * Returns behavior loop overview and subscriber list
 */
export async function GET() {
  try {
    const [avgScore] = await sql`
      SELECT AVG(behavior_loop_score)::INTEGER as avg_score
      FROM blueprint_subscribers
      WHERE behavior_loop_score IS NOT NULL
    `

    const distribution = await sql`
      SELECT 
        behavior_loop_stage,
        COUNT(*) as count
      FROM blueprint_subscribers
      WHERE behavior_loop_stage IS NOT NULL
      GROUP BY behavior_loop_stage
    `

    const [last7Days] = await sql`
      SELECT COUNT(*) as count
      FROM behavior_loop_log
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `

    // Fetch top subscribers
    const subscribers = await sql`
      SELECT 
        id,
        email,
        name,
        behavior_loop_score,
        behavior_loop_stage,
        last_behavior_loop_at,
        last_apa_action_at
      FROM blueprint_subscribers
      WHERE behavior_loop_score IS NOT NULL
      ORDER BY behavior_loop_score DESC
      LIMIT 100
    `

    return NextResponse.json({
      overview: {
        avgScore: avgScore?.avg_score || 0,
        distribution: {
          cold: distribution.find((d: any) => d.behavior_loop_stage === "cold")?.count || 0,
          warm: distribution.find((d: any) => d.behavior_loop_stage === "warm")?.count || 0,
          hot: distribution.find((d: any) => d.behavior_loop_stage === "hot")?.count || 0,
          ready: distribution.find((d: any) => d.behavior_loop_stage === "ready")?.count || 0,
        },
        last7Days: last7Days?.count || 0,
      },
      subscribers,
    })
  } catch (error) {
    console.error("[API] Error fetching behavior summary:", error)
    return NextResponse.json({ error: "Failed to fetch behavior summary" }, { status: 500 })
  }
}
