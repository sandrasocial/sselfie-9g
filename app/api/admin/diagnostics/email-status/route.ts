import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/diagnostics/email-status
 * Returns email statistics grouped by email type for the last N hours
 * Query params:
 * - since: hours to look back (default: 24)
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

    // Get email statistics grouped by email_type (includes Resend webhook data: opens, clicks, bounces)
    const emailStats = await sql`
      SELECT 
        email_type,
        COUNT(*) FILTER (WHERE status = 'sent' OR status = 'delivered') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count,
        COUNT(*) FILTER (WHERE status = 'complained') as complained_count,
        COUNT(*) FILTER (WHERE status = 'skipped_disabled') as skipped_disabled_count,
        COUNT(*) FILTER (WHERE status = 'skipped_test_mode') as skipped_test_mode_count,
        COUNT(*) FILTER (WHERE opened = true) as opened_count,
        COUNT(*) FILTER (WHERE clicked = true) as clicked_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        MAX(sent_at) as last_sent_at,
        MIN(sent_at) as first_sent_at
      FROM email_logs
      WHERE sent_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      GROUP BY email_type
      ORDER BY last_sent_at DESC NULLS LAST, email_type ASC
    `

    // Get recent email sends (last 50) with Resend webhook engagement data
    const recentSends = await sql`
      SELECT 
        id,
        user_email,
        email_type,
        status,
        sent_at,
        resend_message_id,
        error_message,
        opened,
        opened_at,
        clicked,
        clicked_at
      FROM email_logs
      WHERE sent_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      ORDER BY sent_at DESC
      LIMIT 50
    `

    // Format the stats (includes Resend webhook engagement data)
    const formattedStats = emailStats.map((stat: any) => {
      const sent = parseInt(stat.sent_count || 0)
      const opened = parseInt(stat.opened_count || 0)
      const clicked = parseInt(stat.clicked_count || 0)
      const delivered = parseInt(stat.delivered_count || 0)
      
      return {
        emailType: stat.email_type || "unknown",
        sent,
        delivered,
        opened,
        clicked,
        failed: parseInt(stat.failed_count || 0),
        bounced: parseInt(stat.bounced_count || 0),
        complained: parseInt(stat.complained_count || 0),
        skippedDisabled: parseInt(stat.skipped_disabled_count || 0),
        skippedTestMode: parseInt(stat.skipped_test_mode_count || 0),
        total: sent + parseInt(stat.failed_count || 0) + parseInt(stat.skipped_disabled_count || 0) + parseInt(stat.skipped_test_mode_count || 0),
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0",
        clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0",
        lastSentAt: stat.last_sent_at,
        firstSentAt: stat.first_sent_at,
      }
    })

    // Format recent sends (includes Resend webhook engagement data)
    const formattedRecentSends = recentSends.map((send: any) => ({
      id: send.id,
      userEmail: send.user_email,
      emailType: send.email_type || "unknown",
      status: send.status,
      sentAt: send.sent_at,
      resendMessageId: send.resend_message_id,
      errorMessage: send.error_message,
      opened: send.opened || false,
      openedAt: send.opened_at,
      clicked: send.clicked || false,
      clickedAt: send.clicked_at,
    }))

    // Calculate totals (includes Resend webhook engagement data)
    const totals = formattedStats.reduce(
      (acc, stat) => ({
        sent: acc.sent + stat.sent,
        delivered: acc.delivered + stat.delivered,
        opened: acc.opened + stat.opened,
        clicked: acc.clicked + stat.clicked,
        failed: acc.failed + stat.failed,
        bounced: acc.bounced + stat.bounced,
        complained: acc.complained + stat.complained,
        skippedDisabled: acc.skippedDisabled + stat.skippedDisabled,
        skippedTestMode: acc.skippedTestMode + stat.skippedTestMode,
        total: acc.total + stat.total,
      }),
      { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, bounced: 0, complained: 0, skippedDisabled: 0, skippedTestMode: 0, total: 0 }
    )
    
    // Calculate overall rates
    const overallOpenRate = totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : "0.0"
    const overallClickRate = totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(1) : "0.0"

    return NextResponse.json({
      success: true,
      sinceHours,
      totals: {
        ...totals,
        overallOpenRate,
        overallClickRate,
      },
      emailTypes: formattedStats,
      recentSends: formattedRecentSends,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-EMAIL-STATUS] Error fetching email status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch email status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

