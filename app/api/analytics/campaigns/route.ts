import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const guard = await requireAdmin()
    if (guard instanceof NextResponse) return guard

    const campaigns = await sql`
      SELECT 
        COALESCE(sequence_id::TEXT, campaign_id::TEXT, email_type) as campaign_identifier,
        email_type,
        COUNT(*) FILTER (WHERE status = 'delivered') as sent,
        COUNT(DISTINCT subscriber_id) FILTER (WHERE status = 'opened') as unique_opens,
        COUNT(*) FILTER (WHERE status = 'clicked') as clicks,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        MAX(created_at) as last_sent
      FROM email_events
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY campaign_identifier, email_type
      ORDER BY last_sent DESC
      LIMIT 20
    `

    const formattedCampaigns = campaigns.map((c: any) => ({
      id: c.campaign_identifier,
      name: c.email_type === "sequence" ? `Sequence ${c.campaign_identifier}` : c.email_type.replace(/_/g, " "),
      sent: c.sent || 0,
      uniqueOpens: c.unique_opens || 0,
      ctr: c.delivered > 0 ? Math.round((c.clicks / c.delivered) * 100 * 10) / 10 : 0,
      status: "completed",
      lastSent: c.last_sent,
    }))

    return NextResponse.json({ campaigns: formattedCampaigns })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}
