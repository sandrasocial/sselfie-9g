import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Total leads
    const totalLeadsResult = await sql`
      SELECT COUNT(*) as count FROM blueprint_subscribers
    `
    const totalLeads = Number(totalLeadsResult[0].count)

    // Avg completion time (rough estimate from blueprint_completed and created_at)
    const avgCompletionResult = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (blueprint_completed_at - created_at))/60) as avg_minutes
      FROM blueprint_subscribers
      WHERE blueprint_completed = true AND blueprint_completed_at IS NOT NULL
    `
    const avgCompletionTime = avgCompletionResult[0].avg_minutes
      ? Math.round(Number(avgCompletionResult[0].avg_minutes))
      : 0

    // Drop-off rate per step (using engagement tracking)
    const totalStarted = totalLeads
    const completedResult = await sql`
      SELECT COUNT(*) as count FROM blueprint_subscribers WHERE blueprint_completed = true
    `
    const totalCompleted = Number(completedResult[0].count)
    const dropOffRate = totalStarted > 0 ? Math.round(((totalStarted - totalCompleted) / totalStarted) * 100) : 0

    // Top blueprint category from lead_intelligence
    const topCategoryResult = await sql`
      SELECT lead_intelligence->>'buying_stage' as category, COUNT(*) as count
      FROM blueprint_subscribers
      WHERE lead_intelligence IS NOT NULL
      GROUP BY lead_intelligence->>'buying_stage'
      ORDER BY count DESC
      LIMIT 1
    `
    const topCategory = topCategoryResult[0]?.category || "Not classified yet"

    return NextResponse.json({
      totalLeads,
      avgCompletionTime,
      dropOffRate,
      topCategory,
    })
  } catch (error) {
    console.error("Error fetching blueprint stats:", error)
    return NextResponse.json({ error: "Failed to fetch blueprint stats" }, { status: 500 })
  }
}
