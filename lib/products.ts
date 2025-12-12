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
  type: "one_time_session" | "sselfie_studio_membership" | "brand_studio_membership" | "credit_topup"
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
    name: "Instagram Photoshoot",
    displayName: "Instagram Photoshoot",
    description: "Professional Instagram Photos in 2 Hours. No Photographer Needed.",
    priceInCents: 4900, // $49 one-time
    type: "one_time_session",
    credits: 70,
  },
  {
    id: "sselfie_studio_membership",
    name: "Content Creator Studio",
    displayName: "Content Creator Studio",
    description: "Stop Scrambling for Content Every Week. Unlimited Photos + Videos + Feed Planning.",
    priceInCents: 7900, // $79/month
    type: "sselfie_studio_membership",
    credits: 150, // 100+ images per month (fair use: 3-4 photoshoots/month)
    popular: true,
  },
  {
    id: "brand_studio_membership",
    name: "Brand Studio",
    displayName: "Brand Studio",
    description: "Your Complete AI Content Team. Everything You Need to Run a Premium Brand.",
    priceInCents: 14900, // $149/month
    type: "brand_studio_membership",
    credits: 300, // 200+ images per month (fair use: 6-8 photoshoots/month)
  },
]

export const ORIGINAL_PRICING = {
  one_time_session: {
    priceInCents: 4900, // $49
    credits: 70,
  },
  sselfie_studio_membership: {
    priceInCents: 7900, // $79/month
    credits: 150,
  },
  brand_studio_membership: {
    priceInCents: 14900, // $149/month
    credits: 300,
  },
} as const

export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}
