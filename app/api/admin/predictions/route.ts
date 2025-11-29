import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/predictions
 * Returns prediction analytics for admin dashboard
 * Groups subscribers by conversion window (now, soon, later)
 */
export async function GET() {
  try {
    const predictions = await sql`
      SELECT 
        predicted_conversion_window,
        COUNT(*) as count,
        AVG(predicted_conversion_score) as avg_score,
        AVG(prediction_confidence) as avg_confidence
      FROM blueprint_subscribers
      WHERE predicted_conversion_window IS NOT NULL
        AND last_prediction_at > NOW() - INTERVAL '24 hours'
      GROUP BY predicted_conversion_window
      ORDER BY 
        CASE predicted_conversion_window
          WHEN 'now' THEN 1
          WHEN 'soon' THEN 2
          WHEN 'later' THEN 3
        END
    `

    const data = {
      high: predictions.find((p: any) => p.predicted_conversion_window === "now")?.count || 0,
      medium: predictions.find((p: any) => p.predicted_conversion_window === "soon")?.count || 0,
      low: predictions.find((p: any) => p.predicted_conversion_window === "later")?.count || 0,
      total: predictions.reduce((sum: number, p: any) => sum + Number(p.count), 0),
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Error fetching prediction analytics:", error)
    return NextResponse.json(
      {
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      },
      { status: 500 },
    )
  }
}
