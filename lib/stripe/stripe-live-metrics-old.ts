import { getStripe } from "@/lib/stripe"
import { getOrFetch, CACHE_TTL } from "@/lib/cache"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"
import Stripe from "stripe"

export interface StripeLiveMetrics {
  activeSubscriptions: number
  totalSubscriptions: number // All subscriptions (all statuses)
  canceledSubscriptions30d: number
  totalRevenue: number // All-time total revenue
  mrr: number // Monthly Recurring Revenue
  oneTimeRevenue: number // Non-recurring charges (starter photoshoots)
  creditPurchaseRevenue: number // Revenue from credit top-ups
  newSubscribers30d: number // New subscriptions created in last 30 days
  newOneTimeBuyers30d: number // New one-time purchases in last 30 days
  timestamp: string
  cached: boolean
}

const CACHE_KEY = "stripe:live:metrics"
const CACHE_TTL_SECONDS = 300 // 5 minutes

/**
 * Get active subscriptions count from Stripe
 * Real-time data - gets ALL active subscriptions
 */
async function getActiveSubscriptionsCount(): Promise<number> {
  const stripe = getStripe()
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  try {
    // Get ALL active subscriptions (no limit for complete data)
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

    console.log(`[StripeLiveMetrics] Found ${count} active subscriptions`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching active subscriptions:`, error.message)
    return 0
  }

  return count
}

/**
 * Get total subscriptions count (all statuses) from Stripe
 * Real-time data - gets ALL subscriptions regardless of status
 */
async function getTotalSubscriptionsCount(): Promise<number> {
  const stripe = getStripe()
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  try {
    // Get ALL subscriptions (no limit for complete data)
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

    console.log(`[StripeLiveMetrics] Found ${count} total subscriptions (all statuses)`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching total subscriptions:`, error.message)
    return 0
  }

  return count
}

/**
 * Get canceled subscriptions count in last 30 days
 * Filters by canceled_at timestamp, not created_at
 */
async function getCanceledSubscriptions30d(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      status: "canceled",
      limit: 100,
      starting_after: startingAfter,
    })

    // Filter by canceled_at timestamp (not created_at)
    // Stripe API doesn't support filtering by canceled_at directly, so we filter client-side
    for (const subscription of subscriptions.data) {
      if (subscription.canceled_at && subscription.canceled_at >= thirtyDaysAgo) {
        count++
      }
    }

    hasMore = subscriptions.has_more
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id
    }

    // Optimization: if we've gone past 30 days in the list, we can stop
    // (subscriptions are returned in reverse chronological order by default)
    if (subscriptions.data.length > 0) {
      const oldestCanceledAt = subscriptions.data[subscriptions.data.length - 1].canceled_at
      if (oldestCanceledAt && oldestCanceledAt < thirtyDaysAgo) {
        break
      }
    }
  }

  console.log(`[StripeLiveMetrics] Found ${count} canceled subscriptions in last 30 days`)
  return count
}

/**
 * Calculate MRR from active subscriptions
 * Real-time data - includes ALL active subscriptions with actual prices
 * Automatically reflects cancellations (only active subscriptions included)
 * Automatically reflects new subscriptions (all active subscriptions included)
 * Includes ALL products from Stripe (not just predefined ones)
 */
