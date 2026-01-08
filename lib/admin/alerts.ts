/**
 * Margin Alert System
 * 
 * Checks current metrics against thresholds and generates alerts
 * when margins drop below safe levels.
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

export interface MarginAlert {
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  currentValue: number
  threshold: number
  metric: "grossMargin" | "mrr" | "creditCost" | "referralROI"
  timestamp: string
}

/**
 * Check if gross margin is below threshold
 */
export function checkMarginThreshold(currentGrossMargin: number, threshold = 45): boolean {
  return currentGrossMargin < threshold
}

/**
 * Check if Claude cost exceeds threshold
 */
export function checkClaudeCost(avgClaudeCost: number, threshold = 20): boolean {
  return avgClaudeCost > threshold
}

/**
 * Check if referral conversion rate is below threshold
 */
export function checkReferralConversion(rate: number, threshold = 0.1): boolean {
  return rate < threshold
}

/**
 * Alert thresholds
 */
const ALERT_THRESHOLDS = {
  grossMarginThreshold: 45, // Below 45% = warning
  claudeCostThreshold: 20, // Above $20 avg = critical
  referralConversionThreshold: 0.1, // Below 10% = warning
} as const

export interface Alert {
  type: "margin" | "claude" | "referral"
  level: "critical" | "warning" | "info"
  message: string
  currentValue: number
  threshold: number
}

/**
 * Check current metrics and generate alerts with recommended actions
 */
