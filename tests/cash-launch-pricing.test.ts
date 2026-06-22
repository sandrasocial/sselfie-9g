// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  FOUNDING_ANNUAL_PLAN,
  getFoundingAnnualOfferStatus,
  getPromptVaultPriceDisplay,
  getSubscriptionPlanFromMetadata,
  resolveMembershipPriceId,
  resolvePromptVaultPriceId,
} from "@/lib/launch/cash-launch-pricing"

describe("cash launch pricing", () => {
  const env = {
    STRIPE_PRICE_PROMPT_VAULT: "price_vault_27",
    STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH: "price_vault_37",
    STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID: "price_monthly_97",
    STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID: "price_annual_970",
    STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID: "price_founding_697",
  }

  it("keeps Prompt Vault at $27 before the approved flip and $37 after", () => {
    const before = new Date("2026-06-26T21:59:00.000Z")
    const after = new Date("2026-06-26T22:01:00.000Z")

    expect(getPromptVaultPriceDisplay(before)).toMatchObject({
      amountCents: 2700,
      label: "$27",
    })
    expect(resolvePromptVaultPriceId(env, before)).toBe("price_vault_27")

    expect(getPromptVaultPriceDisplay(after)).toMatchObject({
      amountCents: 3700,
      label: "$37",
    })
    expect(resolvePromptVaultPriceId(env, after)).toBe("price_vault_37")
  })

  it("uses founding annual while the first-25 window is open, then falls back to standing annual", () => {
    const duringWindow = new Date("2026-06-29T10:00:00.000Z")
    const afterWindow = new Date("2026-07-05T22:00:00.000Z")

    expect(
      resolveMembershipPriceId({
        productType: "sselfie_studio_membership_annual",
        requestedPlan: "founding",
        foundingCount: 24,
        env,
        now: duringWindow,
      }),
    ).toMatchObject({
      stripePriceId: "price_founding_697",
      appliedPlan: FOUNDING_ANNUAL_PLAN,
    })

    expect(
      resolveMembershipPriceId({
        productType: "sselfie_studio_membership_annual",
        requestedPlan: "founding",
        foundingCount: 25,
        env,
        now: duringWindow,
      }),
    ).toMatchObject({
      stripePriceId: "price_annual_970",
      appliedPlan: null,
    })

    expect(
      resolveMembershipPriceId({
        productType: "sselfie_studio_membership_annual",
        requestedPlan: "founding",
        foundingCount: 3,
        env,
        now: afterWindow,
      }),
    ).toMatchObject({
      stripePriceId: "price_annual_970",
      appliedPlan: null,
    })
  })

  it("reports founding spot availability and preserves the founding plan from Stripe metadata", () => {
    expect(getFoundingAnnualOfferStatus(9, new Date("2026-06-30T08:00:00.000Z"))).toMatchObject({
      sold: 9,
      remaining: 16,
      available: true,
    })
    expect(getSubscriptionPlanFromMetadata({ plan: FOUNDING_ANNUAL_PLAN }, "sselfie_studio_membership")).toBe(
      FOUNDING_ANNUAL_PLAN,
    )
    expect(getSubscriptionPlanFromMetadata({}, "sselfie_studio_membership")).toBe("sselfie_studio_membership")
  })
})
