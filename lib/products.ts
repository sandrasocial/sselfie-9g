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
  type:
    | "one_time_session"
    | "sselfie_studio_membership"
    | "sselfie_studio_membership_annual"
    | "credit_topup"
    | "paid_blueprint"
    | "brand_strategy_pack"
    | "selfie_guide_bundle"
    | "selfie_guide"
    | "starter_kit"
    | "masterclass"
  features?: string[]
  credits?: number
  stripePriceId?: string
  popular?: boolean
  tag?: string
}

export interface AcademyProduct {
  id: "what_to_say" | "show_up" | "get_paid" | "ai_photo_prompts" | "editing_masterclass" | "branded_by_sselfie"
  name: string
  tagline: string
  price: number
  currency: "usd" | "eur"
  stripePriceId: string
  manychatKeyword: "SAY" | "CONTENT" | "PAID" | "PHOTOS" | "EDIT" | "BRAND"
  tag:
    | "bought_what_to_say"
    | "bought_show_up"
    | "bought_get_paid"
    | "bought_ai_photo_prompts"
    | "bought_editing_masterclass"
    | "bought_branded_by_sselfie"
  upsellTo: "show_up" | "get_paid" | "membership" | "what_to_say"
  description: string
}

// Credit top-up packages for existing members
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_topup_10",
    name: "10 Credits",
    displayName: "Starter Pack",
    credits: 10,
    priceInCents: 999, // $9.99
    description: "Perfect for testing 5 preview feeds",
  },
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
    priceInCents: 9700, // €97/month
    type: "sselfie_studio_membership",
    credits: 200,
    popular: true,
  },
  {
    id: "sselfie_studio_membership_annual",
    name: "Creator Studio — Annual",
    displayName: "Creator Studio (Annual)",
    description: "Your complete AI content team. Pay annually and save 2 months.",
    priceInCents: 97000, // €970/year (~€80.83/month — save €194 vs monthly)
    type: "sselfie_studio_membership_annual",
    credits: 200,
    popular: false,
  },
  {
    id: "paid_blueprint",
    name: "Brand Blueprint - Paid",
    displayName: "30-Day Visibility Reset",
    description: "A 30-day program to restore your consistent, recognizable presence — 60 credits to generate brand photos across the full month",
    priceInCents: 4700, // $47 one-time
    type: "paid_blueprint",
    credits: 60, // 30 images × 2 credits per image
  },
  {
    id: "brand_strategy_pack",
    name: "Brand Strategy Pack",
    displayName: "Brand Strategy Pack",
    description: "Get your personalized Brand Strategy Pack instantly.",
    priceInCents: 1900, // $19 one-time
    type: "brand_strategy_pack",
    tag: "bought_brand_strategy_pack",
  },
  {
    id: "starter_kit",
    name: "Selfie Starter Kit",
    displayName: "Selfie Starter Kit",
    description:
      "The guide, presets, quick-start, and 7-day content starter that help you turn one better selfie into your first brand-ready week.",
    priceInCents: 3700, // $37 one-time
    type: "starter_kit",
    tag: "bought_starter_kit",
    features: [
      "Selfie Guide access",
      "Preset download link",
      "Quick-start checklist for your next selfie",
      "7-day content starter",
      "What to post this week prompts",
    ],
  },
  {
    id: "masterclass",
    name: "Selfie Masterclass",
    displayName: "Selfie Masterclass",
    description:
      "Sandra's full method for visibility, offer clarity, content, and showing up with a system you can start selling from.",
    priceInCents: 14700, // $147 one-time
    type: "masterclass",
    tag: "bought_masterclass",
    features: [
      "Brand Strategy Pack included",
      "Full method walkthrough",
      "Module-based training access",
      "Income-ready visibility curriculum",
      "30-day content and offer implementation assets",
      "Academy entitlement unlock",
      "Next-step support toward Studio or 1:1",
    ],
  },
  {
    id: "selfie_guide_bundle",
    name: "Selfie Guide + Brand Strategy Bundle",
    displayName: "Selfie Guide + Brand Strategy Bundle",
    description: "Get the Selfie Guide and Brand Strategy Pack together at the bundle price.",
    priceInCents: 2700, // $27 one-time
    type: "selfie_guide_bundle",
    tag: "bought_selfie_guide_bundle",
    features: [
      "Full Selfie Guide access",
      "Personal Brand Strategy Pack unlocked",
      "Interactive checklists and 7-Day Selfie Challenge",
      "Lightroom preset pack bonus",
    ],
  },
  {
    id: "selfie_guide",
    name: "Selfie Guide",
    displayName: "Selfie Guide",
    description: "Take one selfie you feel confident enough to post.",
    priceInCents: 1700, // $17 one-time
    type: "selfie_guide",
    tag: "bought_selfie_guide",
    features: [
      "First-photo checklist",
      "Interactive checklists for every step",
      "7-Day Selfie Challenge",
      "One caption/post prompt",
      "Meet Maya - your AI branding assistant",
      "Lightroom preset pack bonus",
    ],
  },
]

