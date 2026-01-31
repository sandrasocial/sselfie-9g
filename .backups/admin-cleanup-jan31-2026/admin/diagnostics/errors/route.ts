import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/diagnostics/errors
 * Returns recent admin errors grouped by tool_name
 * Query params:
 * - since: hours to look back (default: 24)
 * - limit: max errors per tool (default: 10)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const sinceHours = parseInt(searchParams.get("since") || "24", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    // Get errors grouped by tool_name with stats
    const errorsByTool = await sql`
      SELECT 
        tool_name,
        COUNT(*) as count,
        MAX(created_at) as last_seen
      FROM admin_email_errors
      WHERE created_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      GROUP BY tool_name
      ORDER BY count DESC, last_seen DESC
    `

    // Get recent errors for each tool
    const tools = await Promise.all(
      errorsByTool.map(async (row: any) => {
        const recentErrors = await sql`
          SELECT id, error_message, created_at
          FROM admin_email_errors
          WHERE tool_name = ${row.tool_name}
            AND created_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
        
        return {
          toolName: row.tool_name,
          count: Number(row.count),
          lastSeen: row.last_seen,
          recentErrors: recentErrors.map((e: any) => ({
            id: e.id,
            error_message: e.error_message,
            created_at: e.created_at,
          })),
        }
      })
    )

    // Get total error count
    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_email_errors
      WHERE created_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
    `
    const total = Number(totalResult[0]?.total || 0)

    return NextResponse.json({
      success: true,
      sinceHours,
      total,
      tools,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-ERRORS] Error fetching errors:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch errors",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

