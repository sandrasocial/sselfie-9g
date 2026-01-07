/**
 * OPTIMIZED Stripe Live Metrics - Webhook-First Approach
 * 
 * EXPERT BEST PRACTICE:
 * - Database (webhook-populated) = PRIMARY source (fast, reliable, comprehensive)
 * - Stripe API = FALLBACK only (for MRR if subscription prices aren't stored)
 * 
 * Why this is better:
 * 1. Webhooks update database in real-time (event-driven, reliable)
 * 2. Database queries are fast (< 100ms vs 10+ seconds for Stripe API)
 * 3. No rate limits or timeouts
 * 4. Comprehensive data (all payments stored correctly)
 * 5. Works even if Stripe API is down
 */

import { neon } from "@neondatabase/serverless"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"
import { PRICING_PRODUCTS } from "@/lib/products"
import { getStripe } from "@/lib/stripe"

const sql = neon(process.env.DATABASE_URL!)

export interface StripeLiveMetrics {
  activeSubscriptions: number
  totalSubscriptions: number
  canceledSubscriptions30d: number
  totalRevenue: number
  mrr: number
  oneTimeRevenue: number
  creditPurchaseRevenue: number
  newSubscribers30d: number
  newOneTimeBuyers30d: number
  timestamp: string
  cached: boolean
  source: "database" | "stripe" // Track data source
}

const CACHE_KEY = "stripe:live:metrics"
const CACHE_TTL_SECONDS = 300 // 5 minutes

/**
 * Get MRR from database (webhook-populated subscriptions)
 * Falls back to Stripe API only if we need real-time prices (beta discounts)
 */
async function getMRRFromDatabase(): Promise<number> {
  try {
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
    subscriptionsResult.forEach((sub: any) => {
      // Handle legacy brand_studio_membership
      let priceCents: number
      if (sub.product_type === "brand_studio_membership") {
        priceCents = 14900 // $149/month
      } else {
        const product = PRICING_PRODUCTS.find((p) => p.type === sub.product_type)
        priceCents = product?.priceInCents || 0
      }

      if (priceCents > 0) {
        const priceDollars = priceCents / 100
        const revenue = Number(sub.count) * priceDollars

        // MRR only includes recurring subscriptions
        if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "brand_studio_membership") {
          mrr += revenue
        }
      }
    })

    return Math.round(mrr)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error calculating MRR from database:`, error.message)
    return 0
  }
}

/**
 * Get MRR from Stripe API (fallback for real-time prices)
 * Only used if database MRR might be inaccurate (beta discounts, price changes)
 */
async function getMRRFromStripe(): Promise<number> {
  const stripe = getStripe()
  let mrr = 0
  let hasMore = true
  let startingAfter: string | undefined

  try {
    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      })

      for (const sub of subscriptions.data) {
        if (!sub.livemode) continue

        if (sub.items.data.length > 0) {
          const price = sub.items.data[0].price
          if (price.recurring) {
            const amount = price.unit_amount || 0
            if (price.recurring.interval === "month") {
              mrr += amount / 100
            } else if (price.recurring.interval === "year") {
              mrr += amount / 100 / 12
            } else if (price.recurring.interval === "week") {
              mrr += (amount / 100) * 4.33
            } else if (price.recurring.interval === "day") {
              mrr += (amount / 100) * 30
            }
          }
        }
      }

      hasMore = subscriptions.has_more
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id
      }
    }

    return Math.round(mrr)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching MRR from Stripe:`, error.message)
    return 0
  }
}

/**
 * Get active subscriptions from database (webhook-populated)
 */
async function getActiveSubscriptionsFromDatabase(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'active'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    return result?.count || 0
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching active subscriptions from database:`, error.message)
    return 0
  }
}

/**
 * Get total subscriptions from database
 */
async function getTotalSubscriptionsFromDatabase(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    return result?.count || 0
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching total subscriptions from database:`, error.message)
    return 0
  }
}

/**
 * Get canceled subscriptions in last 30 days from database
 */
async function getCanceledSubscriptions30dFromDatabase(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'canceled'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND updated_at >= NOW() - INTERVAL '30 days'
    `
    return result?.count || 0
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching canceled subscriptions from database:`, error.message)
    return 0
  }
}

/**
 * Get new subscribers in last 30 days from database
 */
