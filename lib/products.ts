/**
 * Products Configuration
 * Part of the new simplified SSELFIE pricing model
 */

export interface CreditPackage {
  id: string
  name: string
  displayName?: string
  credits: number
  priceInCents: number
  description: string
  popular?: boolean
}

export interface PricingProduct {
  id: string
  name: string
  displayName: string
  description: string
  priceInCents: number
  type: "one_time_session" | "sselfie_studio_membership" | "credit_topup"
  features?: string[]
  credits?: number
  stripePriceId?: string
  popular?: boolean
}

// Re-export credit packages from the centralized location
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_50",
    name: "50 Credits",
    displayName: "50 Credits",
    credits: 50,
    priceInCents: 1200,
    description: "Perfect for a few extra photos",
  },
  {
    id: "credits_150",
    name: "150 Credits",
    displayName: "150 Credits",
    credits: 150,
    priceInCents: 3300,
    description: "Great for regular use",
    popular: true,
  },
  {
    id: "credits_500",
    name: "500 Credits",
    displayName: "500 Credits",
    credits: 500,
    priceInCents: 10000,
    description: "Best value for power users",
  },
]

export const PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "one_time_session",
    name: "One-Time SSELFIE Session",
    displayName: "One-Time Session",
    description: "Try one professional AI photoshoot. No subscription, just a one-time session.",
    priceInCents: 2450, // Beta price: $24.50 (50% off $49)
    type: "one_time_session",
    credits: 70,
  },
  {
    id: "sselfie_studio_membership",
    name: "SSELFIE Studio Membership",
    displayName: "Studio Membership",
    description: "Join the Studio for new photos, fresh tools, and monthly brand drops.",
    priceInCents: 4950, // Beta price: $49.50 (50% off $99)
    type: "sselfie_studio_membership",
    credits: 150,
    popular: true,
  },
]

export const ORIGINAL_PRICING = {
  one_time_session: {
    priceInCents: 4900, // Original $49
    credits: 70,
  },
  sselfie_studio_membership: {
    priceInCents: 9900, // Original $99
    credits: 150,
  },
} as const

export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}
