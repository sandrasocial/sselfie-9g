/**
 * Admin Metrics Helper Library
 * 
 * Reusable functions for calculating business metrics from database aggregates.
 * All calculations are read-only and use existing tables.
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Cost per credit (actual API cost)
 */
export const COST_PER_CREDIT = 0.15

/**
 * Referral bonus cost per conversion
 * 50 credits (referrer) + 25 credits (referred) = 75 credits × $0.15 = $11.25
 */
export const REFERRAL_BONUS_COST = 11.25

/**
 * Calculate total revenue from subscriptions and one-time payments
 */
export async function calculateTotalRevenue(): Promise<number> {
  try {
    // Check if stripe_payments table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stripe_payments'
      )
    `

    if (tableExists[0]?.exists) {
      // Use comprehensive stripe_payments table
      const [result] = await sql`
        SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `
      return (result?.total_cents || 0) / 100
    } else {
      // Fallback to credit_transactions (legacy)
      const [result] = await sql`
        SELECT COALESCE(SUM(payment_amount_cents), 0)::int as total_cents
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND payment_amount_cents IS NOT NULL
      `
      return (result?.total_cents || 0) / 100
    }
  } catch (error) {
    console.error("[Metrics] Error calculating total revenue:", error)
    return 0
  }
}

/**
 * Calculate Monthly Recurring Revenue (MRR)
 */
export async function calculateMRR(): Promise<number> {
  try {
    const { PRICING_PRODUCTS } = await import("@/lib/products")

    const subscriptionsResult = await sql`
      SELECT 
        product_type,
        COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      GROUP BY product_type
    `

    let mrr = 0

    for (const sub of subscriptionsResult) {
      // Handle legacy brand_studio_membership
      let priceCents: number
      if (sub.product_type === "brand_studio_membership") {
        priceCents = 14900 // $149/month
      } else {
        const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
        priceCents = product?.priceInCents || 0
      }

      // MRR only includes recurring subscriptions
      if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
        mrr += (Number(sub.count) * priceCents) / 100
      }
    }

    return Math.round(mrr * 100) / 100
  } catch (error) {
    console.error("[Metrics] Error calculating MRR:", error)
    return 0
  }
}

/**
 * Calculate total credit cost (credits spent × cost per credit)
 */
export async function calculateCreditCost(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COALESCE(SUM(ABS(amount)), 0)::int as total_credits
      FROM credit_transactions
      WHERE transaction_type IN ('image', 'training', 'animation')
        AND amount < 0
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `

    const creditsSpent = result?.total_credits || 0
    return creditsSpent * COST_PER_CREDIT
  } catch (error) {
    console.error("[Metrics] Error calculating credit cost:", error)
    return 0
  }
}

/**
 * Calculate referral bonus cost
 */
export async function calculateReferralBonusCost(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COUNT(*)::int as completed_referrals
      FROM referrals
      WHERE status = 'completed'
    `

    const completedReferrals = result?.completed_referrals || 0
    return completedReferrals * REFERRAL_BONUS_COST
  } catch (error) {
    console.error("[Metrics] Error calculating referral bonus cost:", error)
    return 0
  }
}

/**
 * Calculate gross margin percentage
 */
export function calculateGrossMargin(revenue: number, costs: number): number {
  if (revenue === 0) return 0
  return Math.round(((revenue - costs) / revenue) * 100 * 100) / 100
}

/**
 * Calculate average Claude API cost per active user
 * Estimated: $10-20/month per active user
 * Using midpoint: $15/month
 */
export async function estimateClaudeCostPerActiveUser(): Promise<number> {
  // This is an estimate based on typical usage
  // Actual tracking would require Claude API usage logs
  return 15.0
}
