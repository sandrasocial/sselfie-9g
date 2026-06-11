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

export type PricingProductId =
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
  | "visibility_suite"
  | "academy_mini_product"
  | "prompt_vault"
  | "selfie_to_brand_shoot_system"

export type ProductLifecycleStatus = "live" | "archived" | "legacy_access_only"

export interface PricingProduct {
  id: PricingProductId
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
    | "visibility_suite"
    | "academy_mini_product"
    | "prompt_vault"
    | "selfie_to_brand_shoot_system"
  lifecycleStatus?: ProductLifecycleStatus
  features?: string[]
  credits?: number
  stripePriceId?: string
  popular?: boolean
  tag?: string
}

export type ProductRevenuePath = {
  lifecycleStatus: ProductLifecycleStatus
  checkoutPath: string
  fulfillmentRule: string
  successNextAction: string
  lifecycleEmailEntryPoint: string
}

export interface AcademyProduct {
  id:
    | "what_to_say"
    | "show_up"
    | "get_paid"
    | "visibility_suite"
    | "concept_cards_pack"
    | "caption_sprint"
    | "feed_reset_9grid"
    | "ai_photo_refresh"
    | "ai_photo_prompts"
    | "editing_masterclass"
    | "branded_by_sselfie"
  name: string
  tagline: string
  price: number
  currency: "usd" | "eur"
  stripePriceId: string
  manychatKeyword: "SAY" | "CONTENT" | "PAID" | "SUITE" | "PHOTOS" | "EDIT" | "BRAND"
  tag:
    | "bought_what_to_say"
    | "bought_show_up"
    | "bought_get_paid"
    | "bought_visibility_suite"
    | "bought_concept_cards_pack"
    | "bought_caption_sprint"
    | "bought_feed_reset_9grid"
    | "bought_ai_photo_refresh"
    | "bought_ai_photo_prompts"
    | "bought_editing_masterclass"
    | "bought_branded_by_sselfie"
  upsellTo: "show_up" | "get_paid" | "membership" | "what_to_say" | "visibility_suite" | "feed_reset_9grid"
  description: string
}

export const VISIBILITY_TO_PAID_STRIPE_PRICE_IDS = {
  whatToSay: "price_1TRsh9EVJvME7vkw8csaOr3H",
  showUp: "price_1TRshAEVJvME7vkwagNIvBiz",
  getPaid: "price_1TRshBEVJvME7vkwsUhzqtBY",
  suiteLaunch: "price_1TRshJEVJvME7vkwK55rwjA0",
  suiteStandard: "price_1TRshKEVJvME7vkwdzk3B1mA",
  conceptCardsPack: process.env.STRIPE_PRICE_CONCEPT_CARDS_PACK?.trim() || "",
  captionSprint: process.env.STRIPE_PRICE_CAPTION_SPRINT?.trim() || "",
  feedReset9Grid: process.env.STRIPE_PRICE_FEED_RESET_9GRID?.trim() || "",
  aiPhotoRefresh: process.env.STRIPE_PRICE_AI_PHOTO_REFRESH?.trim() || "",
} as const

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

