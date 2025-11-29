import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Pending approvals
    const pendingResult = await sql`
      SELECT COUNT(*) as count
      FROM upsell_queue
      WHERE approved IS NULL AND processed = false
    `
    const pendingApprovals = Number(pendingResult[0].count)

    // Approved & completed
    const completedResult = await sql`
      SELECT COUNT(*) as count
      FROM upsell_history
      WHERE event = 'sequence_completed'
    `
    const approvedCompleted = Number(completedResult[0].count)

    // Avg upsell conversion (mock calculation)
    const totalUpsellsResult = await sql`
      SELECT COUNT(*) as count FROM upsell_history WHERE event = 'sequence_started'
    `
    const totalUpsells = Number(totalUpsellsResult[0].count)
    const conversionRate = totalUpsells > 0 ? Math.round((approvedCompleted / totalUpsells) * 100) : 0

    // High-potential leads identified by AI
    const highPotentialResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE lead_intelligence->>'buying_likelihood' = 'high'
      AND upsell_status IS NULL
    `
    const highPotentialLeads = Number(highPotentialResult[0].count)

    return NextResponse.json({
      pendingApprovals,
      approvedCompleted,
      conversionRate,
      highPotentialLeads,
    })
  } catch (error) {
    console.error("Error fetching upsell stats:", error)
    return NextResponse.json({ error: "Failed to fetch upsell stats" }, { status: 500 })
  }
}
