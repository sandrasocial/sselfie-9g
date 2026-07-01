/**
 * Compatibility wrapper for older imports.
 *
 * Revenue truth now lives in `lib/revenue/single-source.ts`:
 * - active members + MRR come from live Stripe subscriptions
 * - MRR is net of discounts
 * - historical revenue comes from stripe_payments
 *
 * Do not reintroduce list-price DB MRR here. That was the source of the
 * "payments vs members" confusion.
 */

import { getSingleSourceRevenueMetrics } from "@/lib/revenue/single-source"

export interface StripeLiveMetrics {
  activeSubscriptions: number
  totalSubscriptions: number
  canceledSubscriptions30d: number
  totalRevenue: number
  mrr: number
  mrrByCurrency: Record<string, number>
  oneTimeRevenue: number
  creditPurchaseRevenue: number
  newSubscribers30d: number
  newOneTimeBuyers30d: number
  timestamp: string
  cached: boolean
  source: "stripe+db"
}

export async function getStripeLiveMetrics(): Promise<StripeLiveMetrics> {
  const metrics = await getSingleSourceRevenueMetrics()

  return {
    activeSubscriptions: metrics.activeSubscriptions,
    totalSubscriptions: metrics.totalSubscriptions,
    canceledSubscriptions30d: metrics.canceledSubscriptions30d,
    totalRevenue: metrics.totalRevenue,
    mrr: metrics.mrr,
    mrrByCurrency: metrics.mrrByCurrency,
    oneTimeRevenue: metrics.oneTimeRevenue,
    creditPurchaseRevenue: metrics.creditPurchaseRevenue,
    newSubscribers30d: metrics.newSubscribers30d,
    newOneTimeBuyers30d: 0,
    timestamp: metrics.timestamp,
    cached: metrics.cached,
    source: metrics.source,
  }
}
