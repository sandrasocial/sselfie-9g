import "server-only"

import Stripe from "stripe"

let _stripe: Stripe | null = null

/** Dashboard / Vercel pastes sometimes include trailing newlines; Stripe rejects those. */
export function getStripeSecretKey(): string {
  return (process.env.STRIPE_SECRET_KEY ?? "").replace(/\r|\n|\t/g, "").trim()
}

export function getStripeWebhookSecret(): string {
  return (process.env.STRIPE_WEBHOOK_SECRET ?? "").replace(/\r|\n|\t/g, "").trim()
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = getStripeSecretKey()
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: "2026-01-28.clover",
    })
  }
  return _stripe
}

// Export for backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})
