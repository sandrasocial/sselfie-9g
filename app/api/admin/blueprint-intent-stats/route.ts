import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Signals captured in last 7 days
    const signalsResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_signals
      WHERE created_at > NOW() - INTERVAL '7 days'
    `
    const signalsCaptured = Number.parseInt(signalsResult[0].count) || 0

    // Readiness distribution
    const readinessResult = await sql`
      SELECT 
        readiness_label,
        COUNT(*) as count
      FROM blueprint_subscribers
      WHERE readiness_label IS NOT NULL
      GROUP BY readiness_label
    `

    const total = readinessResult.reduce((sum: number, row: any) => sum + Number.parseInt(row.count), 0)
    const hot = readinessResult.find((r: any) => r.readiness_label === "hot")
    const warm = readinessResult.find((r: any) => r.readiness_label === "warm")
    const cold = readinessResult.find((r: any) => r.readiness_label === "cold")

    const hotPercent = total > 0 ? Math.round(((hot?.count || 0) / total) * 100) : 0
    const warmPercent = total > 0 ? Math.round(((warm?.count || 0) / total) * 100) : 0
    const coldPercent = total > 0 ? Math.round(((cold?.count || 0) / total) * 100) : 0

    // Conversion rate (Blueprint → Purchase)
    const conversionResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE converted_to_user = true) as converted,
        COUNT(*) as total
      FROM blueprint_subscribers
      WHERE created_at > NOW() - INTERVAL '30 days'
    `
    const conversionRate =
      conversionResult[0].total > 0 ? Math.round((conversionResult[0].converted / conversionResult[0].total) * 100) : 0

    // Top signal types
    const topSignalsResult = await sql`
      SELECT 
        signal_type as type,
        COUNT(*) as count
      FROM blueprint_signals
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY signal_type
      ORDER BY count DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      stats: {
        signalsCaptured,
        hotPercent,
        warmPercent,
        coldPercent,
        conversionRate,
        topSignalTypes: topSignalsResult,
      },
    })
  } catch (error) {
    console.error("[BlueprintIntentStats] Error fetching stats:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 })
  }
}
