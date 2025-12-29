/**
 * Centralized Pricing Configuration for SSELFIE
 * Single source of truth for all pricing, products, and credit packages
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export interface CreditPackage {
  id: string
  name: string
  displayName: string
  credits: number
  priceInCents: number
  description: string
  popular?: boolean
}

// ============================================================================
// PRICING PRODUCTS
// ============================================================================

export const PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "one_time_session",
    name: "One-Time SSELFIE Session",
    displayName: "Instagram Photoshoot",
    description: "Professional Instagram Photos in 2 Hours. No Photographer Needed.",
    priceInCents: 4900,
    type: "one_time_session",
    credits: 70,
    features: [
      "Your AI model trained on your photos",
      "One complete photoshoot session",
      "30-50 images in multiple styles",
      "Ready to post in 2 hours",
      "Download all in HD",
    ],
  },
  {
    id: "sselfie_studio_membership",
    name: "Content Creator Studio",
    displayName: "Content Creator Studio",
    description: "Stop Scrambling for Content Every Week. Unlimited Photos + Videos + Feed Planning.",
    priceInCents: 7900,
    type: "sselfie_studio_membership",
    credits: 150,
    popular: true,
    features: [
      "Unlimited professional photoshoots (fair use: 3-4/month)",
      "100+ images per month",
      "20 video clips per month",
      "9-post feed planner (saves 10 hours/month)",
      "Priority generation queue",
      "Cancel anytime",
    ],
  },
  {
    id: "brand_studio_membership",
    name: "Brand Studio",
    displayName: "Brand Studio",
    description: "Your Complete AI Content Team. Everything You Need to Run a Premium Brand.",
    priceInCents: 14900,
    type: "brand_studio_membership",
    credits: 300,
    features: [
      "Everything in Content Creator Studio",
      "200+ images per month",
      "40+ video clips per month",
      "Maya AI strategist (unlimited consulting)",
      "Personal brand academy (2 full courses)",
      "100+ Canva templates",
      "Monthly brand strategy drops",
      "Direct access to Sandra",
      "Priority support",
    ],
  },
]

// ============================================================================
// CREDIT PACKAGES
// ============================================================================

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

// ============================================================================
// CREDIT COSTS
// ============================================================================

export const CREDIT_COSTS = {
  TRAINING: 25,
  IMAGE: 1,
  ANIMATION: 3,
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}

export function getProductByType(type: PricingProduct["type"]): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.type === type)
}

export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`
}

export function getProductDisplayName(productId: string): string {
  const product = getProductById(productId)
  return product?.displayName || productId
}
