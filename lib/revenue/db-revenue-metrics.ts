/**
 * Database-Based Revenue Metrics
 * 
 * Uses stripe_payments table as PRIMARY source of truth (updated by webhooks)
 * Falls back to credit_transactions for legacy data
 * Fast, reliable, no Stripe API calls needed
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface DBRevenueMetrics {
  creditPurchaseRevenue: number
  oneTimeRevenue: number
  subscriptionRevenue: number // All subscription payments (MRR + renewals)
  totalRevenue: number // ALL revenue (subscriptions + one-time + credits)
  timestamp: string
  source: "database"
}

/**
 * Get revenue metrics from database (fast, reliable)
 * Uses stripe_payments table (comprehensive) with fallback to credit_transactions
 */
export async function getDBRevenueMetrics(): Promise<DBRevenueMetrics> {
  try {
    // Check if stripe_payments table exists (new comprehensive table)
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stripe_payments'
      )
    `
    
    if (tableExists[0]?.exists) {
      // Use comprehensive stripe_payments table (ALL revenue data)
      
      // Credit Purchase Revenue
      const [creditRevenue] = await sql`
        SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE payment_type = 'credit_topup'
          AND status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      // One-Time Revenue (Starter Photoshoot)
      const [oneTimeRevenue] = await sql`
        SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE payment_type = 'one_time_session'
          AND status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      // Subscription Revenue (ALL subscription payments - MRR + renewals)
      const [subscriptionRevenue] = await sql`
        SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE payment_type = 'subscription'
          AND status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      // Total Revenue (ALL payments)
      const [totalRevenue] = await sql`
        SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE status = 'succeeded'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
      `

      const creditPurchaseRevenue = (creditRevenue?.total_cents || 0) / 100
      const oneTimeRevenueAmount = (oneTimeRevenue?.total_cents || 0) / 100
      const subscriptionRevenueAmount = (subscriptionRevenue?.total_cents || 0) / 100
      const totalRevenueAmount = (totalRevenue?.total_cents || 0) / 100

      console.log(`[DBRevenueMetrics] Using stripe_payments table:`)
      console.log(`  - Credit purchases: $${creditPurchaseRevenue.toLocaleString()}`)
      console.log(`  - One-time revenue: $${oneTimeRevenueAmount.toLocaleString()}`)
      console.log(`  - Subscription revenue: $${subscriptionRevenueAmount.toLocaleString()}`)
      console.log(`  - Total revenue: $${totalRevenueAmount.toLocaleString()}`)

      return {
        creditPurchaseRevenue,
        oneTimeRevenue: oneTimeRevenueAmount,
        subscriptionRevenue: subscriptionRevenueAmount,
        totalRevenue: totalRevenueAmount,
        timestamp: new Date().toISOString(),
        source: "database",
      }
    } else {
      // Fallback to credit_transactions (legacy, before stripe_payments table exists)
      console.log(`[DBRevenueMetrics] stripe_payments table not found, using credit_transactions (legacy)`)
      
      const [creditRevenue] = await sql`
        SELECT COALESCE(SUM(payment_amount_cents), 0)::int as total_cents
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND product_type = 'credit_topup'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND payment_amount_cents IS NOT NULL
      `

      const [oneTimeRevenue] = await sql`
        SELECT COALESCE(SUM(payment_amount_cents), 0)::int as total_cents
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND product_type = 'one_time_session'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND payment_amount_cents IS NOT NULL
      `

      const [totalRevenue] = await sql`
        SELECT COALESCE(SUM(payment_amount_cents), 0)::int as total_cents
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND stripe_payment_id IS NOT NULL
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND payment_amount_cents IS NOT NULL
      `

      const creditPurchaseRevenue = (creditRevenue?.total_cents || 0) / 100
      const oneTimeRevenueAmount = (oneTimeRevenue?.total_cents || 0) / 100
      const totalRevenueAmount = (totalRevenue?.total_cents || 0) / 100

      return {
        creditPurchaseRevenue,
        oneTimeRevenue: oneTimeRevenueAmount,
        subscriptionRevenue: 0, // Not available in credit_transactions
        totalRevenue: totalRevenueAmount,
        timestamp: new Date().toISOString(),
        source: "database",
      }
    }
  } catch (error: any) {
    console.error(`[DBRevenueMetrics] Error fetching revenue from database:`, error.message)
    return {
      creditPurchaseRevenue: 0,
      oneTimeRevenue: 0,
      subscriptionRevenue: 0,
      totalRevenue: 0,
      timestamp: new Date().toISOString(),
      source: "database",
    }
  }
}

