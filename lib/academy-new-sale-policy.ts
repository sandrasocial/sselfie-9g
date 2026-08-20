const PRESERVED_ACADEMY_MINI_PRODUCT_IDS = new Set([
  "what_to_say",
  "show_up",
  "get_paid",
  "visibility_suite",
  "concept_cards_pack",
  "caption_sprint",
  "feed_reset_9grid",
  "ai_photo_refresh",
  "ai_photo_prompts",
  "editing_masterclass",
  "branded_by_sselfie",
])

const ARCHIVED_DIRECT_ACADEMY_PRODUCT_IDS = new Set([
  "brand_strategy_pack",
  "selfie_guide_bundle",
  "selfie_guide",
  "selfie_to_brand_shoot_system",
])

const DEDICATED_ACADEMY_CHECKOUT_URLS: Record<string, string> = {
  starter_kit: "/checkout/starter-kit",
  masterclass: "/checkout/masterclass",
  prompt_vault: "/checkout/prompt-vault",
  presets_single: "/checkout/presets?tier=single",
  presets_bundle: "/checkout/presets?tier=bundle",
  selfie_visibility_bundle: "/checkout/one-selfie",
  selfie_ai_photos_kit: "/checkout/selfie-to-ai-photos-kit",
}

export type AcademyNewSalePolicy =
  | {
      status: "denied"
      reason:
        | "preserved_mini_product"
        | "archived_direct_product"
        | "legacy_container"
        | "invalid_product_id"
        | "unknown_product_id"
    }
  | {
      status: "dedicated_checkout_only"
      purchaseUrl: string
    }

/**
 * Pure policy for brand-new sales through the generic Academy API only.
 * Historical access and webhook fulfillment do not consume this policy.
 */
export function resolveAcademyNewSalePolicy(productId: unknown): AcademyNewSalePolicy {
  if (typeof productId !== "string") {
    return { status: "denied", reason: "invalid_product_id" }
  }

  const normalizedProductId = productId.trim()
  if (!normalizedProductId) {
    return { status: "denied", reason: "invalid_product_id" }
  }

  if (PRESERVED_ACADEMY_MINI_PRODUCT_IDS.has(normalizedProductId)) {
    return { status: "denied", reason: "preserved_mini_product" }
  }

  if (ARCHIVED_DIRECT_ACADEMY_PRODUCT_IDS.has(normalizedProductId)) {
    return { status: "denied", reason: "archived_direct_product" }
  }

  if (normalizedProductId === "academy_mini_product") {
    return { status: "denied", reason: "legacy_container" }
  }

  const purchaseUrl = DEDICATED_ACADEMY_CHECKOUT_URLS[normalizedProductId]
  if (purchaseUrl) {
    return { status: "dedicated_checkout_only", purchaseUrl }
  }

  return { status: "denied", reason: "unknown_product_id" }
}
