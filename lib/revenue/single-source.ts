import { getStripe } from "@/lib/stripe"
import { getDBRevenueMetrics } from "@/lib/revenue/db-revenue-metrics"
import { CACHE_TTL, getCache, setCache } from "@/lib/cache"
import { calculateSubscriptionAmount } from "@/lib/revenue/subscription-amount"

export interface SingleSourceRevenueMetrics {
  mrr: number
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

  const [activeSubs, totalSubs, canceledSubs, newSubs, dbRevenue] = await Promise.all([
    listAllSubscriptions({ status: "active" }),
    listAllSubscriptions({ status: "all" }),
    listAllSubscriptions({ status: "canceled" }),
    listAllSubscriptions({ status: "all", created: { gte: thirtyDaysAgo } }),
    getDBRevenueMetrics(),
  ])

  const activeSubscriptions = activeSubs.filter((sub) => sub.livemode).length
  const totalSubscriptions = totalSubs.filter((sub) => sub.livemode).length
  const canceledSubscriptions30d = canceledSubs.filter(
    (sub) => sub.livemode && sub.canceled_at && sub.canceled_at >= thirtyDaysAgo,
  ).length
  const newSubscribers30d = newSubs.filter((sub) => sub.livemode).length

  const mrr = Math.round(
    activeSubs
      .filter((sub) => sub.livemode)
      .reduce((sum, sub) => sum + calculateSubscriptionAmount(sub), 0),
  )

  return {
    mrr,
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
