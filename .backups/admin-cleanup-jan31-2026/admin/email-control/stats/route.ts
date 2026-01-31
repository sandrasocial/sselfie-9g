import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAudienceContactCountStatus } from "@/lib/resend/get-audience-contacts"
import { getRecentBroadcasts } from "@/lib/resend/query-broadcasts"
import { getSegmentSizes } from "@/lib/resend/query-segments"
import { checkWebhookHealth } from "@/lib/resend/webhook-health"
import { getActiveSequenceStatus } from "@/lib/email/get-active-sequences"
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
        COUNT(*) FILTER (WHERE status = 'skipped_dry_run') as skipped_dry_run_count,
        COUNT(*) as total_count
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '24 hours'
    `

    // Resend source-of-truth data
    const [segmentSizes, broadcasts] = await Promise.all([
      getSegmentSizes(),
      getRecentBroadcasts(10),
    ])

    const segmentNameById = new Map(segmentSizes.map((segment) => [segment.id, segment.name]))
    const broadcastsWithSegments = broadcasts.map((broadcast) => ({
      ...broadcast,
      segmentName: broadcast.segment_id ? segmentNameById.get(broadcast.segment_id) || null : null,
      dashboardUrl: `https://resend.com/broadcasts/${broadcast.id}`,
    }))

    let audienceCount: number | null = null
    let audienceStatus: "connected" | "missing" | "error" = "missing"
    let audienceError: string | null = null

    const resendApiKeyConfigured = Boolean(process.env.RESEND_API_KEY)
    const resendAudienceConfigured = Boolean(process.env.RESEND_AUDIENCE_ID)

    if (!resendApiKeyConfigured) {
      audienceStatus = "error"
      audienceError = "Resend API key is missing in server settings."
    } else if (!resendAudienceConfigured) {
      audienceStatus = "missing"
      audienceError = "Resend audience ID is not configured."
    } else {
      const audienceResult = await getAudienceContactCountStatus(process.env.RESEND_AUDIENCE_ID)
      if (typeof audienceResult.count === "number") {
        audienceCount = audienceResult.count
        audienceStatus = "connected"
      } else {
        audienceStatus = "error"
        audienceError = audienceResult.error || "Failed to load audience size"
      }
    }

    const activeSequences = await getActiveSequenceStatus(segmentSizes)
    const webhookHealth = await checkWebhookHealth()

    const [recentAnalytics] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE opened = true) as opens,
        COUNT(*) FILTER (WHERE clicked = true) as clicks,
        COUNT(*) as total
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '30 days'
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

    const lastBroadcast = broadcastsWithSegments[0] || null

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
        skippedDryRun: Number(emailStats[0]?.skipped_dry_run_count || 0),
        total: Number(emailStats[0]?.total_count || 0),
      },
      scheduledCampaigns: scheduledCampaigns || [],
      cronStats: cronStats || [],
      dryRunEnabled: process.env.EMAIL_DRY_RUN === "true",
      lastBroadcast,
      broadcasts: broadcastsWithSegments,
      audience: {
        count: audienceCount,
        status: audienceStatus,
        error: audienceError,
      },
      resendConfig: {
        apiKeyConfigured: resendApiKeyConfigured,
        audienceIdConfigured: resendAudienceConfigured,
      },
      segments: segmentSizes,
      activeSequences,
      webhookHealth,
      analytics: {
        opens: Number(recentAnalytics?.opens || 0),
        clicks: Number(recentAnalytics?.clicks || 0),
        total: Number(recentAnalytics?.total || 0),
      },
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


