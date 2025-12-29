/**
 * Get Revenue Metrics Tool
 * Gets comprehensive business metrics including users, revenue, conversions, and platform analytics
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetRevenueMetricsInput {
  timeRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all_time'
  includeConversionFunnel?: boolean
}

export const getRevenueMetricsTool: Tool<GetRevenueMetricsInput> = {
  name: "get_revenue_metrics",
  description: `Get comprehensive business metrics including users, revenue, conversions, and platform analytics.

Returns:
- User counts (total, Studio members, free users)
- Revenue estimates (MRR, one-time revenue)
- Conversion metrics (trial-to-paid rates)
- Platform usage (generations, active users)
- Growth trends (new signups, activation rates)
- Business health indicators

Use this when Sandra asks about:
- "How many users do we have?"
- "What's our revenue?"
- "How many Studio members?"
- "Show me business metrics"
- "How is the platform performing?"

This provides real-time data from the database.`,

  input_schema: {
    type: "object",
    properties: {
      timeRange: {
        type: "string",
        enum: ["today", "yesterday", "week", "month", "all_time"],
        description: "Time range for metrics (defaults to 'week')"
      },
      includeConversionFunnel: {
        type: "boolean",
        description: "Include detailed conversion funnel analysis (defaults to true)"
      }
    },
    required: []
  },

  async execute(params: GetRevenueMetricsInput = {}): Promise<ToolResult> {
    const timeRange = params?.timeRange || 'week'
    const includeConversionFunnel = params?.includeConversionFunnel !== false

    try {
      // Calculate date range
      let startDate = new Date()
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'all_time':
          startDate = new Date('2020-01-01')
          break
      }

      // Get total users count
      const userCounts = await sql`
        SELECT
          COUNT(*)::int as total_users,
          COUNT(*) FILTER (WHERE created_at >= ${startDate.toISOString()})::int as new_signups
        FROM users
        WHERE email IS NOT NULL
      `

      // Active subscribers count
      const subscriberCounts = await sql`
        SELECT 
          COUNT(DISTINCT user_id)::int as active_subscribers,
          COUNT(CASE WHEN product_type = 'sselfie_studio_membership' THEN 1 END)::int as studio_members
        FROM subscriptions
        WHERE status = 'active'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      // One-time purchase counts
      const oneTimeCounts = await sql`
        SELECT 
          COUNT(DISTINCT user_id)::int as one_time_buyers,
          COUNT(*)::int as total_purchases,
          COUNT(CASE WHEN product_type = 'one_time_session' THEN 1 END)::int as session_purchases,
          COUNT(CASE WHEN product_type = 'credit_topup' THEN 1 END)::int as topup_purchases
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND created_at >= ${startDate.toISOString()}
      `

      // One-time buyers (all time)
      const oneTimeBuyersAllTimeResult = await sql`
        SELECT COUNT(DISTINCT user_id)::int as one_time_buyers_all_time
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      // Monthly Recurring Revenue (MRR)
      const { PRICING_PRODUCTS } = await import("@/lib/products")
      const subscriptionsByType = await sql`
        SELECT 
          product_type,
          COUNT(*) as count
        FROM subscriptions
        WHERE status = 'active'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        GROUP BY product_type
      `

      let mrr = 0
      subscriptionsByType.forEach((sub: any) => {
        const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
        if (product && (sub.product_type === 'sselfie_studio_membership' || sub.product_type === 'brand_studio_membership')) {
          mrr = mrr + (Number(sub.count) * product.priceInCents) / 100
        }
      })

      if (!userCounts || userCounts.length === 0) {
        return {
          success: false,
          error: "Failed to retrieve user metrics from database"
        }
      }

      // Validate numeric values
      const totalUsers = Number(userCounts[0]?.total_users || 0)
      const newSignups = Number(userCounts[0]?.new_signups || 0)
      const activeSubscribers = Number(subscriberCounts[0]?.active_subscribers || 0)
      const studioMembers = Number(subscriberCounts[0]?.studio_members || 0)
      const oneTimeBuyers = Number(oneTimeCounts[0]?.one_time_buyers || 0)
      const oneTimeBuyersAllTime = Number(oneTimeBuyersAllTimeResult[0]?.one_time_buyers_all_time || 0)
      const totalPurchases = Number(oneTimeCounts[0]?.total_purchases || 0)
      const sessionPurchases = Number(oneTimeCounts[0]?.session_purchases || 0)
      const topupPurchases = Number(oneTimeCounts[0]?.topup_purchases || 0)

      // Calculate total paying customers
      const totalPayingCustomers = activeSubscribers + oneTimeBuyersAllTime
      const overallConversion = totalUsers > 0 ? ((activeSubscribers + oneTimeBuyersAllTime) / totalUsers * 100) : 0

      // Get generation activity
      const activityMetricsResult = await sql`
        SELECT
          COUNT(*)::int as total_generations,
          COUNT(DISTINCT user_id)::int as active_users,
          COUNT(*) FILTER (WHERE created_at >= ${startDate.toISOString()})::int as recent_generations
        FROM generated_images
      `

      if (!activityMetricsResult || activityMetricsResult.length === 0) {
        return {
          success: false,
          error: "Failed to retrieve activity metrics from database"
        }
      }

      const totalGenerations = Number(activityMetricsResult[0].total_generations) || 0
      const activeUsers = Number(activityMetricsResult[0].active_users) || 0
      const recentGenerations = Number(activityMetricsResult[0].recent_generations) || 0

      // Get recent paid users for churn analysis
      const churnMetricsResult = await sql`
        SELECT
          COUNT(*)::int as total_paid_users,
          COUNT(*) FILTER (WHERE last_login_at < NOW() - INTERVAL '7 days')::int as inactive_7_days,
          COUNT(*) FILTER (WHERE last_login_at < NOW() - INTERVAL '30 days')::int as inactive_30_days
        FROM users
        WHERE plan != 'free'
      `

      if (!churnMetricsResult || churnMetricsResult.length === 0) {
        return {
          success: false,
          error: "Failed to retrieve churn metrics from database"
        }
      }

      const totalPaidUsers = Number(churnMetricsResult[0].total_paid_users) || 0
      const inactive7Days = Number(churnMetricsResult[0].inactive_7_days) || 0
      const inactive30Days = Number(churnMetricsResult[0].inactive_30_days) || 0

      const paidUserPercentage = totalUsers > 0 ? (totalPayingCustomers / totalUsers * 100) : 0
      const avgGenerationsPerUser = activeUsers > 0 ? (totalGenerations / activeUsers) : 0
      const retentionRate7Days = totalPaidUsers > 0 ? ((totalPaidUsers - inactive7Days) / totalPaidUsers * 100) : 0
      const retentionRate30Days = totalPaidUsers > 0 ? ((totalPaidUsers - inactive30Days) / totalPaidUsers * 100) : 0

      const result: any = {
        time_range: timeRange,
        generated_at: new Date().toISOString(),

        user_metrics: {
          total_users: totalUsers,
          active_subscribers: activeSubscribers,
          studio_members: studioMembers,
          one_time_buyers: oneTimeBuyersAllTime,
          new_signups_this_period: newSignups,
          new_paid_users_this_period: activeSubscribers + oneTimeBuyers
        },

        conversion_metrics: {
          overall_conversion_rate: `${overallConversion.toFixed(1)}%`,
          paid_user_percentage: `${paidUserPercentage.toFixed(1)}%`,
          subscription_conversion: totalUsers > 0 ? `${(activeSubscribers / totalUsers * 100).toFixed(1)}%` : '0%',
          one_time_conversion: totalUsers > 0 ? `${(oneTimeBuyersAllTime / totalUsers * 100).toFixed(1)}%` : '0%'
        },

        revenue_metrics: {
          monthly_recurring_revenue: `$${mrr.toFixed(2)}`,
          active_subscribers: activeSubscribers,
          one_time_revenue_note: "One-time revenue total available via revenue dashboard endpoint (uses Stripe API)",
          purchase_breakdown: {
            total_one_time_purchases: totalPurchases,
            session_purchases: sessionPurchases,
            topup_purchases: topupPurchases,
            one_time_buyers: oneTimeBuyersAllTime
          }
        },

        engagement_metrics: {
          total_generations: totalGenerations,
          active_users: activeUsers,
          recent_generations: recentGenerations,
          avg_generations_per_user: avgGenerationsPerUser.toFixed(1)
        },

        retention_metrics: {
          total_paid_users: totalPayingCustomers,
          total_subscribers: activeSubscribers,
          inactive_7_days: inactive7Days,
          inactive_30_days: inactive30Days,
          retention_rate_7_days: `${retentionRate7Days.toFixed(1)}%`,
          retention_rate_30_days: `${retentionRate30Days.toFixed(1)}%`
        },

        customer_breakdown: {
          active_subscribers: activeSubscribers,
          one_time_buyers: oneTimeBuyersAllTime,
          total_paying_customers: totalPayingCustomers
        }
      }

      // Add conversion funnel analysis if requested
      if (includeConversionFunnel) {
        const funnelMetricsResult = await sql`
          SELECT
            COUNT(DISTINCT u.id)::int as signed_up,
            COUNT(DISTINCT gi.user_id)::int as generated_at_least_once,
            COUNT(DISTINCT CASE WHEN u.plan != 'free' THEN u.id END)::int as converted_to_paid
          FROM users u
          LEFT JOIN generated_images gi ON gi.user_id = u.id
          WHERE u.created_at >= ${startDate.toISOString()}
        `

        if (funnelMetricsResult && funnelMetricsResult.length > 0) {
          const signedUp = Number(funnelMetricsResult[0].signed_up) || 0
          const generatedAtLeastOnce = Number(funnelMetricsResult[0].generated_at_least_once) || 0
          const convertedToPaid = Number(funnelMetricsResult[0].converted_to_paid) || 0

          const signupToTrialRate = signedUp > 0 ? (generatedAtLeastOnce / signedUp * 100) : 0
          const trialToPaidRate = generatedAtLeastOnce > 0 ? (convertedToPaid / generatedAtLeastOnce * 100) : 0
          const signupToPaidRate = signedUp > 0 ? (convertedToPaid / signedUp * 100) : 0

          result.conversion_funnel = {
            signed_up: signedUp,
            tried_generation: generatedAtLeastOnce,
            converted_to_paid: convertedToPaid,
            signup_to_trial_rate: `${signupToTrialRate.toFixed(1)}%`,
            trial_to_paid_rate: `${trialToPaidRate.toFixed(1)}%`,
            signup_to_paid_rate: `${signupToPaidRate.toFixed(1)}%`,

            insights: [
              signedUp > 0 && (generatedAtLeastOnce / signedUp) < 0.5
                ? "⚠️ Less than 50% of signups try generation - onboarding issue?"
                : "✅ Good activation rate",

              generatedAtLeastOnce > 0 && (convertedToPaid / generatedAtLeastOnce) < 0.1
                ? "⚠️ Less than 10% convert after trying - pricing or value prop issue?"
                : "✅ Healthy trial-to-paid conversion",

              newSignups < 10
                ? "⚠️ Low signup volume - need more traffic"
                : "✅ Steady signup volume"
            ]
          }
        }
      }

      result.revenue_summary = {
        monthly_recurring_revenue: `$${mrr.toFixed(2)}`,
        note: "One-time revenue total available via /api/admin/dashboard/revenue endpoint (uses Stripe API)",
        active_subscribers_count: activeSubscribers,
        one_time_buyers_count: oneTimeBuyersAllTime
      }

      return {
        success: true,
        metrics: result,
        data: result
      }
    } catch (error: any) {
      console.error("[Alex] Error in get_revenue_metrics tool:", error)
      return {
        success: false,
        error: error.message || "Failed to get revenue metrics",
        suggestion: "Check database connection and ensure tables exist"
      }
    }
  }
}