async function calculateMRR(): Promise<number> {
  const stripe = getStripe()
  let mrr = 0
  let hasMore = true
  let startingAfter: string | undefined
  let subscriptionCount = 0

  try {
    // Get ALL active subscriptions (no limit for complete data)
    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.items.data.price"],
      })

      for (const subscription of subscriptions.data) {
        subscriptionCount++
        
        // Sum up all recurring items (includes ALL products, not just predefined ones)
        for (const item of subscription.items.data) {
          if (item.price?.recurring) {
            const amount = item.price.unit_amount || 0
            const interval = item.price.recurring.interval

            // Include ALL recurring subscriptions regardless of product type
            if (interval === "month") {
              mrr += amount / 100 // Convert cents to dollars
            } else if (interval === "year") {
              mrr += amount / 100 / 12 // Convert annual to monthly
            } else if (interval === "week") {
              mrr += (amount / 100) * 4.33 // Convert weekly to monthly (avg weeks per month)
            } else if (interval === "day") {
              mrr += (amount / 100) * 30 // Convert daily to monthly
            }
          }
        }
      }

      hasMore = subscriptions.has_more
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id
      }
    }

    console.log(`[StripeLiveMetrics] Calculated MRR: $${Math.round(mrr).toLocaleString()} from ${subscriptionCount} active subscriptions`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error calculating MRR:`, error.message)
    return 0
  }

  return Math.round(mrr)
}

/**
 * Get total revenue (all-time) from ALL payments
 * PRIMARY: Uses database (fast, reliable, updated by webhooks)
 * FALLBACK: Query Stripe API if database doesn't have data yet
 */
async function getTotalRevenue(): Promise<number> {
  // Try database first (fast, reliable)
  try {
    const dbMetrics = await getDBRevenueMetrics()
    if (dbMetrics.totalRevenue > 0) {
      console.log(`[StripeLiveMetrics] Using DB for total revenue: $${dbMetrics.totalRevenue.toLocaleString()}`)
      return dbMetrics.totalRevenue
    }
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB revenue lookup failed, falling back to Stripe API:`, error.message)
  }

  // Fallback to Stripe API (for historical data or if webhook hasn't fired yet)
  console.log(`[StripeLiveMetrics] Falling back to Stripe API for total revenue...`)
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined

  try {
    // Get ALL successful charges (no limit for complete data)
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

    console.log(`[StripeLiveMetrics] Total revenue (from Stripe API): $${(total / 100).toLocaleString()}`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching total revenue:`, error.message)
    return 0
  }

  return total / 100 // Convert cents to dollars
}

/**
 * Get one-time revenue (non-recurring charges, excluding credit purchases)
 * PRIMARY: Uses database (fast, reliable, updated by webhooks)
 * FALLBACK: Query Stripe API if database doesn't have payment amounts yet
 */
async function getOneTimeRevenue(): Promise<number> {
  // Try database first (fast, reliable)
  try {
    const dbMetrics = await getDBRevenueMetrics()
    if (dbMetrics.oneTimeRevenue > 0) {
      console.log(`[StripeLiveMetrics] Using DB for one-time revenue: $${dbMetrics.oneTimeRevenue.toLocaleString()}`)
      return dbMetrics.oneTimeRevenue
    }
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB revenue lookup failed, falling back to Stripe API:`, error.message)
  }

  // Fallback to Stripe API (for historical data or if webhook hasn't fired yet)
  console.log(`[StripeLiveMetrics] Falling back to Stripe API for one-time revenue...`)
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined
  let checkedCount = 0

  try {
    // Query payment intents directly (more reliable for identifying payment types)
    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        starting_after: startingAfter,
      })

      for (const pi of paymentIntents.data) {
        checkedCount++
        
        // Skip if not succeeded
        if (pi.status !== "succeeded") {
          continue
        }

        // Check if this is a credit purchase (skip if so)
        const metadata = pi.metadata || {}
        const isCreditPurchase = 
          metadata.product_type === "credit_topup" || 
          metadata.package_id?.startsWith("credits") ||
          metadata.package_id?.includes("credit") ||
          (pi.description && pi.description.toLowerCase().includes("credit"))

        if (isCreditPurchase) {
          continue // Skip credit purchases
        }

        // Check if this payment intent is for a subscription (has subscription metadata or invoice)
        // One-time payments won't have subscription-related metadata
        const isSubscription = 
          metadata.product_type === "sselfie_studio_membership" ||
          pi.invoice !== null // If it has an invoice, it might be a subscription

        if (isSubscription && pi.invoice) {
          // Double-check the invoice to see if it's actually a subscription
          try {
            const invoice = await stripe.invoices.retrieve(pi.invoice as string, {
              expand: ["subscription"],
            })
            if (invoice.subscription) {
              continue // Skip subscription payments
            }
          } catch {
            // If we can't retrieve invoice, assume it's one-time to be safe
          }
        }

        // If we get here, it's a one-time payment
        // Get the actual charge amount
        if (pi.latest_charge) {
          try {
            const charge = typeof pi.latest_charge === 'string'
              ? await stripe.charges.retrieve(pi.latest_charge)
              : pi.latest_charge
            
            if (charge.status === "succeeded") {
              total += charge.amount
            }
          } catch (err) {
            // If charge retrieval fails, use payment intent amount as fallback
            if (pi.amount) {
              total += pi.amount
            }
          }
        } else if (pi.amount) {
          // Fallback to payment intent amount if no charge yet
          total += pi.amount
        }
      }

      hasMore = paymentIntents.has_more
      if (paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id
      }
    }

    console.log(`[StripeLiveMetrics] One-time revenue: $${(total / 100).toLocaleString()} (checked ${checkedCount} payment intents)`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching one-time revenue:`, error.message)
    return 0
  }

  return total / 100 // Convert cents to dollars
}

/**
 * Get credit purchase revenue (all-time)
 * PRIMARY: Uses database (fast, reliable, updated by webhooks)
 * FALLBACK: Query Stripe API if database doesn't have payment amounts yet
 */
async function getCreditPurchaseRevenue(): Promise<number> {
  // Try database first (fast, reliable)
  try {
    const dbMetrics = await getDBRevenueMetrics()
    if (dbMetrics.creditPurchaseRevenue > 0) {
      console.log(`[StripeLiveMetrics] Using DB for credit purchases: $${dbMetrics.creditPurchaseRevenue.toLocaleString()}`)
      return dbMetrics.creditPurchaseRevenue
    }
  } catch (error: any) {
    console.warn(`[StripeLiveMetrics] DB revenue lookup failed, falling back to Stripe API:`, error.message)
  }

  // Fallback to Stripe API (for historical data or if webhook hasn't fired yet)
  console.log(`[StripeLiveMetrics] Falling back to Stripe API for credit purchases...`)
  const stripe = getStripe()
  let total = 0
  let hasMore = true
  let startingAfter: string | undefined
  let checkedCount = 0

  try {
    // Query payment intents directly (metadata is more reliable here)
    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        starting_after: startingAfter,
      })

      for (const pi of paymentIntents.data) {
        checkedCount++
        
        // Check payment intent metadata for credit purchases
        const metadata = pi.metadata || {}
        const isCreditPurchase = 
          metadata.product_type === "credit_topup" || 
          metadata.package_id?.startsWith("credits") ||
          metadata.package_id?.includes("credit") ||
          (pi.description && pi.description.toLowerCase().includes("credit"))

        if (isCreditPurchase && pi.status === "succeeded") {
          // Get the actual charge amount from the latest charge
          if (pi.latest_charge) {
            try {
              const charge = typeof pi.latest_charge === 'string'
                ? await stripe.charges.retrieve(pi.latest_charge)
                : pi.latest_charge
              
              if (charge.status === "succeeded") {
                total += charge.amount
              }
            } catch (err) {
              // If charge retrieval fails, use payment intent amount as fallback
              if (pi.amount) {
                total += pi.amount
              }
            }
          } else if (pi.amount) {
            // Fallback to payment intent amount if no charge yet
            total += pi.amount
          }
        }
      }

      hasMore = paymentIntents.has_more
      if (paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id
      }
    }

    console.log(`[StripeLiveMetrics] Found $${(total / 100).toLocaleString()} in credit purchase revenue (checked ${checkedCount} payment intents)`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching credit purchase revenue:`, error.message)
    // Return 0 on error rather than failing
    return 0
  }

  return total / 100 // Convert cents to dollars
}

