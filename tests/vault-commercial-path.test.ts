import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  PROMPT_VAULT_SUITE_COUPON_ID,
  PROMPT_VAULT_SUITE_OFFER_SLUG,
  buildPromptVaultPresetsDownsellHref,
  buildPromptVaultSuiteOfferHref,
} from "@/lib/revenue-engine/prompt-vault-commercial-path"

describe("Prompt Vault commercial path", () => {
  it("keeps the approved offer contract exact", () => {
    expect(PROMPT_VAULT_SUITE_OFFER_SLUG).toBe("prompt-vault-suite-first-month-49")
    expect(PROMPT_VAULT_SUITE_COUPON_ID).toBe("PROMPT_VAULT_SUITE_49_FIRST_MONTH")

    const suiteHref = buildPromptVaultSuiteOfferHref("vault-token")
    expect(suiteHref).toContain("interval=month")
    expect(suiteHref).toContain(`offer=${PROMPT_VAULT_SUITE_OFFER_SLUG}`)
    expect(suiteHref).toContain("vault_token=vault-token")
    expect(suiteHref).toContain("utm_campaign=vault_to_suite")
    expect(suiteHref).toContain("checkout_source=prompt_vault_post_purchase_offer")

    const presetsHref = buildPromptVaultPresetsDownsellHref()
    expect(presetsHref).toContain("tier=bundle")
    expect(presetsHref).toContain("utm_campaign=vault_to_presets")
    expect(presetsHref).toContain("checkout_source=prompt_vault_post_purchase_downsell")
  })

  it("shows the measured offer only to Vault buyers who are not already members", () => {
    const accessPage = readFileSync("app/access/prompt-vault/[token]/page.tsx", "utf8")
    const offer = readFileSync("components/prompt-vault/vault-post-purchase-offer.tsx", "utf8")

    expect(accessPage).toContain("!viewerAccess.isActiveMember &&")
    expect(accessPage).toContain("<VaultPostPurchaseOffer")
    expect(accessPage).toContain("vaultToken={token}")
    expect(offer).toContain("Your first month is €49")
    expect(offer).toContain("Then €97/month")
    expect(offer).toContain("Your Vault access is yours either way")
    expect(offer).toContain("Not now. Show me the presets")
    expect(offer).toContain('event: "prompt_vault_suite_offer_viewed"')
    expect(offer).toContain('event: "prompt_vault_suite_offer_clicked"')
    expect(offer).toContain('event: "prompt_vault_suite_offer_declined"')
    expect(offer).toContain('event: "prompt_vault_presets_downsell_clicked"')
  })

  it("validates Vault ownership server-side before applying the first-month coupon", () => {
    const membership = readFileSync("app/checkout/membership/page.tsx", "utf8")
    const paidAccess = readFileSync("lib/prompt-vault/paid-access.ts", "utf8")
    const checkout = readFileSync("app/checkout/page.tsx", "utf8")

    expect(membership).toContain("hasPaidPromptVaultAccess")
    expect(membership).toContain("PROMPT_VAULT_SUITE_COUPON_ID")
    expect(membership).toContain("isApprovedVaultOffer")
    expect(paidAccess).toContain("prompt-vault-paid")
    expect(paidAccess).toContain("access_token")
    expect(checkout).toContain("€49 for your first month")
    expect(checkout).toContain("Then €97 billed monthly")
  })

  it("reports offer behavior and successful Stripe payments separately", () => {
    const contract = readFileSync("lib/analytics/event-contract.ts", "utf8")
    const scorecard = readFileSync("lib/admin/revenue-truth-scorecard.ts", "utf8")
    const admin = readFileSync("app/admin/page.tsx", "utf8")

    for (const event of [
      "prompt_vault_suite_offer_viewed",
      "prompt_vault_suite_offer_clicked",
      "prompt_vault_suite_offer_declined",
      "prompt_vault_presets_downsell_clicked",
    ]) {
      expect(contract).toContain(`"${event}"`)
      expect(scorecard).toContain(event)
    }

    expect(scorecard).toContain("vaultCommercialPath30d")
    expect(scorecard).toContain("FROM stripe_payments")
    expect(scorecard).toContain("vault_to_suite")
    expect(scorecard).toContain("vault_to_presets")
    expect(admin).toContain("Vault buyer path · last 30 days")
    expect(admin).toContain("Successful Stripe payments")
  })
})
