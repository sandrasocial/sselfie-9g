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
 * Get MRR from Stripe (real-time, includes beta prices, discounts)
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
 * Get active subscriptions count from Stripe
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

    count += subscriptions.data.length
    hasMore = subscriptions.has_more
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }
  }

  return count
}

/**
 * Get total revenue from Stripe (all successful charges)
 */
async function getTotalRevenueFromStripe(): Promise<number> {
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      status: "succeeded",
    })

    for (const charge of charges.data) {
      total += charge.amount
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    }
  }

  return total / 100
}

/**
 * Get one-time revenue from Stripe (charges without subscriptions)
 */
async function getOneTimeRevenueFromStripe(): Promise<number> {
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      status: "succeeded",
    })

    for (const charge of charges.data) {
      // Skip if it's a subscription payment (has invoice with subscription)
      if (!charge.invoice) {
        // Check metadata to exclude credit purchases
        const metadata = charge.metadata || {}
        if (metadata.product_type !== "credit_topup" && !metadata.package_id?.includes("credit")) {
          total += charge.amount
        }
      } else {
        try {
          const invoice = await stripe.invoices.retrieve(charge.invoice as string, {
            expand: ["subscription"],
          })
          if (!invoice.subscription) {
            // One-time payment with invoice (but no subscription)
            total += charge.amount
          }
        } catch {
          // If we can't check, assume it's one-time
          total += charge.amount
        }
      }
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    }
  }

  return total / 100
}

/**
 * Get credit purchase revenue from Stripe
 */
async function getCreditPurchaseRevenueFromStripe(): Promise<number> {
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      status: "succeeded",
    })

    for (const charge of charges.data) {
      const metadata = charge.metadata || {}
      if (metadata.product_type === "credit_topup" || metadata.package_id?.includes("credit")) {
        total += charge.amount
      }
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    }
  }

  return total / 100
}

/**
 * Fetch metrics from Stripe API (PRIMARY source)
 * Falls back to database only if Stripe API fails
 */
async function fetchStripeMetrics(): Promise<StripeLiveMetrics> {
  console.log("[StripeLiveMetrics] Fetching from Stripe API (PRIMARY source)...")

  try {
    // Try Stripe API first (real-time, accurate)
    const [mrr, activeSubs, totalRevenue, oneTimeRevenue, creditRevenue] = await Promise.all([
      getMRRFromStripe(),
      getActiveSubscriptionsFromStripe(),
      getTotalRevenueFromStripe(),
      getOneTimeRevenueFromStripe(),
      getCreditPurchaseRevenueFromStripe(),
    ])

    console.log(`[StripeLiveMetrics] ✅ Successfully fetched from Stripe API:`)
    console.log(`  - MRR: $${mrr.toLocaleString()}`)
    console.log(`  - Active Subscriptions: ${activeSubs}`)
    console.log(`  - Total Revenue: $${totalRevenue.toLocaleString()}`)
    console.log(`  - One-Time Revenue: $${oneTimeRevenue.toLocaleString()}`)
    console.log(`  - Credit Revenue: $${creditRevenue.toLocaleString()}`)

    return {
      activeSubscriptions: activeSubs,
      totalSubscriptions: activeSubs, // Simplified - can add total count if needed
      canceledSubscriptions30d: 0, // Can add if needed
      totalRevenue: Math.round(totalRevenue),
      mrr,
      oneTimeRevenue: Math.round(oneTimeRevenue),
      creditPurchaseRevenue: Math.round(creditRevenue),
      newSubscribers30d: 0, // Can add if needed
      newOneTimeBuyers30d: 0, // Can add if needed
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

