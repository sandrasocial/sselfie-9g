import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const guard = await requireAdmin()
    if (guard instanceof NextResponse) return guard

    const globalMetrics = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'delivered') as total_emails_sent,
        COUNT(DISTINCT subscriber_id) FILTER (WHERE status = 'opened' AND created_at > NOW() - INTERVAL '30 days') as unique_opens_30d,
        COUNT(*) FILTER (WHERE status = 'opened' AND created_at > NOW() - INTERVAL '30 days') as total_opens_30d,
        COUNT(*) FILTER (WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '30 days') as total_sent_30d,
        COUNT(*) FILTER (WHERE status = 'clicked' AND created_at > NOW() - INTERVAL '30 days') as total_clicks_30d,
        COUNT(*) FILTER (WHERE status = 'bounced') as total_bounces,
        COUNT(*) FILTER (WHERE status = 'unsubscribed') as total_unsubscribes,
        COUNT(*) as total_events
      FROM email_events
    `

    const metrics = globalMetrics[0]

    const openRate = metrics.total_sent_30d > 0 ? (metrics.unique_opens_30d / metrics.total_sent_30d) * 100 : 0
    const ctr = metrics.total_sent_30d > 0 ? (metrics.total_clicks_30d / metrics.total_sent_30d) * 100 : 0
    const bounceRate = metrics.total_emails_sent > 0 ? (metrics.total_bounces / metrics.total_emails_sent) * 100 : 0
    const unsubscribeRate =
      metrics.total_emails_sent > 0 ? (metrics.total_unsubscribes / metrics.total_emails_sent) * 100 : 0

    return NextResponse.json({
      totalEmailsSent: metrics.total_emails_sent || 0,
      openRate: Math.round(openRate * 10) / 10,
      ctr: Math.round(ctr * 10) / 10,
      bounceRate: Math.round(bounceRate * 10) / 10,
      unsubscribeRate: Math.round(unsubscribeRate * 10) / 10,
    })
  } catch (error) {
    console.error("Error fetching global analytics:", error)
    return NextResponse.json({ error: "Failed to fetch global analytics" }, { status: 500 })
  }
}
