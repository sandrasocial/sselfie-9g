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

// Credit top-up packages for existing members
export const CREDIT_TOPUP_PACKAGES: CreditPackage[] = [
  {
    id: "credits_topup_100",
    name: "100 Extra Credits",
    displayName: "100 Credits Top-Up",
    credits: 100,
    priceInCents: 4500, // $45
    description: "Perfect for busy months",
  },
  {
    id: "credits_topup_200",
    name: "200 Extra Credits",
    displayName: "200 Credits Top-Up",
    credits: 200,
    priceInCents: 8500, // $85
    description: "Best value for power users",
    popular: true,
  },
]

// Legacy export for backward compatibility
export const CREDIT_PACKAGES = CREDIT_TOPUP_PACKAGES

export const PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "one_time_session",
    name: "Starter Photoshoot",
    displayName: "Starter Photoshoot",
    description: "Professional brand photos in 2 hours. Test SSELFIE before committing.",
    priceInCents: 4900, // $49 one-time
    type: "one_time_session",
    credits: 50,
  },
  {
    id: "sselfie_studio_membership",
    name: "Creator Studio",
    displayName: "Creator Studio",
    description: "Your complete AI content team for less than one photoshoot.",
    priceInCents: 9700, // $97/month
    type: "sselfie_studio_membership",
    credits: 200, // ~100 Pro photos OR ~200 Classic photos per month
    popular: true,
  },
]

// ORIGINAL_PRICING removed - no longer needed with simplified 2-tier model

export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}
