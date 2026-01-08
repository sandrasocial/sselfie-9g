/**
 * Growth Forecast Engine
 * 
 * Uses simple linear regression to predict next-month metrics
 * based on historical data (last 3 months).
 */

import { neon } from "@neondatabase/serverless"
import {
  calculateTotalRevenue,
  calculateMRR,
  calculateCreditCost,
  calculateReferralBonusCost,
  calculateGrossMargin,
  estimateClaudeCostPerActiveUser,
} from "./metrics"

const sql = neon(process.env.DATABASE_URL!)

export interface ForecastResult {
  nextMonth: string // "YYYY-MM"
  revenueForecast: number
  mrrForecast: number
  creditCostForecast: number
  referralCostForecast: number
  claudeCostForecast: number
  totalCostsForecast: number
  grossMarginForecast: number
  confidence: number // 0-1
  trend: "up" | "down" | "stable"
}

/**
 * Simple linear regression: y = mx + b
 * Returns { slope, intercept, rSquared }
 */
function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = x.length
  if (n < 2) {
    return { slope: 0, intercept: y[0] || 0, rSquared: 0 }
  }

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumYY = y.reduce((sum, yi) => y.reduce((s, yj) => s + yj * yj, 0), 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared (coefficient of determination)
  const yMean = sumY / n
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept
    return sum + Math.pow(yi - predicted, 2)
  }, 0)
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0

  return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) }
}

/**
 * Get historical revenue data for last 3 months
 */
