import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/ai/daily-drops
 * Get today's daily drop
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    const today = new Date().toISOString().split("T")[0]

    const drops = await sql`
      SELECT * FROM daily_drops
      WHERE date = ${today}::date
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      drop: drops[0] || null,
    })
  } catch (error) {
    console.error("[DailyDrops] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

