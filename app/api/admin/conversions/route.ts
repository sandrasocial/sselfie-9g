import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Conversion Dashboard API
 * 
 * Returns comprehensive conversion funnel metrics
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

    // Calculate date ranges
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // ============================================
    // SECTION 1: Email → Purchase Funnel
    // ============================================
    
    // Total subscribers (from blueprint_subscribers + freebie_subscribers)
    const totalSubscribers = await sql`
      SELECT COUNT(*) as count FROM (
        SELECT email FROM blueprint_subscribers
        UNION
        SELECT email FROM freebie_subscribers
      ) AS all_subscribers
    `
    const subscriberCount = Number(totalSubscribers[0]?.count || 0)

    // Emails sent this week
    const emailsSentThisWeek = await sql`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE sent_at >= ${weekAgo.toISOString()}
      AND status = 'sent'
    `
    const sentCount = Number(emailsSentThisWeek[0]?.count || 0)

    // Clicks this week
    const clicksThisWeek = await sql`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE clicked = TRUE
      AND clicked_at >= ${weekAgo.toISOString()}
    `
    const clickCount = Number(clicksThisWeek[0]?.count || 0)

    // Checkouts started (from Stripe checkout sessions - approximate from email clicks with checkout params)
    const checkoutsStarted = await sql`
      SELECT COUNT(DISTINCT user_email) as count
      FROM email_logs
      WHERE clicked = TRUE
      AND clicked_at >= ${weekAgo.toISOString()}
      AND email_type LIKE '%checkout%'
    `
    const checkoutCount = Number(checkoutsStarted[0]?.count || 0)

    // Purchases completed this week (from subscriptions or credit transactions)
    const purchasesSubscriptions = await sql`
      SELECT DISTINCT u.email
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      WHERE s.created_at >= ${weekAgo.toISOString()}
      AND s.status = 'active'
    `
    const purchasesCredits = await sql`
      SELECT DISTINCT u.email
      FROM users u
      JOIN credit_transactions ct ON ct.user_id = u.id
      WHERE ct.created_at >= ${weekAgo.toISOString()}
      AND ct.transaction_type = 'purchase'
      AND ct.amount > 0
    `
    const allPurchases = new Set([
      ...purchasesSubscriptions.map((r: any) => r.email),
      ...purchasesCredits.map((r: any) => r.email),
    ])
    const purchaseCount = allPurchases.size

    // Overall conversion rate
    const overallConversionRate = subscriberCount > 0 
      ? (purchaseCount / subscriberCount) * 100 
      : 0

    // ============================================
    // SECTION 2: Instagram → Email Funnel
    // ============================================

    // Free guide downloads (blueprint completions)
    const blueprintCompletions = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE blueprint_completed = TRUE
    `
    const guideDownloads = Number(blueprintCompletions[0]?.count || 0)

    // Guide → Purchase rate
    const blueprintConversions = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE blueprint_completed = TRUE
      AND converted_to_user = TRUE
    `
    const guideConversions = Number(blueprintConversions[0]?.count || 0)
    const guideToPurchaseRate = guideDownloads > 0 
      ? (guideConversions / guideDownloads) * 100 
      : 0

    // Instagram clicks (placeholder - would need GA4 API integration)
    const instagramClicks = 0 // TODO: Integrate with GA4 API

    // ============================================
    // SECTION 3: Top Converting Campaigns
    // ============================================

    const topCampaigns = await sql`
      SELECT 
        c.id,
        c.campaign_name,
        c.campaign_type,
        c.subject_line,
        c.created_at,
        COALESCE(c.total_sent, 0) as total_sent,
        COUNT(DISTINCT el.id) FILTER (WHERE el.opened = TRUE) as total_opened,
        COUNT(DISTINCT el.id) FILTER (WHERE el.clicked = TRUE) as total_clicked,
        COUNT(DISTINCT el.id) FILTER (WHERE el.converted = TRUE) as total_converted,
        COALESCE(SUM(ct.amount), 0) as revenue
      FROM admin_email_campaigns c
      LEFT JOIN email_logs el ON el.campaign_id = c.id
      LEFT JOIN credit_transactions ct ON ct.user_id IN (
        SELECT u.id FROM users u WHERE u.email = el.user_email
      ) AND ct.transaction_type = 'purchase'
      AND ct.created_at >= el.converted_at
      AND ct.created_at <= el.converted_at + INTERVAL '7 days'
      WHERE c.status = 'sent'
      GROUP BY c.id
      HAVING COALESCE(c.total_sent, 0) > 0
      ORDER BY 
        CASE 
          WHEN COALESCE(c.total_sent, 0) > 0 
          THEN COUNT(DISTINCT el.id) FILTER (WHERE el.converted = TRUE)::numeric / COALESCE(c.total_sent, 1)
          ELSE 0
        END DESC
      LIMIT 10
    `

    const campaignsWithMetrics = topCampaigns.map((campaign: any) => {
      const sent = Number(campaign.total_sent) || 0
      const opened = Number(campaign.total_opened) || 0
      const clicked = Number(campaign.total_clicked) || 0
      const converted = Number(campaign.total_converted) || 0
      const revenue = Number(campaign.revenue) || 0

      const conversionRate = sent > 0 ? (converted / sent) * 100 : 0

      return {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        campaignType: campaign.campaign_type,
        subjectLine: campaign.subject_line,
        createdAt: campaign.created_at,
        metrics: {
          sent,
          opened,
          clicked,
          converted,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenue: revenue / 100, // Convert cents to dollars
        },
      }
    })

    // ============================================
    // SECTION 4: This Week's Performance
    // ============================================

    // Revenue this week
    const revenueThisWeek = await sql`
      SELECT 
        COALESCE(SUM(ct.amount), 0) as revenue,
        COUNT(DISTINCT ct.user_id) as customers
      FROM credit_transactions ct
      WHERE ct.created_at >= ${weekAgo.toISOString()}
      AND ct.transaction_type = 'purchase'
      AND ct.amount > 0
    `
    const weekRevenue = Number(revenueThisWeek[0]?.revenue || 0) / 100
    const weekCustomers = Number(revenueThisWeek[0]?.customers || 0)
    const averageOrderValue = weekCustomers > 0 ? weekRevenue / weekCustomers : 0

    // New customers this week
    const newCustomers = await sql`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      WHERE s.created_at >= ${weekAgo.toISOString()}
      AND s.status = 'active'
    `
    const newCustomerCount = Number(newCustomers[0]?.count || 0)

    // Top traffic source (from email_logs - UTM tracking)
    const topTrafficSource = "Email Campaigns" // Default, can be enhanced with GA4

    // ============================================
    // Funnel Trends (Last 30 Days)
    // ============================================

    const funnelTrends = await sql`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as emails_sent,
        COUNT(CASE WHEN opened = TRUE THEN 1 END) as emails_opened,
        COUNT(CASE WHEN clicked = TRUE THEN 1 END) as emails_clicked,
        COUNT(CASE WHEN converted = TRUE THEN 1 END) as conversions
      FROM email_logs
      WHERE sent_at >= ${monthAgo.toISOString()}
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `

    // ============================================
    // Conversion Funnel Breakdown
    // ============================================

    const funnelData = [
      {
        stage: "Subscribers",
        count: subscriberCount,
        percentage: 100,
      },
      {
        stage: "Emails Sent",
        count: sentCount,
        percentage: subscriberCount > 0 ? (sentCount / subscriberCount) * 100 : 0,
      },
      {
        stage: "Emails Opened",
        count: clickCount, // Using clicks as proxy for engagement
        percentage: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
      },
      {
        stage: "Clicks",
        count: clickCount,
        percentage: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
      },
      {
        stage: "Checkouts Started",
        count: checkoutCount,
        percentage: clickCount > 0 ? (checkoutCount / clickCount) * 100 : 0,
      },
      {
        stage: "Purchases",
        count: purchaseCount,
        percentage: checkoutCount > 0 ? (purchaseCount / checkoutCount) * 100 : 0,
      },
    ]

    return NextResponse.json({
      // Section 1: Email → Purchase Funnel
      emailFunnel: {
        totalSubscribers: subscriberCount,
        emailsSentThisWeek: sentCount,
        clicksThisWeek: clickCount,
        checkoutsStarted: checkoutCount,
        purchasesCompleted: purchaseCount,
        conversionRate: Math.round(overallConversionRate * 100) / 100,
        funnelData,
      },

      // Section 2: Instagram → Email Funnel
      instagramFunnel: {
        instagramClicks,
        freeGuideDownloads: guideDownloads,
        guideToPurchaseRate: Math.round(guideToPurchaseRate * 100) / 100,
        guideConversions,
      },

      // Section 3: Top Converting Campaigns
      topCampaigns: campaignsWithMetrics,

      // Section 4: This Week's Performance
      weeklyPerformance: {
        revenue: weekRevenue,
        newCustomers: newCustomerCount,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        topTrafficSource,
      },

      // Trends
      funnelTrends: funnelTrends.map((trend: any) => ({
        date: trend.date,
        emailsSent: Number(trend.emails_sent || 0),
        emailsOpened: Number(trend.emails_opened || 0),
        emailsClicked: Number(trend.emails_clicked || 0),
        conversions: Number(trend.conversions || 0),
      })),
    })
  } catch (error: any) {
    console.error("[v0] Error fetching conversion data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