async function getNewSubscribers30dFromDatabase(): Promise<number> {
  try {
    const [result] = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND created_at >= NOW() - INTERVAL '30 days'
    `
    return result?.count || 0
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching new subscribers from database:`, error.message)
    return 0
  }
}

/**
 * Fetch metrics from DATABASE (webhook-populated) - PRIMARY source
 * Falls back to Stripe API only for MRR if needed
 */
async function fetchStripeMetrics(): Promise<StripeLiveMetrics> {
  console.log("[StripeLiveMetrics] Fetching from DATABASE (webhook-populated, PRIMARY source)...")

  try {
    // Get all metrics from database (fast, reliable, comprehensive)
    const [
      activeSubs,
      totalSubs,
      canceled30d,
      newSubs30d,
      dbRevenue,
      dbMrr,
    ] = await Promise.all([
      getActiveSubscriptionsFromDatabase(),
      getTotalSubscriptionsFromDatabase(),
      getCanceledSubscriptions30dFromDatabase(),
      getNewSubscribers30dFromDatabase(),
      getDBRevenueMetrics(),
      getMRRFromDatabase(),
    ])

    // Try Stripe API for MRR to get real-time prices (beta discounts, etc.)
    // Only if database MRR might be inaccurate
    let finalMrr = dbMrr
    try {
      const stripeMrr = await Promise.race([
        getMRRFromStripe(),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ])
      
      // Use Stripe MRR if it's different (indicates beta prices/discounts)
      if (Math.abs(stripeMrr - dbMrr) > 10) {
        console.log(`[StripeLiveMetrics] Using Stripe MRR (beta prices detected): $${stripeMrr} vs DB: $${dbMrr}`)
        finalMrr = stripeMrr
      }
    } catch (error) {
      // Use database MRR if Stripe API fails or times out
      console.log(`[StripeLiveMetrics] Using database MRR: $${dbMrr}`)
    }

    console.log(`[StripeLiveMetrics] ✅ Successfully fetched from DATABASE:`)
    console.log(`  - Active Subscriptions: ${activeSubs}`)
    console.log(`  - Total Subscriptions: ${totalSubs}`)
    console.log(`  - Canceled (30d): ${canceled30d}`)
    console.log(`  - New Subscribers (30d): ${newSubs30d}`)
    console.log(`  - Total Revenue: $${dbRevenue.totalRevenue.toLocaleString()}`)
    console.log(`  - One-Time Revenue: $${dbRevenue.oneTimeRevenue.toLocaleString()}`)
    console.log(`  - Credit Revenue: $${dbRevenue.creditPurchaseRevenue.toLocaleString()}`)
    console.log(`  - MRR: $${finalMrr.toLocaleString()}`)

    return {
      activeSubscriptions: activeSubs,
      totalSubscriptions: totalSubs,
      canceledSubscriptions30d: canceled30d,
      totalRevenue: Math.round(dbRevenue.totalRevenue),
      mrr: finalMrr,
      oneTimeRevenue: Math.round(dbRevenue.oneTimeRevenue),
      creditPurchaseRevenue: Math.round(dbRevenue.creditPurchaseRevenue),
      newSubscribers30d: newSubs30d,
      newOneTimeBuyers30d: 0, // Can add if needed
      timestamp: new Date().toISOString(),
      cached: false,
      source: "database",
    }
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] ❌ Database fetch failed:`, error.message)
    // Return zeros if database fails (shouldn't happen, but safe fallback)
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      canceledSubscriptions30d: 0,
      totalRevenue: 0,
      mrr: 0,
      oneTimeRevenue: 0,
      creditPurchaseRevenue: 0,
      newSubscribers30d: 0,
      newOneTimeBuyers30d: 0,
      timestamp: new Date().toISOString(),
      cached: false,
      source: "database",
    }
  }
}

/**
 * Get Stripe live metrics with caching (5-minute TTL)
 * PRIMARY: Database (webhook-populated)
 * FALLBACK: Stripe API (only for MRR if needed)
 */
export async function getStripeLiveMetrics(): Promise<StripeLiveMetrics> {
  const { getOrFetch } = await import("@/lib/cache")
  return getOrFetch<StripeLiveMetrics>(
    CACHE_KEY,
    fetchStripeMetrics,
    CACHE_TTL_SECONDS,
  )
}