/**
 * Get new subscriptions created in last 30 days
 * Real-time data - includes ALL products from Stripe
 */
async function getNewSubscribers30d(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  try {
    // Get ALL subscriptions created in last 30 days (includes all products)
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

    console.log(`[StripeLiveMetrics] Found ${count} new subscriptions in last 30 days (all products)`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching new subscribers:`, error.message)
    return 0
  }

  return count
}

/**
 * Get new one-time buyers in last 30 days
 * Counts unique customers who made one-time purchases (not subscriptions)
 * Optimized: Only counts charges without invoices (fast approximation)
 * Note: This may slightly overcount if some one-time purchases have invoices,
 * but it's much faster than checking every invoice
 */
async function getNewOneTimeBuyers30d(): Promise<number> {
  const stripe = getStripe()
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  const uniqueCustomers = new Set<string>()
  let hasMore = true
  let startingAfter: string | undefined

  try {
    // Get ALL charges from last 30 days (no limit for complete data)
    while (hasMore) {
      const charges = await stripe.charges.list({
        limit: 100,
        starting_after: startingAfter,
        status: "succeeded",
        created: { gte: thirtyDaysAgo },
      })

      for (const charge of charges.data) {
        // Skip credit purchases (they're tracked separately)
        if (charge.metadata?.product_type === "credit_topup" || 
            charge.metadata?.package_id?.startsWith("credits")) {
          continue
        }

        // If charge has no invoice, it's likely one-time
        // If it has an invoice, check if invoice has subscription
        if (!charge.invoice && charge.customer) {
          uniqueCustomers.add(charge.customer as string)
        } else if (charge.invoice && charge.customer) {
          try {
            const invoice = await stripe.invoices.retrieve(charge.invoice as string, {
              expand: ["subscription"],
            })
            if (!invoice.subscription) {
              uniqueCustomers.add(charge.customer as string)
            }
          } catch {
            // If we can't retrieve invoice, assume it's one-time
            uniqueCustomers.add(charge.customer as string)
          }
        }
      }

      hasMore = charges.has_more
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id
      }
    }

    console.log(`[StripeLiveMetrics] Found ${uniqueCustomers.size} new one-time buyers in last 30 days (all products)`)
  } catch (error: any) {
    console.error(`[StripeLiveMetrics] Error fetching new one-time buyers:`, error.message)
    return 0
  }

  return uniqueCustomers.size
}

/**
 * Helper to add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`[StripeLiveMetrics] Function timed out after ${timeoutMs}ms, using default value`)
        resolve(defaultValue)
      }, timeoutMs)
    }),
  ])
}

/**
 * Fetch fresh Stripe metrics (no cache)
 * Uses Promise.allSettled to prevent one slow metric from blocking others
 * Each function has individual timeout protection
 * All functions fetch complete data (no iteration limits)
 */
async function fetchStripeMetrics(): Promise<StripeLiveMetrics> {
  console.log("[StripeLiveMetrics] Fetching fresh metrics from Stripe API (real-time, all data)...")

  const results = await Promise.allSettled([
    withTimeout(getActiveSubscriptionsCount(), 15000, 0),
    withTimeout(getTotalSubscriptionsCount(), 15000, 0),
    withTimeout(getCanceledSubscriptions30d(), 10000, 0),
    withTimeout(calculateMRR(), 20000, 0), // MRR needs more time (checks all subscriptions)
    withTimeout(getTotalRevenue(), 30000, 0), // Total revenue needs most time (all charges)
    withTimeout(getOneTimeRevenue(), 25000, 0),
    withTimeout(getCreditPurchaseRevenue(), 25000, 0), // Credit purchases need time (all charges)
    withTimeout(getNewSubscribers30d(), 10000, 0),
    withTimeout(getNewOneTimeBuyers30d(), 20000, 0),
  ])

  // Extract results with fallbacks
  const activeSubscriptions = results[0].status === "fulfilled" ? results[0].value : 0
  const totalSubscriptions = results[1].status === "fulfilled" ? results[1].value : 0
  const canceledSubscriptions30d = results[2].status === "fulfilled" ? results[2].value : 0
  const mrr = results[3].status === "fulfilled" ? results[3].value : 0
  const totalRevenue = results[4].status === "fulfilled" ? results[4].value : 0
  const oneTimeRevenue = results[5].status === "fulfilled" ? results[5].value : 0
  const creditPurchaseRevenue = results[6].status === "fulfilled" ? results[6].value : 0
  const newSubscribers30d = results[7].status === "fulfilled" ? results[7].value : 0
  const newOneTimeBuyers30d = results[8].status === "fulfilled" ? results[8].value : 0

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const metricNames = [
        "activeSubscriptions",
        "totalSubscriptions",
        "canceledSubscriptions30d",
        "mrr",
        "totalRevenue",
        "oneTimeRevenue",
        "creditPurchaseRevenue",
        "newSubscribers30d",
        "newOneTimeBuyers30d",
      ]
      console.error(
        `[StripeLiveMetrics] Failed to fetch ${metricNames[index]}:`,
        result.reason
      )
    }
  })

  return {
    activeSubscriptions,
    totalSubscriptions,
    canceledSubscriptions30d,
    totalRevenue: Math.round(totalRevenue),
    mrr,
    oneTimeRevenue: Math.round(oneTimeRevenue),
    creditPurchaseRevenue: Math.round(creditPurchaseRevenue),
    newSubscribers30d,
    newOneTimeBuyers30d,
    timestamp: new Date().toISOString(),
    cached: false,
  }
}

/**
 * Get Stripe live metrics with caching (5-minute TTL)
 */
export async function getStripeLiveMetrics(): Promise<StripeLiveMetrics> {
  return getOrFetch<StripeLiveMetrics>(
    CACHE_KEY,
    fetchStripeMetrics,
    CACHE_TTL_SECONDS,
  )
}

/**
 * Get Stripe live metrics without cache (force refresh)
 */
export async function getStripeLiveMetricsFresh(): Promise<StripeLiveMetrics> {
  return fetchStripeMetrics()
}

