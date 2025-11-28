/**
 * Email Analytics Tools
 *
 * Backend-only analytics system for tracking email performance,
 * analyzing campaign effectiveness, and providing optimization recommendations.
 *
 * Used by: AdminSupervisorAgent, MarketingAutomationAgent
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Get email performance metrics for a specific campaign
 */
export async function getEmailPerformance(campaignId: string) {
  try {
    const results = await sql`
      SELECT 
        campaign_type,
        COUNT(*) as total_sent,
        COUNT(opened_at) as total_opens,
        COUNT(clicked_at) as total_clicks,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(opened_at), 0) * 100, 2) as click_to_open_rate
      FROM marketing_email_log
      WHERE campaign_id = ${campaignId}
      GROUP BY campaign_type
    `

    return {
      success: true,
      data: results[0] || {
        total_sent: 0,
        total_opens: 0,
        total_clicks: 0,
        open_rate: 0,
        click_rate: 0,
        click_to_open_rate: 0,
      },
    }
  } catch (error) {
    console.error("[AnalyticsTools] Error in getEmailPerformance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get engagement metrics for a specific user
 */
export async function getUserEngagement(userId: string) {
  try {
    const results = await sql`
      SELECT 
        COUNT(*) as emails_received,
        COUNT(opened_at) as emails_opened,
        COUNT(clicked_at) as emails_clicked,
        MAX(sent_at) as last_email_sent,
        MAX(opened_at) as last_email_opened,
        MAX(clicked_at) as last_email_clicked,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate
      FROM marketing_email_log
      WHERE user_id = ${userId}
    `

    return {
      success: true,
      data: results[0] || {
        emails_received: 0,
        emails_opened: 0,
        emails_clicked: 0,
        last_email_sent: null,
        last_email_opened: null,
        last_email_clicked: null,
        open_rate: 0,
        click_rate: 0,
      },
    }
  } catch (error) {
    console.error("[AnalyticsTools] Error in getUserEngagement:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get performance metrics for a specific user segment
 */
export async function getSegmentPerformance(segmentName: string) {
  try {
    const results = await sql`
      SELECT 
        segment,
        COUNT(*) as total_sent,
        COUNT(opened_at) as total_opens,
        COUNT(clicked_at) as total_clicks,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT campaign_id) as campaigns_sent
      FROM marketing_email_log
      WHERE segment = ${segmentName}
      GROUP BY segment
    `

    return {
      success: true,
      data: results[0] || {
        segment: segmentName,
        total_sent: 0,
        total_opens: 0,
        total_clicks: 0,
        open_rate: 0,
        click_rate: 0,
        unique_users: 0,
        campaigns_sent: 0,
      },
    }
  } catch (error) {
    console.error("[AnalyticsTools] Error in getSegmentPerformance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Generate a weekly summary of all email campaigns
 */
export async function generateWeeklySummary() {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Overall stats
    const overallStats = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(opened_at) as total_opens,
        COUNT(clicked_at) as total_clicks,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate,
        COUNT(DISTINCT user_id) as unique_recipients,
        COUNT(DISTINCT campaign_id) as unique_campaigns
      FROM marketing_email_log
      WHERE sent_at >= ${sevenDaysAgo.toISOString()}
    `

    // Best performing campaigns
    const bestCampaigns = await sql`
      SELECT 
        campaign_type,
        subject_line,
        COUNT(*) as sent,
        COUNT(opened_at) as opens,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate
      FROM marketing_email_log
      WHERE sent_at >= ${sevenDaysAgo.toISOString()}
      GROUP BY campaign_type, subject_line
      ORDER BY open_rate DESC
      LIMIT 5
    `

    // Segment performance
    const segmentStats = await sql`
      SELECT 
        segment,
        COUNT(*) as sent,
        COUNT(opened_at) as opens,
        COUNT(clicked_at) as clicks,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate
      FROM marketing_email_log
      WHERE sent_at >= ${sevenDaysAgo.toISOString()}
        AND segment IS NOT NULL
      GROUP BY segment
      ORDER BY open_rate DESC
    `

    // Lowest performing content
    const lowestPerforming = await sql`
      SELECT 
        campaign_type,
        subject_line,
        COUNT(*) as sent,
        COUNT(opened_at) as opens,
        ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as open_rate
      FROM marketing_email_log
      WHERE sent_at >= ${sevenDaysAgo.toISOString()}
        AND COUNT(*) >= 10
      GROUP BY campaign_type, subject_line
      ORDER BY open_rate ASC
      LIMIT 5
    `

    return {
      success: true,
      data: {
        period: `Last 7 days (${sevenDaysAgo.toISOString().split("T")[0]} - ${new Date().toISOString().split("T")[0]})`,
        overall: overallStats[0],
        best_campaigns: bestCampaigns,
        segment_performance: segmentStats,
        lowest_performing: lowestPerforming,
      },
    }
  } catch (error) {
    console.error("[AnalyticsTools] Error in generateWeeklySummary:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export const analyticsEmailTools = {
  getEmailPerformance: {
    description: "Get email performance metrics for a specific campaign (open rate, click rate, delivery count)",
    parameters: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "The campaign ID to analyze",
        },
      },
      required: ["campaignId"],
    },
    execute: async ({ campaignId }: { campaignId: string }) => {
      return await getEmailPerformance(campaignId)
    },
  },

  getUserEngagement: {
    description: "Get engagement metrics for a specific user (emails opened, clicked, rates)",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID to analyze",
        },
      },
      required: ["userId"],
    },
    execute: async ({ userId }: { userId: string }) => {
      return await getUserEngagement(userId)
    },
  },

  getSegmentPerformance: {
    description: "Get performance metrics for a specific user segment (open rates, click rates by segment)",
    parameters: {
      type: "object",
      properties: {
        segmentName: {
          type: "string",
          description: "The segment name to analyze (e.g. 'new_users', 'beta_users')",
        },
      },
      required: ["segmentName"],
    },
    execute: async ({ segmentName }: { segmentName: string }) => {
      return await getSegmentPerformance(segmentName)
    },
  },

  generateWeeklySummary: {
    description:
      "Generate a comprehensive weekly summary of email campaigns from the last 7 days (overall stats, best performers, segment breakdown, lowest performers)",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      return await generateWeeklySummary()
    },
  },
}
