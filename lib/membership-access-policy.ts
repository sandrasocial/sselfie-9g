export type SubscriptionAccessState = {
  status?: string | null
  current_period_end?: Date | string | null
  cancel_at_period_end?: boolean | null
}

const CURRENT_ACCESS_STATUSES = new Set(["active", "trialing"])
const CURRENT_PERIOD_GRACE_STATUSES = new Set(["canceled", "cancelled", "past_due"])

/**
 * One membership-access policy for every SSELFIE surface.
 *
 * Stripe keeps cancel-at-period-end subscriptions active until their paid period closes,
 * so `active` remains accessible regardless of that flag. Canceled/cancelled and past-due
 * rows get the deliberately supported grace behavior only while current_period_end is future.
 */
export function hasSubscriptionAccess(
  subscription: SubscriptionAccessState | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!subscription?.status) return false

  if (CURRENT_ACCESS_STATUSES.has(subscription.status)) {
    return true
  }

  if (!CURRENT_PERIOD_GRACE_STATUSES.has(subscription.status)) {
    return false
  }

  if (!subscription.current_period_end) {
    return false
  }

  const periodEnd = new Date(subscription.current_period_end).getTime()
  return Number.isFinite(periodEnd) && periodEnd > now.getTime()
}
