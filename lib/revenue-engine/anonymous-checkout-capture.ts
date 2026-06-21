const SOCIAL_DM_SIGNAL_RE = /\b(manychat|instagram_dm|instagram-manychat|instagram_manychat|ig_dm|dm)\b/i

export type CheckoutEmailCaptureParams = Record<string, string | undefined | null>

export const CHECKOUT_EMAIL_CAPTURE_PARAM_KEYS = [
  "interval",
  "promo",
  "bonus",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "referral_code",
  "checkout_source",
  "freebie_source",
  "guide_cta",
  "cta_keyword",
  "quiz_result",
  "return_to",
  "entry_path",
  "entry_post_slug",
  "buyer_stage",
  "freebie_token",
  "vault_credit",
  "starter_kit_credit",
  "upgrade_credit",
  "tier",
  "collection",
] as const

function cleanParam(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 500) : null
}

export function hasSocialDmCheckoutSignal(params: CheckoutEmailCaptureParams): boolean {
  return [
    params.source,
    params.utm_source,
    params.utm_medium,
    params.utm_campaign,
    params.checkout_source,
    params.freebie_source,
    params.cta_keyword,
    params.entry_path,
    params.entry_post_slug,
  ].some((value) => SOCIAL_DM_SIGNAL_RE.test(value || ""))
}

export function shouldShowPromptVaultCheckoutEmailCapture(input: {
  params: CheckoutEmailCaptureParams
  hasRecoverableEmail: boolean
  hasAuthUser: boolean
  hasFreebieToken: boolean
}): boolean {
  if (input.hasRecoverableEmail || input.hasAuthUser) return false
  return true
}

export function shouldShowCheckoutEmailCapture(input: {
  params: CheckoutEmailCaptureParams
  hasRecoverableEmail: boolean
  hasAuthUser: boolean
  hasFreebieToken: boolean
}): boolean {
  return shouldShowPromptVaultCheckoutEmailCapture(input)
}

export function buildCheckoutEmailCaptureHiddenParams(
  params: CheckoutEmailCaptureParams,
): Array<{ name: string; value: string }> {
  const hidden: Array<{ name: string; value: string }> = []

  for (const key of CHECKOUT_EMAIL_CAPTURE_PARAM_KEYS) {
    const value = cleanParam(params[key])
    if (value) {
      hidden.push({ name: key, value })
    }
  }

  if (!hidden.some((item) => item.name === "checkout_source")) {
    hidden.push({ name: "checkout_source", value: "social_dm_email_capture" })
  }
  if (!hidden.some((item) => item.name === "buyer_stage")) {
    hidden.push({ name: "buyer_stage", value: "lead" })
  }

  return hidden
}

export function buildSkipCheckoutEmailCaptureHref(
  pathname: string,
  params: CheckoutEmailCaptureParams,
): string {
  const search = new URLSearchParams()

  for (const { name, value } of buildCheckoutEmailCaptureHiddenParams(params)) {
    search.set(name, value)
  }
  search.set("skip_email_capture", "1")

  const query = search.toString()
  return query ? `${pathname}?${query}` : pathname
}
