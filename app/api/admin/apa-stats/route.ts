import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Part 8 - Admin Dashboard APA Stats
 * Returns APA activity summary for dashboard card
 */
export async function GET(request: NextRequest) {
  try {
    // Total decisions this week
    const decisions = await sql`
      SELECT COUNT(*) as count
      FROM apa_activity_log
      WHERE created_at > NOW() - INTERVAL '7 days'
    `

    // Total offers sent
    const offers = await sql`
      SELECT COUNT(*) as count
      FROM apa_activity_log
      WHERE action = 'EMAIL_SENT'
        AND created_at > NOW() - INTERVAL '7 days'
    `

    // Offer type distribution
    const distribution = await sql`
      SELECT 
        offer_type,
        COUNT(*) as count
      FROM apa_activity_log
      WHERE action = 'EMAIL_SENT'
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY offer_type
    `

    // Click-through prediction (placeholder - will track actual clicks later)
    const ctr = 0.25 // 25% estimated

    return NextResponse.json({
      totalDecisions: Number(decisions[0]?.count || 0),
      totalOffers: Number(offers[0]?.count || 0),
      distribution: distribution.map((d) => ({
        offer_type: d.offer_type,
        count: Number(d.count),
      })),
      estimatedCTR: ctr,
    })
  } catch (error) {
    console.error("[API] Error fetching APA stats:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