export async function checkMarginAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []

  try {
    // Get current metrics
    const totalRevenue = await calculateTotalRevenue()
    const creditCost = await calculateCreditCost()
    const referralBonusCost = await calculateReferralBonusCost()

    // Get active users for Claude cost
    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()
    const totalClaudeCost = activeUsers * avgClaudeCost

    const totalCosts = creditCost + referralBonusCost + totalClaudeCost
    const grossMargin = calculateGrossMargin(totalRevenue, totalCosts)

    // Check Gross Margin
    if (checkMarginThreshold(grossMargin, ALERT_THRESHOLDS.grossMarginThreshold)) {
      alerts.push({
        type: "margin",
        level: "warning",
        message: `Gross margin dropped below ${ALERT_THRESHOLDS.grossMarginThreshold}%`,
        currentValue: grossMargin,
        threshold: ALERT_THRESHOLDS.grossMarginThreshold,
      })
    }

    // Check Claude Cost
    if (checkClaudeCost(avgClaudeCost, ALERT_THRESHOLDS.claudeCostThreshold)) {
      alerts.push({
        type: "claude",
        level: "critical",
        message: `Claude API cost exceeds $${ALERT_THRESHOLDS.claudeCostThreshold} avg`,
        currentValue: avgClaudeCost,
        threshold: ALERT_THRESHOLDS.claudeCostThreshold,
      })
    }

    // Check Referral Conversion
    const [referralStats] = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `
    const totalReferrals = referralStats?.total_referrals || 0
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralConversionRate = totalReferrals > 0 ? completedReferrals / totalReferrals : 0

    if (checkReferralConversion(referralConversionRate, ALERT_THRESHOLDS.referralConversionThreshold)) {
      alerts.push({
        type: "referral",
        level: "warning",
        message: `Referral conversion: ${(referralConversionRate * 100).toFixed(1)}% (below ${(ALERT_THRESHOLDS.referralConversionThreshold * 100)}% threshold)`,
        currentValue: referralConversionRate * 100,
        threshold: ALERT_THRESHOLDS.referralConversionThreshold * 100,
      })
    }

    return alerts
  } catch (error) {
    console.error("[Alerts] Error checking margin alerts:", error)
    return []
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use checkMarginAlerts() instead
 */
export async function checkMarginAlertsLegacy(): Promise<MarginAlert[]> {
  const alerts: MarginAlert[] = []

  try {
    // Get current metrics
    const totalRevenue = await calculateTotalRevenue()
    const mrr = await calculateMRR()
    const creditCost = await calculateCreditCost()
    const referralBonusCost = await calculateReferralBonusCost()

    // Get active users for Claude cost
    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()
    const totalClaudeCost = activeUsers * avgClaudeCost

    const totalCosts = creditCost + referralBonusCost + totalClaudeCost
    const grossMargin = calculateGrossMargin(totalRevenue, totalCosts)

    // Check Gross Margin
    if (grossMargin < ALERT_THRESHOLDS.grossMarginCritical) {
      alerts.push({
        severity: "critical",
        title: "Critical: Gross Margin Below 20%",
        message: `Gross margin is ${grossMargin.toFixed(1)}%, which is below the critical threshold of 20%. Immediate action required.`,
        currentValue: grossMargin,
        threshold: ALERT_THRESHOLDS.grossMarginCritical,
        metric: "grossMargin",
        timestamp: new Date().toISOString(),
      })
    } else if (grossMargin < ALERT_THRESHOLDS.grossMarginWarning) {
      alerts.push({
        severity: "warning",
        title: "Warning: Gross Margin Below 30%",
        message: `Gross margin is ${grossMargin.toFixed(1)}%, which is below the recommended threshold of 30%. Review costs and pricing.`,
        currentValue: grossMargin,
        threshold: ALERT_THRESHOLDS.grossMarginWarning,
        metric: "grossMargin",
        timestamp: new Date().toISOString(),
      })
    }

    // Check MRR Decline (compare to previous month)
    const [previousMonthMRR] = await sql`
      SELECT 
        COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND created_at < DATE_TRUNC('month', NOW())
        AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    `

    // Get current month MRR for comparison
    const { PRICING_PRODUCTS } = await import("@/lib/products")
    const currentSubscriptions = await sql`
      SELECT product_type, COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      GROUP BY product_type
    `

    let previousMRR = 0
    for (const sub of currentSubscriptions) {
      let priceCents: number
      if (sub.product_type === "brand_studio_membership") {
        priceCents = 14900
      } else {
        const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
        priceCents = product?.priceInCents || 0
      }
      if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
        previousMRR += (Number(sub.count) * priceCents) / 100
      }
    }

    // Simplified: if MRR is significantly lower than expected, alert
    // (This is a simplified check - in production, you'd compare to actual previous month)
    if (mrr > 0 && previousMRR > 0) {
      const mrrChange = ((mrr - previousMRR) / previousMRR) * 100
      if (mrrChange < ALERT_THRESHOLDS.mrrDeclineCritical) {
        alerts.push({
          severity: "critical",
          title: "Critical: MRR Decline Detected",
          message: `MRR has declined by ${Math.abs(mrrChange).toFixed(1)}%. Current MRR: $${mrr.toFixed(2)}. Investigate churn immediately.`,
          currentValue: mrr,
          threshold: previousMRR * (1 + ALERT_THRESHOLDS.mrrDeclineCritical / 100),
          metric: "mrr",
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Check Credit Cost Ratio
    if (totalRevenue > 0) {
      const creditCostRatio = creditCost / totalRevenue
      if (creditCostRatio > ALERT_THRESHOLDS.creditCostRatioWarning) {
        alerts.push({
          severity: "warning",
          title: "Warning: High Credit Cost Ratio",
          message: `Credit costs represent ${(creditCostRatio * 100).toFixed(1)}% of revenue (${creditCost.toFixed(2)} / ${totalRevenue.toFixed(2)}). Consider reviewing credit allocations or pricing.`,
          currentValue: creditCostRatio * 100,
          threshold: ALERT_THRESHOLDS.creditCostRatioWarning * 100,
          metric: "creditCost",
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Check Referral ROI
    const [referralStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralRevenuePotential = completedReferrals * 97
    const referralROI = referralBonusCost > 0
      ? ((referralRevenuePotential - referralBonusCost) / referralBonusCost) * 100
      : 0

    if (referralROI < ALERT_THRESHOLDS.referralROIWarning && completedReferrals > 0) {
      alerts.push({
        severity: "warning",
        title: "Warning: Referral ROI Below Break-Even",
        message: `Referral ROI is ${referralROI.toFixed(1)}%, indicating referrals may not be profitable. Review referral bonus structure.`,
        currentValue: referralROI,
        threshold: ALERT_THRESHOLDS.referralROIWarning,
        metric: "referralROI",
        timestamp: new Date().toISOString(),
      })
    }

    return alerts
  } catch (error) {
    console.error("[Alerts] Error checking margin alerts:", error)
    return []
  }
}

/**
 * Check if alert was sent recently (within cooldown period)
 */
export async function wasAlertSentRecently(alertId: string, cooldownHours: number = 24): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT sent_at
      FROM admin_alert_sent
      WHERE alert_id = ${alertId}
        AND sent_at > NOW() - INTERVAL '${cooldownHours} hours'
      ORDER BY sent_at DESC
      LIMIT 1
    `

    return result?.sent_at ? true : false
  } catch (error) {
    // Table might not exist - return false to allow sending
    return false
  }
}

/**
 * Record that an alert was sent
 */
export async function recordAlertSent(alertId: string): Promise<void> {
  try {
    await sql`
      INSERT INTO admin_alert_sent (alert_id, alert_type, sent_at)
      VALUES (${alertId}, 'margin-alert', NOW())
    `
  } catch (error) {
    // Table might not exist - log but don't fail
    console.warn("[Alerts] Could not record alert sent:", error)
  }
}
