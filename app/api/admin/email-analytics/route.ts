import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Email Analytics API
 * 
 * Returns comprehensive email campaign analytics including:
 * - Campaign performance metrics
 * - Open rates, click rates, conversion rates
 * - Revenue attribution
 * - Engagement trends
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
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

    // Get all campaigns with metrics
    const campaigns = await sql`
      SELECT 
        c.id,
        c.campaign_name,
        c.campaign_type,
        c.subject_line,
        c.status,
        c.created_at,
        c.scheduled_for,
        c.sent_at,
        c.total_recipients,
        c.total_sent,
        c.total_failed,
        COUNT(DISTINCT el.id) as total_emails_sent,
        COUNT(DISTINCT CASE WHEN el.opened = true THEN el.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN el.clicked = true THEN el.id END) as total_clicked,
        COUNT(DISTINCT CASE WHEN el.converted = true THEN el.id END) as total_converted,
        COUNT(DISTINCT CASE WHEN el.opened = true AND el.clicked = true THEN el.id END) as opened_and_clicked
      FROM admin_email_campaigns c
      LEFT JOIN email_logs el ON el.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 50
    `

    // Calculate metrics for each campaign
    const campaignsWithMetrics = campaigns.map((campaign: any) => {
      const sent = Number(campaign.total_emails_sent) || 0
      const opened = Number(campaign.total_opened) || 0
      const clicked = Number(campaign.total_clicked) || 0
      const converted = Number(campaign.total_converted) || 0
      const openedAndClicked = Number(campaign.opened_and_clicked) || 0

      const openRate = sent > 0 ? (opened / sent) * 100 : 0
      const clickRate = sent > 0 ? (clicked / sent) * 100 : 0
      const conversionRate = sent > 0 ? (converted / sent) * 100 : 0
      const clickToOpenRate = opened > 0 ? (clicked / opened) * 100 : 0
      const clickToConversionRate = clicked > 0 ? (converted / clicked) * 100 : 0

      return {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        campaignType: campaign.campaign_type,
        subjectLine: campaign.subject_line,
        status: campaign.status,
        createdAt: campaign.created_at,
        scheduledFor: campaign.scheduled_for,
        sentAt: campaign.sent_at,
        metrics: {
          totalRecipients: Number(campaign.total_recipients) || 0,
          totalSent: Number(campaign.total_sent) || sent,
          totalFailed: Number(campaign.total_failed) || 0,
          totalOpened: opened,
          totalClicked: clicked,
          totalConverted: converted,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          clickToOpenRate: Math.round(clickToOpenRate * 100) / 100,
          clickToConversionRate: Math.round(clickToConversionRate * 100) / 100,
        },
      }
    })

    // Get overall email statistics
    const overallStats = await sql`
      SELECT 
        COUNT(*) as total_emails_sent,
        COUNT(CASE WHEN opened = true THEN 1 END) as total_opened,
        COUNT(CASE WHEN clicked = true THEN 1 END) as total_clicked,
        COUNT(CASE WHEN converted = true THEN 1 END) as total_converted,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced_count,
        COUNT(CASE WHEN status = 'complained' THEN 1 END) as complained_count
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '30 days'
    `

    const stats = overallStats[0] || {}
    const totalSent = Number(stats.total_emails_sent) || 0
    const totalOpened = Number(stats.total_opened) || 0
    const totalClicked = Number(stats.total_clicked) || 0
    const totalConverted = Number(stats.total_converted) || 0

    const overallOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
    const overallClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0
    const overallConversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0

    // Get revenue attribution from converted emails
    const revenueData = await sql`
      SELECT 
        el.campaign_id,
        c.campaign_name,
        COUNT(DISTINCT el.user_email) as converted_count,
        SUM(ct.amount) as total_revenue
      FROM email_logs el
      JOIN admin_email_campaigns c ON c.id = el.campaign_id
      LEFT JOIN credit_transactions ct ON ct.user_id IN (
        SELECT id FROM users WHERE email = el.user_email
      )
      WHERE el.converted = true
      AND el.converted_at >= NOW() - INTERVAL '30 days'
      AND ct.transaction_type = 'purchase'
      GROUP BY el.campaign_id, c.campaign_name
      ORDER BY total_revenue DESC
    `

    // Get engagement trends (last 30 days)
    const engagementTrends = await sql`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN opened = true THEN 1 END) as opened,
        COUNT(CASE WHEN clicked = true THEN 1 END) as clicked,
        COUNT(CASE WHEN converted = true THEN 1 END) as converted
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `

    // Get top performing campaigns
    const topCampaigns = campaignsWithMetrics
      .filter((c: any) => c.metrics.totalSent > 0)
      .sort((a: any, b: any) => b.metrics.conversionRate - a.metrics.conversionRate)
      .slice(0, 5)

    return NextResponse.json({
      campaigns: campaignsWithMetrics,
      overallStats: {
        totalSent,
        totalOpened,
        totalClicked,
        totalConverted,
        openRate: Math.round(overallOpenRate * 100) / 100,
        clickRate: Math.round(overallClickRate * 100) / 100,
        conversionRate: Math.round(overallConversionRate * 100) / 100,
        delivered: Number(stats.delivered_count) || 0,
        bounced: Number(stats.bounced_count) || 0,
        complained: Number(stats.complained_count) || 0,
      },
      revenueAttribution: revenueData,
      engagementTrends: engagementTrends,
      topCampaigns: topCampaigns,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching email analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