export const LIVE_PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "sselfie_studio_membership",
    name: "Creator Studio",
    displayName: "Creator Studio",
    description: "Maya helps you plan, create, caption, and show up every week.",
    priceInCents: 9700, // €97/month
    type: "sselfie_studio_membership",
    credits: 200,
    popular: true,
  },
  {
    id: "sselfie_studio_membership_annual",
    name: "Creator Studio — Annual",
    displayName: "Creator Studio (Annual)",
    description: "Maya helps you run the SSELFIE method every week. Pay annually and save 2 months.",
    priceInCents: 97000, // €970/year (~€80.83/month — save €194 vs monthly)
    type: "sselfie_studio_membership_annual",
    credits: 200,
    popular: false,
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
      "The SSELFIE Presets (phone + desktop) - one tap to that warm, editorial look",
      "Quick Preset Setup Guide - up and running in about 2 minutes, even if you've never edited a photo",
      "The Posing Playbook - simple angles and poses that make any photo look intentional",
      "The Caption & Content Library - captions and post ideas so your photos actually become posts",
      "The Storytelling Captions - turn a nice photo into a post people connect with",
      "The 7-Day Content Starter - exactly what to post this week, day by day",
      "The Selfie Guide - get a stronger photo before you even begin",
    ],
  },
  {
    id: "masterclass",
    name: "Selfie Masterclass",
    displayName: "Selfie Masterclass",
    description:
      "Sandra's full SSELFIE method for visibility, offer clarity, content, and showing up before Studio helps you execute it weekly.",
    priceInCents: 14700, // $147 one-time
    type: "masterclass",
    tag: "bought_masterclass",
    features: [
      "Strategy foundation included",
      "Full method walkthrough",
      "Module-based training access",
      "Income-ready visibility curriculum",
      "30-day content and offer implementation assets",
      "Academy entitlement unlock",
      "Next step toward Studio weekly execution or private 1:1 support",
    ],
  },
  {
    id: "selfie_guide_bundle",
    name: "Selfie Guide + Strategy Bundle",
    displayName: "Selfie Guide + Strategy Bundle",
    description: "Get the Selfie Guide and strategy foundation together at the bundle price.",
    priceInCents: 2700, // $27 one-time
    type: "selfie_guide_bundle",
    tag: "bought_selfie_guide_bundle",
    features: [
      "Full Selfie Guide access",
      "Personal brand strategy foundation unlocked",
      "Interactive checklists and 7-Day Selfie Challenge",
    ],
  },
  {
    id: "selfie_guide",
    name: "Selfie Guide",
    displayName: "Selfie Guide",
    description: "Take one selfie you feel confident enough to post and understand what to fix first.",
    priceInCents: 1700, // $17 one-time
    type: "selfie_guide",
    tag: "bought_selfie_guide",
    features: [
      "First-photo checklist",
      "Interactive checklists for every step",
      "7-Day Selfie Challenge",
      "One caption/post prompt",
      "Meet Maya - your weekly content stylist inside Studio",
    ],
  },
  {
    id: "prompt_vault",
    name: "The Prompt Vault",
    displayName: "The Prompt Vault",
    description:
      "Full AI photoshoot sequences for turning one selfie into editorial brand images. Includes newest drops and future SSELFIE photoshoots.",
    priceInCents: 2700, // $27 one-time
    type: "prompt_vault",
    tag: "bought_prompt_vault",
    features: [
      "Full shoot sequences, not just one prompt",
      "Newest drops and future SSELFIE photoshoots",
      "Dark Feminine Café, Dark Balcony, Coastal White, and more",
      "Example photo for every prompt",
      "$27 one-time access, no account required",
    ],
  },
  {
    id: "selfie_to_brand_shoot_system",
    name: "The Selfie to Brand Shoot System",
    displayName: "The Selfie to Brand Shoot System",
    description:
      "The guided visual identity path for turning one selfie into elevated personal brand images, with Vault access included.",
    priceInCents: 19700, // $197 one-time
    type: "selfie_to_brand_shoot_system",
    tag: "bought_selfie_to_brand_shoot_system",
    features: [
      "Lean Selfie to Brand Shoot workflow",
      "Source selfie and angle guidance",
      "Prompt Vault included",
      "Image selection taste filter",
      "Content-use guidance for your first AI brand shoot",
    ],
  },
]

export const ARCHIVED_PRICING_PRODUCTS: PricingProduct[] = [
  {
    // LEGACY_ACCESS_ONLY: kept for old payment records and credit grants. No public sales surface.
    id: "one_time_session",
    name: "Legacy One-Time Session",
    displayName: "Legacy One-Time Session",
    description: "Archived one-time creation offer preserved for historical Stripe/customer records.",
    priceInCents: 4900,
    type: "one_time_session",
    lifecycleStatus: "archived",
    credits: 50,
  },
  {
    // LEGACY_ACCESS_ONLY: required by historical Feed Planner buyers and paid_blueprint DB columns.
    id: "paid_blueprint",
    name: "Legacy Feed Planner Access",
    displayName: "Legacy Feed Planner Access",
    description: "Archived Feed Planner purchase preserved for existing buyer access.",
    priceInCents: 4700,
    type: "paid_blueprint",
    lifecycleStatus: "archived",
    credits: 60,
  },
  {
    // PRESERVE_FOR_EXISTING_BUYERS: strategy tokens and masterclass bundle access still depend on this ID.
    id: "brand_strategy_pack",
    name: "Legacy Strategy Pack",
    displayName: "Legacy Strategy Pack",
    description: "Archived strategy product preserved for existing strategy-token access.",
    priceInCents: 1900, // $19 one-time — archived, redirects to Masterclass
    type: "brand_strategy_pack",
    lifecycleStatus: "archived",
    tag: "bought_brand_strategy_pack",
  },
  {
    // PRESERVE_FOR_EXISTING_BUYERS: existing suite buyers keep academy access.
    id: "visibility_suite",
    name: "Legacy Visibility Suite",
    displayName: "Legacy Visibility Suite",
    description:
      "The full guided path: What To Say, Show Up, Get Paid, and your Maya Visibility Plan.",
    priceInCents: 9700, // €97 launch price
    type: "visibility_suite",
    lifecycleStatus: "archived",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.suiteLaunch,
    tag: "bought_visibility_suite",
    features: [
      "What To Say workbook",
      "Show Up workbook",
      "Get Paid workbook",
      "Maya Visibility Plan",
    ],
  },
]

