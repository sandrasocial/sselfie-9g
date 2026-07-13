import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"

export type OneSelfieLandingSearchParams = Record<
  string,
  string | string[] | undefined
>

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "referral_code",
  "freebie_source",
  "guide_cta",
  "entry_post_slug",
] as const

function firstValue(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  const trimmed = candidate?.trim()
  return trimmed || null
}

function copyKnownAttribution(
  target: URLSearchParams,
  params: OneSelfieLandingSearchParams,
) {
  for (const key of ATTRIBUTION_KEYS) {
    const value = firstValue(params[key])
    if (value) target.set(key, value)
  }

  const checkoutEmail = normalizeCheckoutEmail(
    firstValue(params.checkout_email) || firstValue(params.email),
  )
  if (checkoutEmail) target.set("checkout_email", checkoutEmail)
}

export function getOneSelfieLandingSource(
  params: OneSelfieLandingSearchParams,
) {
  return firstValue(params.source) || "one_selfie_landing"
}

export function getOneSelfieLandingKeyword(
  params: OneSelfieLandingSearchParams,
) {
  return firstValue(params.cta_keyword)?.toUpperCase() || "BUNDLE"
}

export function hasInboundOneSelfieKeyword(
  params: OneSelfieLandingSearchParams,
) {
  return Boolean(firstValue(params.cta_keyword))
}

export function buildOneSelfieCheckoutHref(
  params: OneSelfieLandingSearchParams,
) {
  const search = new URLSearchParams()
  copyKnownAttribution(search, params)

  search.set("offer_slug", "one-selfie-visibility-bundle")
  search.set("source", getOneSelfieLandingSource(params))
  search.set("utm_source", firstValue(params.utm_source) || "site")
  search.set("utm_medium", firstValue(params.utm_medium) || "sales_page")
  search.set(
    "utm_campaign",
    firstValue(params.utm_campaign) || "one_selfie_visibility_48h",
  )
  search.set("checkout_source", "one_selfie_landing")
  search.set("cta_keyword", getOneSelfieLandingKeyword(params))
  search.set("entry_path", "/one-selfie")
  search.set("buyer_stage", "suite")

  return `/checkout/one-selfie?${search.toString()}`
}

export function buildOneSelfieExpiredFallbackHref(
  params: OneSelfieLandingSearchParams,
) {
  const search = new URLSearchParams()
  copyKnownAttribution(search, params)

  search.set("offer_slug", "starter-kit")
  search.set("source", "one_selfie_expired_fallback")
  search.set("utm_source", firstValue(params.utm_source) || "site")
  search.set("utm_medium", firstValue(params.utm_medium) || "sales_page")
  search.set(
    "utm_campaign",
    firstValue(params.utm_campaign) || "one_selfie_visibility_48h",
  )
  search.set("utm_content", "expired_offer_fallback")
  search.set("checkout_source", "one_selfie_expired_fallback")
  search.set("cta_keyword", getOneSelfieLandingKeyword(params))
  search.set("entry_path", "/one-selfie")
  search.set("buyer_stage", "micro")

  return `/checkout/starter-kit?${search.toString()}`
}