async function getHistoricalRevenue(): Promise<Array<{ month: string; revenue: number }>> {
  try {
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stripe_payments'
      )
    `

    if (tableExists[0]?.exists) {
      const results = await sql`
        SELECT 
          DATE_TRUNC('month', created_at)::text as month,
          COALESCE(SUM(amount_cents), 0)::int / 100.0 as revenue
        FROM stripe_payments
        WHERE status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 3
      `

      return results.map((r: any) => ({
        month: r.month,
        revenue: Number(r.revenue) || 0,
      }))
    }

    // Fallback: return empty array (not enough data)
    return []
  } catch (error) {
    console.error("[Forecast] Error getting historical revenue:", error)
    return []
  }
}

/**
 * Get historical MRR data for last 3 months
 */
async function getHistoricalMRR(): Promise<Array<{ month: string; mrr: number }>> {
  try {
    const { PRICING_PRODUCTS } = await import("@/lib/products")

    // Get subscription counts by month for last 3 months
    const results = await sql`
      SELECT 
        DATE_TRUNC('month', created_at)::text as month,
        product_type,
        COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND created_at >= NOW() - INTERVAL '3 months'
      GROUP BY DATE_TRUNC('month', created_at), product_type
      ORDER BY month DESC
    `

    // Group by month and calculate MRR
    const monthlyMRR: Record<string, number> = {}
    for (const row of results) {
      const month = row.month
      let priceCents: number
      if (row.product_type === "brand_studio_membership") {
        priceCents = 14900
      } else {
        const product = PRICING_PRODUCTS.find((p) => p.type === row.product_type)
        priceCents = product?.priceInCents || 0
      }

      if (row.product_type === "sselfie_studio_membership" || row.product_type === "brand_studio_membership") {
        monthlyMRR[month] = (monthlyMRR[month] || 0) + (Number(row.count) * priceCents) / 100
      }
    }

    return Object.entries(monthlyMRR)
      .map(([month, mrr]) => ({ month, mrr }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3)
  } catch (error) {
    console.error("[Forecast] Error getting historical MRR:", error)
    return []
  }
}

/**
 * Get historical credit cost data for last 2 months
 */
async function getHistoricalCreditCost(): Promise<Array<{ month: string; cost: number }>> {
  try {
    const results = await sql`
      SELECT 
        DATE_TRUNC('month', created_at)::text as month,
        COALESCE(SUM(ABS(amount)), 0)::int * 0.15 as cost
      FROM credit_transactions
      WHERE transaction_type IN ('image', 'training', 'animation')
        AND amount < 0
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND created_at >= NOW() - INTERVAL '2 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 2
    `

    return results.map((r: any) => ({
      month: r.month,
      cost: Number(r.cost) || 0,
    }))
  } catch (error) {
    console.error("[Forecast] Error getting historical credit cost:", error)
    return []
  }
}

/**
 * Get historical referral cost data for last 2 months
 */
async function getHistoricalReferralCost(): Promise<Array<{ month: string; cost: number }>> {
  try {
    const results = await sql`
      SELECT 
        DATE_TRUNC('month', completed_at)::text as month,
        COUNT(*)::int * 11.25 as cost
      FROM referrals
      WHERE status = 'completed'
        AND completed_at >= NOW() - INTERVAL '2 months'
      GROUP BY DATE_TRUNC('month', completed_at)
      ORDER BY month DESC
      LIMIT 2
    `

    return results.map((r: any) => ({
      month: r.month,
      cost: Number(r.cost) || 0,
    }))
  } catch (error) {
    console.error("[Forecast] Error getting historical referral cost:", error)
    return []
  }
}

/**
 * Generate forecast for next month
 */
export async function generateForecast(): Promise<ForecastResult> {
  try {
    // Get next month string (YYYY-MM)
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`

    // Get historical data
    const revenueHistory = await getHistoricalRevenue()
    const mrrHistory = await getHistoricalMRR()
    const creditCostHistory = await getHistoricalCreditCost()
    const referralCostHistory = await getHistoricalReferralCost()

    // Get current active users for Claude cost estimate
    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()

    // Forecast Revenue (3-month trend)
    let revenueForecast = 0
    let revenueConfidence = 0
    if (revenueHistory.length >= 2) {
      const x = revenueHistory.map((_, i) => i)
      const y = revenueHistory.map((h) => h.revenue).reverse()
      const regression = linearRegression(x, y)
      revenueForecast = regression.slope * revenueHistory.length + regression.intercept
      revenueConfidence = regression.rSquared
    } else {
      // Not enough data - use current revenue
      revenueForecast = await calculateTotalRevenue()
      revenueConfidence = 0.3
    }

    // Forecast MRR (3-month trend)
    let mrrForecast = 0
    let mrrConfidence = 0
    if (mrrHistory.length >= 2) {
      const x = mrrHistory.map((_, i) => i)
      const y = mrrHistory.map((h) => h.mrr).reverse()
      const regression = linearRegression(x, y)
      mrrForecast = regression.slope * mrrHistory.length + regression.intercept
      mrrConfidence = regression.rSquared
    } else {
      mrrForecast = await calculateMRR()
      mrrConfidence = 0.3
    }

    // Forecast Credit Cost (2-month average ratio)
    let creditCostForecast = 0
    if (creditCostHistory.length >= 2) {
      // Use average of last 2 months
      const avg = creditCostHistory.reduce((sum, h) => sum + h.cost, 0) / creditCostHistory.length
      creditCostForecast = avg
    } else {
      creditCostForecast = await calculateCreditCost()
    }

    // Forecast Referral Cost (2-month average)
    let referralCostForecast = 0
    if (referralCostHistory.length >= 2) {
      const avg = referralCostHistory.reduce((sum, h) => sum + h.cost, 0) / referralCostHistory.length
      referralCostForecast = avg
    } else {
      referralCostForecast = await calculateReferralBonusCost()
    }

    // Forecast Claude Cost (based on active users trend)
    const claudeCostForecast = activeUsers * avgClaudeCost

    // Total costs
    const totalCostsForecast = creditCostForecast + referralCostForecast + claudeCostForecast

    // Forecast Gross Margin
    const grossMarginForecast = calculateGrossMargin(revenueForecast, totalCostsForecast)

    // Overall confidence (average of revenue and MRR confidence)
    const confidence = Math.round(((revenueConfidence + mrrConfidence) / 2) * 100) / 100

    // Determine trend
    let trend: "up" | "down" | "stable" = "stable"
    if (revenueHistory.length >= 2) {
      const recent = revenueHistory[0]?.revenue || 0
      const previous = revenueHistory[1]?.revenue || 0
      const change = ((recent - previous) / previous) * 100
      if (change > 5) trend = "up"
      else if (change < -5) trend = "down"
    }

    return {
      nextMonth: nextMonthStr,
      revenueForecast: Math.round(revenueForecast * 100) / 100,
      mrrForecast: Math.round(mrrForecast * 100) / 100,
      creditCostForecast: Math.round(creditCostForecast * 100) / 100,
      referralCostForecast: Math.round(referralCostForecast * 100) / 100,
      claudeCostForecast: Math.round(claudeCostForecast * 100) / 100,
      totalCostsForecast: Math.round(totalCostsForecast * 100) / 100,
      grossMarginForecast: Math.round(grossMarginForecast * 100) / 100,
      confidence: Math.max(0, Math.min(1, confidence)),
      trend,
    }
  } catch (error) {
    console.error("[Forecast] Error generating forecast:", error)
    // Return safe defaults
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`

    return {
      nextMonth: nextMonthStr,
      revenueForecast: 0,
      mrrForecast: 0,
      creditCostForecast: 0,
      referralCostForecast: 0,
      claudeCostForecast: 0,
      totalCostsForecast: 0,
      grossMarginForecast: 0,
      confidence: 0,
      trend: "stable",
    }
  }
}
