import type { CashComparison, ComparisonWindows } from "./weekly-pack"

export type LedgerPayment = {
  paymentId: string
  invoiceId: string | null
  product: string
  currency: string
  amountMinor: number
  paidAt: string
  utmCampaign: string | null
}

export type LiveChargeTruth = {
  chargeId: string
  paymentIntentId: string | null
  invoiceIds: string[]
  currency: string
  grossMinor: number
  refunds: Array<{ refundId: string; amountMinor: number; createdAt: string }>
  createdAt: string
  livemode: boolean
  paid: boolean
  status: string
}

export type CashReconciliation = {
  cash: CashComparison[]
  campaignPayments: Record<string, { current: number; previous: number }>
  netPaymentIdsByCampaign: Record<string, string[]>
  unmatchedLedgerPayments: number
  unmatchedLiveCharges: number
  duplicateLedgerPayments: number
  unknownCurrencies: number
}

function within(value: string, start: string, end: string): boolean {
  const time = new Date(value).getTime()
  return time >= new Date(start).getTime() && time < new Date(end).getTime()
}

export function reconcileCash(
  ledger: LedgerPayment[],
  liveCharges: LiveChargeTruth[],
  windows: ComparisonWindows
): CashReconciliation {
  const keyToCharge = new Map<string, LiveChargeTruth>()
  for (const charge of liveCharges) {
    keyToCharge.set(charge.chargeId, charge)
    if (charge.paymentIntentId) keyToCharge.set(charge.paymentIntentId, charge)
    for (const invoiceId of charge.invoiceIds) keyToCharge.set(invoiceId, charge)
  }

  const groups = new Map<string, CashComparison>()
  const campaignPayments: CashReconciliation["campaignPayments"] = {}
  const netPaymentIdsByCampaign: CashReconciliation["netPaymentIdsByCampaign"] = {}
  const matchedChargeIds = new Set<string>()
  let unmatchedLedgerPayments = 0
  let duplicateLedgerPayments = 0
  let unknownCurrencies = 0

  for (const payment of ledger) {
    const charge = keyToCharge.get(payment.paymentId) || (payment.invoiceId ? keyToCharge.get(payment.invoiceId) : null)
    if (!charge || !charge.livemode || !charge.paid || charge.status !== "succeeded") {
      unmatchedLedgerPayments += 1
      continue
    }
    if (matchedChargeIds.has(charge.chargeId)) {
      duplicateLedgerPayments += 1
      continue
    }
    matchedChargeIds.add(charge.chargeId)

    const currency = charge.currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency) || currency === "UNKNOWN") {
      unknownCurrencies += 1
      continue
    }
    const product = payment.product
    const groupKey = `${currency}\u0000${product}`
    const row = groups.get(groupKey) || {
      product,
      currency,
      currentPayments: 0,
      currentGrossMinor: 0,
      currentRefundedMinor: 0,
      currentNetMinor: 0,
      previousPayments: 0,
      previousGrossMinor: 0,
      previousRefundedMinor: 0,
      previousNetMinor: 0,
    }
    const gross = Math.max(0, charge.grossMinor)
    const chargeBucket = within(charge.createdAt, windows.current.start, windows.current.end)
      ? "current"
      : within(charge.createdAt, windows.previous.start, windows.previous.end)
        ? "previous"
        : null
    const currentRefunds = charge.refunds
      .filter(refund => within(refund.createdAt, windows.current.start, windows.current.end))
      .reduce((sum, refund) => sum + Math.max(0, refund.amountMinor), 0)
    const previousRefunds = charge.refunds
      .filter(refund => within(refund.createdAt, windows.previous.start, windows.previous.end))
      .reduce((sum, refund) => sum + Math.max(0, refund.amountMinor), 0)

    if (chargeBucket === "current") row.currentGrossMinor += gross
    if (chargeBucket === "previous") row.previousGrossMinor += gross
    row.currentRefundedMinor += currentRefunds
    row.previousRefundedMinor += previousRefunds
    row.currentNetMinor = row.currentGrossMinor - row.currentRefundedMinor
    row.previousNetMinor = row.previousGrossMinor - row.previousRefundedMinor

    const refundedThroughCurrentEnd = charge.refunds
      .filter(refund => new Date(refund.createdAt).getTime() < new Date(windows.current.end).getTime())
      .reduce((sum, refund) => sum + Math.max(0, refund.amountMinor), 0)
    const refundedThroughPreviousEnd = charge.refunds
      .filter(refund => new Date(refund.createdAt).getTime() < new Date(windows.previous.end).getTime())
      .reduce((sum, refund) => sum + Math.max(0, refund.amountMinor), 0)
    const currentQualifies = chargeBucket === "current" && gross - refundedThroughCurrentEnd > 0
    const previousQualifies = chargeBucket === "previous" && gross - refundedThroughPreviousEnd > 0
    if (currentQualifies) row.currentPayments += 1
    if (previousQualifies) row.previousPayments += 1
    if (chargeBucket || currentRefunds || previousRefunds) {
      groups.set(groupKey, row)
    }

    const campaign = payment.utmCampaign?.trim()
    if (campaign && (currentQualifies || previousQualifies)) {
      const counts = campaignPayments[campaign] || { current: 0, previous: 0 }
      if (currentQualifies) counts.current += 1
      if (previousQualifies) counts.previous += 1
      campaignPayments[campaign] = counts
      if (currentQualifies) {
        netPaymentIdsByCampaign[campaign] = [...(netPaymentIdsByCampaign[campaign] || []), payment.paymentId]
      }
    }
  }

  const liveWindowCharges = liveCharges.filter(charge =>
    charge.livemode &&
    charge.paid &&
    charge.status === "succeeded" &&
    (
      within(charge.createdAt, windows.current.start, windows.current.end) ||
      within(charge.createdAt, windows.previous.start, windows.previous.end) ||
      charge.refunds.some(refund =>
        within(refund.createdAt, windows.current.start, windows.current.end) ||
        within(refund.createdAt, windows.previous.start, windows.previous.end)
      )
    )
  )
  const unmatchedLiveCharges = liveWindowCharges.filter(charge => !matchedChargeIds.has(charge.chargeId)).length

  return {
    cash: [...groups.values()].sort(
      (a, b) => a.currency.localeCompare(b.currency) || a.product.localeCompare(b.product)
    ),
    campaignPayments,
    netPaymentIdsByCampaign,
    unmatchedLedgerPayments,
    unmatchedLiveCharges,
    duplicateLedgerPayments,
    unknownCurrencies,
  }
}
