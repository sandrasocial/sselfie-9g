export const SELFIE_VISIBILITY_BUNDLE_OPENS_AT = "2026-07-13T16:00:00.000Z"
export const SELFIE_VISIBILITY_BUNDLE_CLOSES_AT = "2026-07-15T16:00:00.000Z"
export const SELFIE_VISIBILITY_BUNDLE_PRICE_CENTS = 9700
export const SELFIE_VISIBILITY_BUNDLE_CURRENCY = "usd"

const STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS = 24 * 60 * 60
const STRIPE_CHECKOUT_MIN_LIFETIME_SECONDS = 30 * 60

export type SelfieVisibilityBundleOfferPhase = "upcoming" | "open" | "closed"

export function getSelfieVisibilityBundleOfferStatus(now: Date = new Date()) {
  const nowMs = now.getTime()
  const opensAtMs = Date.parse(SELFIE_VISIBILITY_BUNDLE_OPENS_AT)
  const closesAtMs = Date.parse(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT)
  const phase: SelfieVisibilityBundleOfferPhase =
    nowMs < opensAtMs ? "upcoming" : nowMs < closesAtMs ? "open" : "closed"

  return {
    phase,
    isOpen: phase === "open",
    opensAt: SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
    closesAt: SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
    priceInCents: SELFIE_VISIBILITY_BUNDLE_PRICE_CENTS,
    currency: SELFIE_VISIBILITY_BUNDLE_CURRENCY,
    millisecondsUntilOpen: Math.max(0, opensAtMs - nowMs),
    millisecondsUntilClose: Math.max(0, closesAtMs - nowMs),
  }
}

/**
 * Stripe requires a custom Checkout expiry to be 30 minutes to 24 hours after
 * creation. New sessions still stop exactly at the campaign close. A shopper
 * who starts during the final 30 minutes receives Stripe's minimum completion
 * window rather than hitting a broken checkout.
 */
export function getSelfieVisibilityBundleCheckoutExpiresAt(now: Date = new Date()): number {
  const status = getSelfieVisibilityBundleOfferStatus(now)
  if (!status.isOpen) {
    throw new Error(
      status.phase === "upcoming"
        ? "The One Selfie Visibility Bundle checkout is not open yet."
        : "The One Selfie Visibility Bundle checkout is closed."
    )
  }

  const nowSeconds = Math.floor(now.getTime() / 1000)
  const closesAtSeconds = Math.floor(Date.parse(SELFIE_VISIBILITY_BUNDLE_CLOSES_AT) / 1000)
  const earliestStripeExpiry = nowSeconds + STRIPE_CHECKOUT_MIN_LIFETIME_SECONDS
  const latestStripeExpiry = nowSeconds + STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS
  return Math.min(latestStripeExpiry, Math.max(earliestStripeExpiry, closesAtSeconds))
}
