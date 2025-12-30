import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { runScheduledCampaigns } from "@/lib/email/run-scheduled-campaigns"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

/**
 * API Route: Run Scheduled Email Campaigns
 * 
 * Executes scheduled campaigns from admin_email_campaigns table.
 * 
 * Query Parameters:
 * - mode: 'live' | 'test' (default: 'test')
 * - campaignId: Optional specific campaign ID to run
 * 
 * TEST Mode:
 * - Sends only to admin email (process.env.ADMIN_EMAIL or "ssa@ssasocial.com")
 * - Does not update campaign status
 * - Logs test sends to email_logs
 * 
 * LIVE Mode:
 * - Processes all due campaigns (status='scheduled' AND scheduled_for <= NOW())
 * - Resolves recipients from target_audience
 * - Updates campaign status to 'sent' or 'failed'
 * - Logs all sends to email_logs
 */
export async function POST(request: Request) {
  try {
    // Admin authentication check (reusing pattern from other admin/email routes)
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Parse request body or query params
    const body = await request.json().catch(() => ({}))
    const { mode = "test", campaignId } = body

    if (mode !== "live" && mode !== "test") {
      return NextResponse.json({ error: "mode must be 'live' or 'test'" }, { status: 400 })
    }

    if (campaignId && typeof campaignId !== "number") {
      return NextResponse.json({ error: "campaignId must be a number" }, { status: 400 })
    }

    console.log(`[v0] Admin requested to run scheduled campaigns: mode=${mode}, campaignId=${campaignId || "all"}`)

    // Run scheduled campaigns
    const results = await runScheduledCampaigns({
      mode: mode as "live" | "test",
      campaignId: campaignId ? Number(campaignId) : undefined,
    })

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled campaigns found to process",
        mode,
        results: [],
      })
    }

    // Format response
    const summary = {
      totalCampaigns: results.length,
      totalSent: results.reduce((sum, r) => sum + r.recipients.sent, 0),
      totalFailed: results.reduce((sum, r) => sum + r.recipients.failed, 0),
      totalRecipients: results.reduce((sum, r) => sum + r.recipients.total, 0),
    }

    if (mode === "test") {
      return NextResponse.json({
        success: true,
        message: `Test mode: Processed ${results.length} campaign(s)`,
        mode: "test",
        testEmail: process.env.ADMIN_EMAIL || "ssa@ssasocial.com",
        results: results.map((r) => ({
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          campaignType: r.campaignType,
          templateUsed: r.templateUsed,
          testEmail: r.recipients.testEmail,
          status: r.recipients.sent > 0 ? "sent" : "failed",
          errors: r.errors,
        })),
        summary,
      })
    } else {
      return NextResponse.json({
        success: true,
        message: `Live mode: Processed ${results.length} campaign(s)`,
        mode: "live",
        results: results.map((r) => ({
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          campaignType: r.campaignType,
          templateUsed: r.templateUsed,
          recipients: {
            total: r.recipients.total,
            sent: r.recipients.sent,
            failed: r.recipients.failed,
          },
          errors: r.errors.slice(0, 10), // Limit errors in response
        })),
        summary,
      })
    }
  } catch (error: any) {
    console.error("[v0] Error running scheduled campaigns:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run scheduled campaigns",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint for checking scheduled campaigns status
 */
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)

    // Get scheduled campaigns
    const scheduledCampaigns = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        subject_line,
        scheduled_for,
        status,
        total_recipients,
        created_at
      FROM admin_email_campaigns
      WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      ORDER BY scheduled_for ASC
    `

    // Get due campaigns (scheduled_for <= NOW())
    const dueCampaigns = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        subject_line,
        scheduled_for,
        status
      FROM admin_email_campaigns
      WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
    `

    return NextResponse.json({
      success: true,
      scheduled: scheduledCampaigns || [],
      due: dueCampaigns || [],
      counts: {
        totalScheduled: scheduledCampaigns?.length || 0,
        dueNow: dueCampaigns?.length || 0,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching scheduled campaigns:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scheduled campaigns",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