// Preserve the long-standing export while making product ownership explicit.
export const PRICING_PRODUCTS: PricingProduct[] = [
  ...LIVE_PRICING_PRODUCTS,
  ...ARCHIVED_PRICING_PRODUCTS,
]

export const PRODUCT_REVENUE_PATHS: Record<PricingProductId, ProductRevenuePath> = {
  one_time_session: {
    lifecycleStatus: "live",
    checkoutPath: "app:startProductCheckoutSession(one_time_session)",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:one_time_session",
    successNextAction: "/studio",
    lifecycleEmailEntryPoint: "generateWelcomeEmail",
  },
  sselfie_studio_membership: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/membership?interval=month",
    fulfillmentRule: "stripe_webhook.invoice.payment_succeeded:sselfie_studio_membership",
    successNextAction: "/studio",
    lifecycleEmailEntryPoint: "app/api/cron/onboarding-sequence",
  },
  sselfie_studio_membership_annual: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/membership?interval=year",
    fulfillmentRule: "stripe_webhook.invoice.payment_succeeded:sselfie_studio_membership",
    successNextAction: "/studio",
    lifecycleEmailEntryPoint: "app/api/cron/onboarding-sequence",
  },
  credit_topup: {
    lifecycleStatus: "live",
    checkoutPath: "app:startCreditCheckoutSession(packageId)",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:credit_topup",
    successNextAction: "/studio",
    lifecycleEmailEntryPoint: "credit_topup_confirmation",
  },
  paid_blueprint: {
    // LEGACY_ACCESS_ONLY: preserved for paid_blueprint fulfillment and Feed Planner historical access.
    lifecycleStatus: "archived",
    checkoutPath: "legacy:no-new-public-checkout",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:paid_blueprint",
    successNextAction: "/feed-planner",
    lifecycleEmailEntryPoint: "paid_blueprint_delivery",
  },
  brand_strategy_pack: {
    // Archived — public pages redirect to /masterclass. Existing buyer access at /strategy/[token] stays live.
    lifecycleStatus: "archived",
    checkoutPath: "/checkout/masterclass",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:brand_strategy_pack",
    successNextAction: "/strategy/[token]",
    lifecycleEmailEntryPoint: "none — archived product",
  },
  selfie_guide_bundle: {
    lifecycleStatus: "live",
    checkoutPath: "legacy:webhook-only bundle fulfillment",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:selfie_guide_bundle",
    successNextAction: "/selfie-guide",
    lifecycleEmailEntryPoint: "selfie_guide_delivery",
  },
  selfie_guide: {
    // Retired as a paid product 2026-06-11: the guide is the free lead magnet.
    // Checkout route redirects to /selfie-guide; webhook fulfillment kept for past buyers.
    lifecycleStatus: "legacy_access_only",
    checkoutPath: "legacy:checkout retired, redirects to /selfie-guide",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:selfie_guide",
    successNextAction: "/selfie-guide",
    lifecycleEmailEntryPoint: "selfie_guide_delivery",
  },
  starter_kit: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/starter-kit",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:starter_kit",
    successNextAction: "/academy/access/starter-kit",
    lifecycleEmailEntryPoint: "starter_kit_delivery",
  },
  masterclass: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/masterclass",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:masterclass",
    successNextAction: "/academy/access/brand-strategy",
    lifecycleEmailEntryPoint: "masterclass_delivery",
  },
  visibility_suite: {
    // PRESERVE_FOR_EXISTING_BUYERS
    lifecycleStatus: "archived",
    checkoutPath: "legacy:existing-buyer-access-only",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:visibility_suite",
    successNextAction: "/academy/access/visibility-suite",
    lifecycleEmailEntryPoint: "academy_purchase_confirmation",
  },
  academy_mini_product: {
    // PRESERVE_FOR_EXISTING_BUYERS
    lifecycleStatus: "archived",
    checkoutPath: "legacy:existing-buyer-access-only",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:academy_mini_product",
    successNextAction: "/academy/access/[visibility-mini-product]",
    lifecycleEmailEntryPoint: "academy_purchase_confirmation",
  },
  prompt_vault: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/prompt-vault",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:prompt_vault",
    successNextAction: "/access/prompt-vault/[token]",
    lifecycleEmailEntryPoint: "prompt_vault_delivery",
  },
  selfie_to_brand_shoot_system: {
    lifecycleStatus: "live",
    checkoutPath: "/checkout/selfie-to-brand-shoot",
    fulfillmentRule: "stripe_webhook.checkout.session.completed:selfie_to_brand_shoot_system",
    successNextAction: "/access/selfie-to-brand-shoot/[token]",
    lifecycleEmailEntryPoint: "selfie_to_brand_shoot_delivery",
  },
}