export const ACADEMY_PRODUCTS = {
  what_to_say: {
    id: "what_to_say",
    name: "What To Say",
    tagline: "Find Your Message In One Hour",
    price: 1700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_WHAT_TO_SAY?.trim() || "",
    manychatKeyword: "SAY",
    tag: "bought_what_to_say",
    upsellTo: "show_up",
    description: "Stop staring at a blank screen. Know exactly what to post - starting today.",
  },
  show_up: {
    id: "show_up",
    name: "Show Up",
    tagline: "30 Days of Content That Gets You Noticed",
    price: 2700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_SHOW_UP?.trim() || "",
    manychatKeyword: "CONTENT",
    tag: "bought_show_up",
    upsellTo: "get_paid",
    description: "Have your entire month of content planned, written, and ready - by Sunday.",
  },
  get_paid: {
    id: "get_paid",
    name: "Get Paid",
    tagline: "Turn Your Visibility Into Your First 500 EUR Online",
    price: 4700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_GET_PAID?.trim() || "",
    manychatKeyword: "PAID",
    tag: "bought_get_paid",
    upsellTo: "membership",
    description: "You're showing up. Now let's make sure the right people notice - and pay you.",
  },
  ai_photo_prompts: {
    id: "ai_photo_prompts",
    name: "AI Photo Prompt Pack",
    tagline: "Turn Selfies Into Brand Photos — No Photographer Needed",
    price: 1700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_AI_PHOTO_PROMPTS?.trim() || "",
    manychatKeyword: "PHOTOS",
    tag: "bought_ai_photo_prompts",
    upsellTo: "what_to_say",
    description: "50 done-for-you AI prompts across 10 brand scenarios. Your phone is enough.",
  },
  editing_masterclass: {
    id: "editing_masterclass",
    name: "Editing Masterclass",
    tagline: "Professional Photo Editing — On Your Phone",
    price: 4700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_EDITING_MASTERCLASS?.trim() || "",
    manychatKeyword: "EDIT",
    tag: "bought_editing_masterclass",
    upsellTo: "what_to_say",
    description: "The exact editing workflow Sandra uses to turn selfies into professional brand photos.",
  },
  branded_by_sselfie: {
    id: "branded_by_sselfie",
    name: "Branded by SSELFIE",
    tagline: "Your Complete Personal Brand — Built in One Week",
    price: 39700,
    currency: "eur",
    stripePriceId: process.env.STRIPE_PRICE_BRANDED_BY_SSELFIE?.trim() || "",
    manychatKeyword: "BRAND",
    tag: "bought_branded_by_sselfie",
    upsellTo: "membership",
    description: "The complete brand system Sandra used to go from €12 to a live app. Done with you, not for you.",
  },
} as const satisfies Record<string, AcademyProduct>

export type AcademyProductId = keyof typeof ACADEMY_PRODUCTS

// ORIGINAL_PRICING removed - no longer needed with simplified 2-tier model

export function getProductById(productId: string): PricingProduct | undefined {
  return PRICING_PRODUCTS.find((p) => p.id === productId)
}

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}

export function formatPriceFromCents(priceInCents: number, decimals?: number) {
  const resolvedDecimals = decimals ?? (priceInCents % 100 === 0 ? 0 : 2)
  return `$${(priceInCents / 100).toFixed(resolvedDecimals)}`
}
