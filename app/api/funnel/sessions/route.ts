import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Fetch session overview
    const sessions = await sql`
      SELECT 
        session_id,
        user_id,
        email,
        first_seen_at,
        last_seen_at,
        page_count,
        scroll_depth,
        blueprint_completed,
        purchased
      FROM funnel_sessions
      ORDER BY last_seen_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get aggregated stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN blueprint_completed THEN 1 ELSE 0 END) as completed_blueprints,
        SUM(CASE WHEN purchased THEN 1 ELSE 0 END) as purchases,
        AVG(page_count) as avg_pages_per_session,
        AVG(scroll_depth) as avg_scroll_depth
      FROM funnel_sessions
    `

    return NextResponse.json({
      sessions,
      stats: stats[0],
      pagination: { limit, offset },
    })
  } catch (error) {
    console.error("[API] Funnel sessions error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
