import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/email-control/stats
 * Get email stats for the last 24h
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

    // Get email stats from email_logs
    const emailStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'skipped_disabled') as skipped_disabled_count,
        COUNT(*) FILTER (WHERE status = 'skipped_test_mode') as skipped_test_mode_count,
        COUNT(*) as total_count
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '24 hours'
    `

    // Get scheduled campaigns
    const scheduledCampaigns = await sql`
      SELECT id, campaign_name, campaign_type, subject_line, scheduled_for, status
      FROM admin_email_campaigns
      WHERE status = 'scheduled'
        AND scheduled_for IS NOT NULL
        AND scheduled_for > NOW()
      ORDER BY scheduled_for ASC
      LIMIT 10
    `

    // Get cron run stats for email-related jobs
    const cronStats = await sql`
      SELECT 
        job_name,
        COUNT(*) FILTER (WHERE status = 'ok') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        MAX(started_at) as last_run
      FROM admin_cron_runs
      WHERE job_name IN ('send-scheduled-campaigns', 'welcome-sequence', 'send-blueprint-followups')
        AND started_at >= NOW() - INTERVAL '24 hours'
      GROUP BY job_name
    `

    return NextResponse.json({
      success: true,
      emailStats: {
        sent: Number(emailStats[0]?.sent_count || 0),
        failed: Number(emailStats[0]?.failed_count || 0),
        skippedDisabled: Number(emailStats[0]?.skipped_disabled_count || 0),
        skippedTestMode: Number(emailStats[0]?.skipped_test_mode_count || 0),
        total: Number(emailStats[0]?.total_count || 0),
      },
      scheduledCampaigns: scheduledCampaigns || [],
      cronStats: cronStats || [],
    })
  } catch (error: any) {
    console.error("[EMAIL-CONTROL] Error fetching stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch email stats",
      },
      { status: 500 },
    )
  }
}


