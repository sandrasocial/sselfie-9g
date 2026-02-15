export function calculateSubscriptionAmount(subscription: any): number {
  const item = subscription.items?.data?.[0]
  const price = item?.price
  if (!price?.recurring) {
    return 0
  }

  const quantity = Number(item?.quantity || 1)
  const baseAmount = Number(price.unit_amount || 0) * (Number.isFinite(quantity) ? quantity : 1)
  const coupon = subscription?.discount?.coupon
  let discountedAmount = baseAmount

  if (coupon?.percent_off != null) {
    const percentOff = Number(coupon.percent_off)
    if (Number.isFinite(percentOff) && percentOff > 0) {
      discountedAmount = Math.max(0, Math.round(baseAmount * (1 - percentOff / 100)))
    }
  } else if (coupon?.amount_off != null) {
    const amountOff = Number(coupon.amount_off)
    if (Number.isFinite(amountOff) && amountOff > 0) {
      discountedAmount = Math.max(0, baseAmount - amountOff)
    }
  }

  const interval = price.recurring.interval

  if (interval === "month") {
    return discountedAmount / 100
  }
  if (interval === "year") {
    return discountedAmount / 100 / 12
  }
  if (interval === "week") {
    return (discountedAmount / 100) * 4.33
  }
  if (interval === "day") {
    return (discountedAmount / 100) * 30
  }
  return 0
}
