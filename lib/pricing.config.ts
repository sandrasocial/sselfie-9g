/**
 * Centralized Pricing Configuration for SSELFIE
 *
 * New simplified pricing model:
 * - One-Time SSELFIE Session: Single purchase for a professional AI photoshoot
 * - SSELFIE Studio Membership: Monthly recurring membership with full access
 * - Credit Top-Ups: Additional credits available for purchase
 */

export interface PricingProduct {
  id: string
  name: string
  displayName: string
  description: string
  priceInCents: number
  type: "one_time_session" | "sselfie_studio_membership" | "credit_topup"
  features?: string[]
  credits?: number
  stripePriceId?: string // To be configured in Stripe dashboard
  popular?: boolean
}

export const PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "one_time_session",
    name: "One-Time SSELFIE Session",
    displayName: "One-Time Session",
    description: "Try one professional AI photoshoot of you. No subscription, just a one-time session.",
    priceInCents: 4900, // $49
    type: "one_time_session",
    credits: 50, // Enough for training + generating photos
    features: [
      "One AI model training",
      "Generate up to 50 professional photos",
      "Access to all photo styles and settings",
      "Download high-resolution images",
      "Valid for 30 days",
    ],
  },
  {
    id: "sselfie_studio_membership",
    name: "SSELFIE Studio Membership",
    displayName: "Studio Membership",
    description: "Join the Studio for new photos, fresh tools, and monthly brand drops.",
    priceInCents: 9900, // $99/month
    type: "sselfie_studio_membership",
    credits: 250, // Monthly credit allocation
    popular: true,
    features: [
      "Unlimited AI model trainings",
      "250 credits per month",
      "Full Maya AI access",
      "Complete Academy courses",
      "Monthly brand drops and bonuses",
      "Feed Designer (unlimited)",
      "Priority support",
      "Early access to new features",
    ],
  },
]

export interface CreditPackage {
  id: string
  name: string
  displayName: string
  credits: number
  priceInCents: number
  description: string
  popular?: boolean
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_50",
    name: "50 Credits",
    displayName: "50 Credits",
    credits: 50,
    priceInCents: 1200, // $12
    description: "Perfect for a few extra photos",
  },
  {
    id: "credits_150",
    name: "150 Credits",
    displayName: "150 Credits",
    credits: 150,
    priceInCents: 3300, // $33
    description: "Great for regular use",
    popular: true,
  },
  {
    id: "credits_500",
    name: "500 Credits",
    displayName: "500 Credits",
    credits: 500,
    priceInCents: 10000, // $100
    description: "Best value for power users",
  },
]

export const CREDIT_COSTS = {
  TRAINING: 25, // AI model training
  IMAGE: 1, // Single image generation
  ANIMATION: 3, // Video/animation generation
} as const

// Helper functions
export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}

export function getProductByType(type: PricingProduct["type"]): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.type === type)
}

// Format price for display
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`
}

// Get product display name for UI
export function getProductDisplayName(productId: string): string {
  const product = getProductById(productId)
  return product?.displayName || productId
}
