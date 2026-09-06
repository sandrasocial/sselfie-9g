import { getStripe } from "@/lib/stripe"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"
import { CACHE_TTL, getCache, setCache } from "@/lib/cache"
import { calculateSubscriptionAmount, getSubscriptionCoupon, subscriptionMrrByCurrency } from "@/lib/revenue/subscription-amount"
import { getConfiguredMembershipPriceIds, isMembershipSubscription } from "@/lib/revenue/membership-subscription-filter"

export interface SingleSourceRevenueMetrics {
  /** Net MRR: what members actually pay after lifetime/forever coupons. */
  mrr: number
  /** Net MRR split by subscription currency, in major currency units. */
  mrrByCurrency: Record<string, number>
  /** What MRR would be at list price, before discounts. */
  grossMrr: number
  /** Gross MRR split by subscription currency, in major currency units. */
  grossMrrByCurrency: Record<string, number>
  /** Active members on a forever/lifetime percent-off coupon (e.g. BETA 50%). */
  discountedMembers: number
  activeSubscriptions: number
  totalSubscriptions: number
  canceledSubscriptions30d: number
  newSubscribers30d: number
  totalRevenue: number
  oneTimeRevenue: number
  creditPurchaseRevenue: number
  subscriptionRevenue: number
  timestamp: string
  cached: boolean
  source: "stripe+db"
}

const CACHE_KEY = "admin:revenue:single-source"

async function listAllSubscriptions(params: Record<string, any>) {
  const stripe = getStripe()
  const results: any[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      limit: 100,
      // Discounts must be expanded down to the coupon or newer Stripe API
      // versions return only IDs, which silently turns net MRR into gross MRR.
      expand: ["data.discounts.source.coupon"],
      ...params,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    results.push(...response.data)
    hasMore = response.has_more
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id
    }
  }

  return results
}

async function fetchSingleSourceMetrics(): Promise<SingleSourceRevenueMetrics> {
  const now = Date.now()
  const thirtyDaysAgo = Math.floor((now - 30 * 24 * 60 * 60 * 1000) / 1000)
  const configuredMembershipPriceIds = getConfiguredMembershipPriceIds()

  const [activeSubs, totalSubs, canceledSubs, newSubs, dbRevenue] = await Promise.all([
    listAllSubscriptions({ status: "active" }),
    listAllSubscriptions({ status: "all" }),
    listAllSubscriptions({ status: "canceled" }),
    listAllSubscriptions({ status: "all", created: { gte: thirtyDaysAgo } }),
    getDBRevenueMetrics(),
  ])

  const activeMembershipSubs = activeSubs.filter((sub) =>
    isMembershipSubscription(sub, configuredMembershipPriceIds),
  )
  const totalMembershipSubs = totalSubs.filter((sub) =>
    isMembershipSubscription(sub, configuredMembershipPriceIds),
  )
  const canceledMembershipSubs = canceledSubs.filter(
    (sub) =>
      isMembershipSubscription(sub, configuredMembershipPriceIds) &&
      sub.canceled_at &&
      sub.canceled_at >= thirtyDaysAgo,
  )
  const newMembershipSubs = newSubs.filter((sub) =>
    isMembershipSubscription(sub, configuredMembershipPriceIds),
  )

  const activeSubscriptions = activeMembershipSubs.length
  const totalSubscriptions = totalMembershipSubs.length
  const canceledSubscriptions30d = canceledMembershipSubs.length
  const newSubscribers30d = newMembershipSubs.length

  const mrr = Math.round(
    activeMembershipSubs.reduce((sum, sub) => sum + calculateSubscriptionAmount(sub), 0),
  )

  const mrrByCurrency = subscriptionMrrByCurrency(activeMembershipSubs)

  const grossMrr = Math.round(
    activeMembershipSubs.reduce((sum, sub) => {
      const item = sub.items?.data?.[0]
      const price = item?.price
      if (!price?.recurring) return sum
      const base = (Number(price.unit_amount || 0) * Number(item?.quantity || 1)) / 100
      return sum + (price.recurring.interval === "year" ? base / 12 : base)
    }, 0),
  )

  const grossMrrByCurrency = subscriptionMrrByCurrency(activeMembershipSubs, true)

  const discountedMembers = activeMembershipSubs.filter((sub) => {
    const coupon = getSubscriptionCoupon(sub)
    return Number(coupon?.percent_off || 0) > 0 || Number(coupon?.amount_off || 0) > 0
  }).length

  return {
    mrr,
    mrrByCurrency,
    grossMrr,
    grossMrrByCurrency,
    discountedMembers,
    activeSubscriptions,
    totalSubscriptions,
    canceledSubscriptions30d,
    newSubscribers30d,
    totalRevenue: Math.round(dbRevenue.totalRevenue),
    oneTimeRevenue: Math.round(dbRevenue.oneTimeRevenue),
    creditPurchaseRevenue: Math.round(dbRevenue.creditPurchaseRevenue),
    subscriptionRevenue: Math.round(dbRevenue.subscriptionRevenue),
    timestamp: new Date().toISOString(),
    cached: false,
    source: "stripe+db",
  }
}

/** Live read-only path for deterministic operator reports. Never reads or writes app cache. */
export async function getSingleSourceRevenueMetricsReadOnly(): Promise<SingleSourceRevenueMetrics> {
  return fetchSingleSourceMetrics()
}

export async function getSingleSourceRevenueMetrics(): Promise<SingleSourceRevenueMetrics> {
  const cached = await getCache<SingleSourceRevenueMetrics>(CACHE_KEY)
  if (cached) {
    return {
      ...cached,
      cached: true,
    }
  }

  const fresh = await fetchSingleSourceMetrics()
  await setCache(CACHE_KEY, fresh, CACHE_TTL.MEDIUM)
  return fresh
}
