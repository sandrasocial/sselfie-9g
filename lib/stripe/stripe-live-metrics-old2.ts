/**
 * SIMPLIFIED Stripe Live Metrics
 * 
 * PRIMARY: Stripe API (real-time, accurate, source of truth)
 * FALLBACK: Database (only if Stripe API fails)
 * 
 * This is simpler and more reliable than the complex database-first approach.
 */

import { getStripe } from "@/lib/stripe"
import { getOrFetch, CACHE_TTL } from "@/lib/cache"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"

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
  source: "stripe" | "database" // Track data source
}

const CACHE_KEY = "stripe:live:metrics"
const CACHE_TTL_SECONDS = 300 // 5 minutes

/**
 * Get MRR from Stripe (real-time, includes beta prices, discounts, PRODUCTION only)
 */
async function getMRRFromStripe(): Promise<number> {
  const stripe = getStripe()
  let mrr = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
    })

    for (const sub of subscriptions.data) {
      // Only count production subscriptions (livemode = true)
      if (!sub.livemode) continue

      if (sub.items.data.length > 0) {
        const price = sub.items.data[0].price
        if (price.recurring) {
          // Calculate MRR based on billing interval
          const amount = price.unit_amount || 0
          if (price.recurring.interval === "month") {
            mrr += amount / 100
          } else if (price.recurring.interval === "year") {
            mrr += amount / 100 / 12
          } else if (price.recurring.interval === "week") {
            mrr += (amount / 100) * 4.33 // Approximate monthly
          } else if (price.recurring.interval === "day") {
            mrr += (amount / 100) * 30 // Approximate monthly
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
}

/**
 * Get active subscriptions count from Stripe (PRODUCTION only)
 */
async function getActiveSubscriptionsFromStripe(): Promise<number> {
  const stripe = getStripe()
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
    })

    // Only count production subscriptions (livemode = true)
    for (const sub of subscriptions.data) {
      if (sub.livemode) {
        count++
      }
    }

    hasMore = subscriptions.has_more
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }
  }

  return count
}

/**
 * Get total revenue from DATABASE (stripe_payments table)
 * Stripe API is too slow for all charges - database is faster and reliable
 */
async function getTotalRevenueFromStripe(): Promise<number> {
  // Use database - webhooks store all payments correctly
  try {
    const dbMetrics = await getDBRevenueMetrics()
    console.log(`[StripeLiveMetrics] Using DB for total revenue: $${dbMetrics.totalRevenue.toLocaleString()}`)
    return dbMetrics.totalRevenue
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB lookup failed for total revenue:`, error.message)
    return 0
  }
}

/**
 * Get one-time revenue from DATABASE (stripe_payments table)
 * Stripe API doesn't preserve metadata on Payment Intents, so database is source of truth
 */
async function getOneTimeRevenueFromStripe(): Promise<number> {
  // Use database - webhooks store product_type correctly
  try {
    const dbMetrics = await getDBRevenueMetrics()
    console.log(`[StripeLiveMetrics] Using DB for one-time revenue: $${dbMetrics.oneTimeRevenue.toLocaleString()}`)
    return dbMetrics.oneTimeRevenue
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB lookup failed for one-time revenue:`, error.message)
    return 0
  }
}

/**
 * Get credit purchase revenue from DATABASE (stripe_payments table)
 * Stripe API doesn't preserve metadata on Payment Intents, so database is source of truth
 */
async function getCreditPurchaseRevenueFromStripe(): Promise<number> {
  // Use database - webhooks store product_type correctly
  try {
    const dbMetrics = await getDBRevenueMetrics()
    console.log(`[StripeLiveMetrics] Using DB for credit revenue: $${dbMetrics.creditPurchaseRevenue.toLocaleString()}`)
    return dbMetrics.creditPurchaseRevenue
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB lookup failed for credit revenue:`, error.message)
    return 0
  }
}

/**
 * Get total subscriptions count (all statuses)
 */
async function getTotalSubscriptionsFromStripe(): Promise<number> {
  const stripe = getStripe()
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
    })

    count += subscriptions.data.length
    hasMore = subscriptions.has_more
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }
  }

  return count
}

/**
 * Get canceled subscriptions in last 30 days
 */
async function getCanceledSubscriptions30dFromStripe(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      status: "canceled",
    })

    for (const sub of subscriptions.data) {
      if (sub.canceled_at && sub.canceled_at >= thirtyDaysAgo) {
        count++
      } else if (sub.canceled_at && sub.canceled_at < thirtyDaysAgo) {
        // Optimize: stop early if we've passed the 30-day window
        hasMore = false
        break
      }
    }

    hasMore = subscriptions.has_more && hasMore
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }
  }

  return count
}

/**
 * Get new subscriptions created in last 30 days
 */
async function getNewSubscribers30dFromStripe(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      created: { gte: thirtyDaysAgo },
    })

    count += subscriptions.data.length
    hasMore = subscriptions.has_more
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }
  }

  return count
}

/**
 * Get new one-time buyers in last 30 days (OPTIMIZED - uses database)
 * Stripe API is too slow (requires individual invoice checks)
 */
async function getNewOneTimeBuyers30dFromStripe(): Promise<number> {
  // Use database - much faster than checking every charge's invoice
  try {
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)
    
    const [result] = await sql`
      SELECT COUNT(DISTINCT stripe_customer_id)::int as count
      FROM stripe_payments
      WHERE payment_type = 'one_time_session'
        AND status = 'succeeded'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND payment_date >= NOW() - INTERVAL '30 days'
    `
    
    return result?.count || 0
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB lookup failed for new one-time buyers:`, error.message)
    return 0
  }
}

