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
    const copyButton = readFileSync("components/ai-prompts/copy-button.tsx", "utf8")

    expect(accessPage).toContain("!viewerAccess.isActiveMember &&")
    expect(accessPage).toContain("<VaultPostPurchaseOffer")
    expect(accessPage).toContain("vaultToken={token}")
    expect(copyButton).toContain('new CustomEvent("sselfie:prompt-vault:first-result"')
    expect(offer).toContain("PROMPT_VAULT_FIRST_RESULT_EVENT")
    expect(offer).toContain("prompt_vault_first_result_started")
    expect(offer).toContain("if (!isActivated) return null")
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

  it("keeps paid checkout connected to membership fulfillment and access", () => {
    const checkoutLifecycle = readFileSync(
      "lib/payments/lifecycle/checkout-session-completed.ts",
      "utf8"
    )
    const membershipHandler = readFileSync("lib/payments/handlers/studio-membership.ts", "utf8")
    const invoiceHandler = readFileSync("lib/payments/lifecycle/invoice-paid.ts", "utf8")

    expect(checkoutLifecycle).toContain("handleStudioMembershipSubscriptionCheckout")
    expect(checkoutLifecycle).toContain("persistCheckoutAttributionContact")
    expect(membershipHandler).toContain("persistCheckoutMembership")
    expect(membershipHandler).toContain("Membership welcome (existing user) sent")
    expect(invoiceHandler).toContain("billing_reason: invoice.billing_reason")
    expect(invoiceHandler).toContain("FROM checkout_attribution")
    expect(invoiceHandler).toContain("checkoutAttribution?.utm_campaign")
  })

  it("reports offer behavior and successful Stripe payments separately", () => {
    const contract = readFileSync("lib/analytics/event-contract.ts", "utf8")
    const scorecard = readFileSync("lib/admin/revenue-truth-scorecard.ts", "utf8")
    const admin = readFileSync("app/admin/page.tsx", "utf8")

    for (const event of [
      "prompt_vault_first_result_started",
      "prompt_vault_suite_offer_viewed",
      "prompt_vault_suite_offer_clicked",
      "prompt_vault_suite_offer_declined",
      "prompt_vault_presets_downsell_clicked",
    ]) {
      expect(contract).toContain(`"${event}"`)
      expect(scorecard).toContain(event)
    }

    expect(scorecard).toContain("vaultCommercialPath30d")
    expect(scorecard).toContain("firstResultStarts")
    expect(scorecard).toContain("FROM stripe_payments")
    expect(scorecard).toContain("vault_to_suite")
    expect(scorecard).toContain("vault_to_presets")
    expect(admin).toContain("Vault buyer path · last 30 days")
    expect(admin).toContain("Successful Stripe payments")
  })

  it("reports checkout-recovery sales from successful Stripe payments", () => {
    const vaultAdmin = readFileSync("app/admin/prompt-vault/page.tsx", "utf8")

    expect(vaultAdmin).toContain("recovery_purchases")
    expect(vaultAdmin).toContain("recovery_revenue_cents")
    expect(vaultAdmin).toContain("metadata->>'email_type' LIKE 'prompt-vault-checkout-recovery%'")
    expect(vaultAdmin).toContain('label="Recovered Sales"')
    expect(vaultAdmin).toContain("Recovery Revenue")
  })

  it("protects Vault buyers from recovery sends and makes every recovery stage idempotent", () => {
    const recoveryRoute = readFileSync(
      "app/api/cron/prompt-vault-checkout-recovery/route.ts",
      "utf8"
    )

    expect(recoveryRoute).toContain("PROMPT_VAULT_RECOVERY_STAGE_2_SENT_AT")
    expect(recoveryRoute).toContain("PROMPT_VAULT_RECOVERY_STAGE_3_SENT_AT")
    expect(recoveryRoute).toContain("hasSuccessfulPromptVaultPayment")
    expect(recoveryRoute).toContain("claimFollowupStage")
    expect(recoveryRoute).toContain("releaseFollowupStageClaim")
    expect(recoveryRoute).toContain("recoveryIdempotencyKey")
    expect(recoveryRoute).toContain("createHash")
    expect(recoveryRoute).toContain('searchParams.get("dry_run") === "1"')
  })

  it("puts the Prompt Vault payment form ahead of decorative proof on mobile", () => {
    const checkout = readFileSync("app/checkout/page.tsx", "utf8")

    expect(checkout).toContain('isPromptVault ? "hidden sm:block"')
    expect(checkout).toContain('isPromptVault ? "py-4 sm:py-12"')
    expect(checkout).toContain('isPromptVault ? "hidden sm:grid"')
  })

  it("keeps the retired $197 Vault upgrade out of active runtime code", () => {
    const sequence = readFileSync("lib/email/prompt-vault-email-sequence.ts", "utf8")
    const templates = readFileSync("lib/email/templates/prompt-vault-buyer-sequence.ts", "utf8")
    const nurture = readFileSync("app/api/cron/nurture-sequence/route.ts", "utf8")
    const photoshootNurture = readFileSync("app/api/cron/ai-photoshoot-nurture/route.ts", "utf8")
    const analyticsContract = readFileSync("lib/analytics/event-contract.ts", "utf8")
    const vaultAdmin = readFileSync("app/admin/prompt-vault/page.tsx", "utf8")

    expect(sequence).not.toContain("prompt-vault-day3-system-upgrade")
    expect(templates).not.toContain("The System is $197")
    expect(templates).not.toContain("generatePromptVaultDay3SystemUpgradeEmail")
    expect(nurture).not.toContain("generatePromptVaultDay3SystemUpgradeEmail")
    expect(photoshootNurture).not.toContain("generatePromptVaultDay3SystemUpgradeEmail")
    expect(analyticsContract).not.toContain("prompt_vault_system_upgrade_click")
    expect(vaultAdmin).not.toContain("prompt-vault-day3-system-upgrade")
    expect(vaultAdmin).not.toContain("Vault To Selfie To Brand Shoot")
    expect(vaultAdmin).not.toContain("Vault to $197 System")
  })
})
