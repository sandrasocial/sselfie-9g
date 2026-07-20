export const PROMPT_VAULT_SUITE_OFFER_SLUG = "prompt-vault-suite-first-month-49"
export const PROMPT_VAULT_SUITE_COUPON_ID = "PROMPT_VAULT_SUITE_49_FIRST_MONTH"

export function buildPromptVaultSuiteOfferHref(vaultToken: string): string {
  const params = new URLSearchParams({
    interval: "month",
    offer: PROMPT_VAULT_SUITE_OFFER_SLUG,
    vault_token: vaultToken,
    source: "prompt_vault_post_purchase_upsell",
    utm_source: "prompt_vault",
    utm_medium: "post_purchase",
    utm_campaign: "vault_to_suite",
    utm_content: "vault_buyer_offer",
    checkout_source: "prompt_vault_post_purchase_offer",
    buyer_stage: "micro",
  })

  return `/checkout/membership?${params.toString()}`
}

export function buildPromptVaultPresetsDownsellHref(): string {
  const params = new URLSearchParams({
    tier: "bundle",
    source: "prompt_vault_post_purchase_downsell",
    utm_source: "prompt_vault",
    utm_medium: "post_purchase",
    utm_campaign: "vault_to_presets",
    utm_content: "suite_offer_declined",
    checkout_source: "prompt_vault_post_purchase_downsell",
    buyer_stage: "micro",
  })

  return `/checkout/presets?${params.toString()}`
}