/**
 * Fetch metrics from Stripe API (PRIMARY source)
 * Falls back to database only if Stripe API fails
 */
async function fetchStripeMetrics(): Promise<StripeLiveMetrics> {
  console.log("[StripeLiveMetrics] Fetching from Stripe API (PRIMARY source)...")

  try {
    // Optimized: Only fetch critical metrics from Stripe (MRR, subscriptions)
    // Use database for revenue (faster, reliable, already comprehensive)
    const [
      mrr,
      activeSubs,
      totalSubs,
      canceled30d,
      totalRevenue,
      oneTimeRevenue,
      creditRevenue,
      newSubs30d,
      newOneTime30d,
    ] = await Promise.all([
      getMRRFromStripe(), // Stripe API (needs real-time for beta prices)
      getActiveSubscriptionsFromStripe(), // Stripe API (needs real-time count)
      getTotalSubscriptionsFromStripe(), // Stripe API
      getCanceledSubscriptions30dFromStripe(), // Stripe API
      getTotalRevenueFromStripe(), // Database (fast, comprehensive)
      getOneTimeRevenueFromStripe(), // Database (fast, reliable)
      getCreditPurchaseRevenueFromStripe(), // Database (fast, reliable)
      getNewSubscribers30dFromStripe(), // Stripe API
      getNewOneTimeBuyers30dFromStripe(), // Stripe API
    ])

    console.log(`[StripeLiveMetrics] ✅ Successfully fetched from Stripe API:`)
    console.log(`  - MRR: $${mrr.toLocaleString()}`)
    console.log(`  - Active Subscriptions: ${activeSubs}`)
    console.log(`  - Total Subscriptions: ${totalSubs}`)
    console.log(`  - Canceled (30d): ${canceled30d}`)
    console.log(`  - Total Revenue: $${totalRevenue.toLocaleString()}`)
    console.log(`  - One-Time Revenue: $${oneTimeRevenue.toLocaleString()}`)
    console.log(`  - Credit Revenue: $${creditRevenue.toLocaleString()}`)
    console.log(`  - New Subscribers (30d): ${newSubs30d}`)
    console.log(`  - New One-Time Buyers (30d): ${newOneTime30d}`)

    return {
      activeSubscriptions: activeSubs,
      totalSubscriptions: totalSubs,
      canceledSubscriptions30d: canceled30d,
      totalRevenue: Math.round(totalRevenue),
      mrr,
      oneTimeRevenue: Math.round(oneTimeRevenue),
      creditPurchaseRevenue: Math.round(creditRevenue),
      newSubscribers30d: newSubs30d,
      newOneTimeBuyers30d: newOneTime30d,
      timestamp: new Date().toISOString(),
      cached: false,
      source: "stripe",
    }
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] ❌ Stripe API failed:`, error.message)
    console.log(`[StripeLiveMetrics] Falling back to database...`)

    // Fallback to database only if Stripe API fails
    try {
      const dbMetrics = await getDBRevenueMetrics()
      console.log(`[StripeLiveMetrics] Using database fallback:`)
      console.log(`  - Total Revenue: $${dbMetrics.totalRevenue.toLocaleString()}`)

      return {
        activeSubscriptions: 0, // Not available from DB revenue metrics
        totalSubscriptions: 0,
        canceledSubscriptions30d: 0,
        totalRevenue: Math.round(dbMetrics.totalRevenue),
        mrr: 0, // Not available from DB revenue metrics
        oneTimeRevenue: Math.round(dbMetrics.oneTimeRevenue),
        creditPurchaseRevenue: Math.round(dbMetrics.creditPurchaseRevenue),
        newSubscribers30d: 0,
        newOneTimeBuyers30d: 0,
        timestamp: new Date().toISOString(),
        cached: false,
        source: "database",
      }
    } catch (dbError: any) {
      console.error(`[StripeLiveMetrics] ❌ Database fallback also failed:`, dbError.message)
      // Return zeros if both fail
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
}

/**
 * Get Stripe live metrics with caching (5-minute TTL)
 * PRIMARY: Stripe API
 * FALLBACK: Database (only if Stripe fails)
 */
export async function getStripeLiveMetrics(): Promise<StripeLiveMetrics> {
  return getOrFetch<StripeLiveMetrics>(
    CACHE_KEY,
    fetchStripeMetrics,
    CACHE_TTL_SECONDS,
  )
}

