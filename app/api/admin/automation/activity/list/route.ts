import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"

/**
 * GET /api/admin/automation/activity/list
 * Read latest agent activity from multiple Neon database tables
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()

    const salesInsights = await sql`
      SELECT 
        week_start,
        week_end,
        insights_json,
        generated_at,
        created_at
      FROM sales_insights_cache
      ORDER BY created_at DESC
      LIMIT 10
    `

    const subscriptionEvents = await sql`
      SELECT 
        id,
        user_id,
        event_type,
        event_time,
        metadata,
        email_sent,
        email_sent_at,
        created_at
      FROM subscription_events
      ORDER BY created_at DESC
      LIMIT 20
    `

    const feedInsights = await sql`
      SELECT 
        id,
        feed_id,
        user_id,
        insights_json,
        created_at
      FROM feed_performance_insights
      ORDER BY created_at DESC
      LIMIT 10
    `

    const journeyMessages = await sql`
      SELECT 
        id,
        user_id,
        state,
        content_json,
        delivered_via,
        created_at
      FROM user_journey_messages
      ORDER BY created_at DESC
      LIMIT 15
    `

    const recentEmails = await sql`
      SELECT 
        id,
        user_email,
        email_type,
        status,
        sent_at,
        error_message
      FROM email_logs
      ORDER BY sent_at DESC
      LIMIT 20
    `

    return NextResponse.json({
      success: true,
      activity: {
        salesInsights,
        subscriptionEvents,
        feedInsights,
        journeyMessages,
        recentEmails,
      },
      summary: {
        totalSalesInsights: salesInsights.length,
        totalSubscriptionEvents: subscriptionEvents.length,
        totalFeedInsights: feedInsights.length,
        totalJourneyMessages: journeyMessages.length,
        totalRecentEmails: recentEmails.length,
      },
    })
  } catch (error) {
    console.error("[Automation] Error fetching activity:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
