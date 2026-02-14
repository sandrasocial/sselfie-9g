const STRIPE_BRAND_ENGINE_COHORT_PRICE_ENV = "STRIPE_BRAND_ENGINE_COHORT_PRICE_ID"
const STRIPE_BRAND_ENGINE_VIP_PRICE_ENV = "STRIPE_BRAND_ENGINE_VIP_PRICE_ID"

export type BrandEngineNormalizedOfferType = "cohort" | "vip"

type StripePriceResolution = {
  normalizedOfferType: BrandEngineNormalizedOfferType
  envVarName: typeof STRIPE_BRAND_ENGINE_COHORT_PRICE_ENV | typeof STRIPE_BRAND_ENGINE_VIP_PRICE_ENV
  priceId: string
}

function normalizeOfferType(offerType: string | null | undefined): BrandEngineNormalizedOfferType {
  const normalized = String(offerType || "").trim().toLowerCase()
  if (normalized === "vip") return "vip"
  return "cohort"
}

export function toBrandEngineCheckoutProductType(offerType: BrandEngineNormalizedOfferType): string {
  return `brand_engine_${offerType}`
}

export function isBrandEngineCheckoutProductType(productType: string | null | undefined): boolean {
  return String(productType || "").startsWith("brand_engine_")
}

export function resolveBrandEngineOfferCheckoutPrice(
  offerType: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): StripePriceResolution {
  const normalizedOfferType = normalizeOfferType(offerType)
  const envVarName =
    normalizedOfferType === "vip" ? STRIPE_BRAND_ENGINE_VIP_PRICE_ENV : STRIPE_BRAND_ENGINE_COHORT_PRICE_ENV
  const priceId = String(env[envVarName] || "").trim()

  if (!priceId) {
    throw new Error(
      `Missing Stripe price configuration for Brand Engine offer. Required env var: ${envVarName}`,
    )
  }

  return {
    normalizedOfferType,
    envVarName,
    priceId,
  }
}
