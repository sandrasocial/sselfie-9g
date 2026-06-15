import { createHash } from "crypto"

const IDEMPOTENT_ONE_TIME_PRODUCT_TYPES = new Set([
  "selfie_guide",
  "selfie_guide_bundle",
  "starter_kit",
  "masterclass",
  "brand_strategy_pack",
  "prompt_vault",
  "selfie_to_brand_shoot_system",
])

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`
}

export function buildCheckoutSessionIdempotencyKey(input: {
  productType: string
  stripePriceId: string
  customerEmail?: string | null
  promoCode?: string | null
  sessionScope?: Record<string, unknown> | null
}) {
  const email = input.customerEmail?.trim().toLowerCase()
  if (!email || !IDEMPOTENT_ONE_TIME_PRODUCT_TYPES.has(input.productType)) {
    return null
  }

  const fifteenMinuteBucket = Math.floor(Date.now() / (15 * 60 * 1000))
  const rawKey = [
    "landing_checkout",
    input.productType,
    input.stripePriceId,
    email,
    input.promoCode?.trim().toUpperCase() || "no_promo",
    stableStringify(input.sessionScope || {}),
    fifteenMinuteBucket,
  ].join(":")
  const digest = createHash("sha256").update(rawKey).digest("hex").slice(0, 32)

  return `sselfie_checkout_${input.productType}_${digest}`
}