// PRESERVE_FOR_EXISTING_BUYERS: archived mini-product metadata is still used by
// academy access, admin resend, and webhook compatibility paths.
export const ACADEMY_PRODUCTS = {
  what_to_say: {
    id: "what_to_say",
    name: "What To Say",
    tagline: "Know what to say so people understand, trust, and buy from you.",
    price: 4700,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.whatToSay,
    manychatKeyword: "SAY",
    tag: "bought_what_to_say",
    upsellTo: "show_up",
    description: "Stop staring at a blank screen. Know exactly what to post - starting today.",
  },
  show_up: {
    id: "show_up",
    name: "Show Up",
    tagline: "Know what to post so people understand you, trust you, and remember you.",
    price: 6700,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.showUp,
    manychatKeyword: "CONTENT",
    tag: "bought_show_up",
    upsellTo: "get_paid",
    description: "Have your entire month of content planned, written, and ready - by Sunday.",
  },
  get_paid: {
    id: "get_paid",
    name: "Get Paid",
    tagline: "Build your first simple offer and €500 sales path.",
    price: 9700,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.getPaid,
    manychatKeyword: "PAID",
    tag: "bought_get_paid",
    upsellTo: "membership",
    description: "You're showing up. Now let's make sure the right people notice - and pay you.",
  },
  visibility_suite: {
    id: "visibility_suite",
    name: "Legacy Visibility Suite",
    tagline: "Archived bundle access for existing buyers.",
    price: 9700,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.suiteLaunch,
    manychatKeyword: "SUITE",
    tag: "bought_visibility_suite",
    upsellTo: "membership",
    description:
      "The full guided path to know what to say, what to post, what to sell, and what to do next.",
  },
  concept_cards_pack: {
    id: "concept_cards_pack",
    name: "Concept Cards",
    tagline: "Turn one topic into ten clear post angles.",
    price: 2900,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.conceptCardsPack,
    manychatKeyword: "CONTENT",
    tag: "bought_concept_cards_pack",
    upsellTo: "show_up",
    description: "A focused concept workspace for choosing what your next post should actually say.",
  },
  caption_sprint: {
    id: "caption_sprint",
    name: "Caption Sprint",
    tagline: "Write a small bank of captions without starting from a blank page.",
    price: 2900,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.captionSprint,
    manychatKeyword: "CONTENT",
    tag: "bought_caption_sprint",
    upsellTo: "get_paid",
    description: "A focused caption workspace for turning your offer, tone, and CTA into ready-to-edit captions.",
  },
  feed_reset_9grid: {
    id: "feed_reset_9grid",
    name: "Feed Reset",
    tagline: "Plan the next nine posts so your profile finally has a direction.",
    price: 4900,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.feedReset9Grid,
    manychatKeyword: "CONTENT",
    tag: "bought_feed_reset_9grid",
    upsellTo: "visibility_suite",
    description: "A focused 9-grid workspace for cleaning up your visible message and next posts.",
  },
  ai_photo_refresh: {
    id: "ai_photo_refresh",
    name: "AI Photo Refresh",
    tagline: "Create a simple visual direction before you need a full content system.",
    price: 5900,
    currency: "eur",
    stripePriceId: VISIBILITY_TO_PAID_STRIPE_PRICE_IDS.aiPhotoRefresh,
    manychatKeyword: "PHOTOS",
    tag: "bought_ai_photo_refresh",
    upsellTo: "feed_reset_9grid",
    description: "A focused visual workspace for prompts, reference notes, and the first five usable image ideas.",
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

export function formatPriceFromCents(
  priceInCents: number,
  options?: { decimals?: number; currency?: "usd" | "eur" }
) {
  const resolvedDecimals = options?.decimals ?? (priceInCents % 100 === 0 ? 0 : 2)
  const currency = options?.currency ?? "usd"
  const locale = currency === "eur" ? "de-DE" : "en-US"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  }).format(priceInCents / 100)
}
