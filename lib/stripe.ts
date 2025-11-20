import "server-only"

import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: "2024-11-20.acacia",
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
