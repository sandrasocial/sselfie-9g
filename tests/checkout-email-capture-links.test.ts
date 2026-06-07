import { describe, expect, it } from "vitest"

import { buildRevenueEmailLink } from "@/lib/email/templates/revenue-links"

describe("checkout email capture links", () => {
  it("can carry a normalized checkout email into revenue links", () => {
    const url = buildRevenueEmailLink("https://sselfie.ai/checkout/prompt-vault", {
      campaign: "ai_prompts_day1_vault_bridge",
      content: "primary_cta",
      source: "ai_prompts_nurture",
      checkoutEmail: " Sandra@Example.COM ",
    })

    expect(url).toContain("checkout_email=sandra%40example.com")
  })

  it("does not add invalid checkout email values to revenue links", () => {
    const url = buildRevenueEmailLink("https://sselfie.ai/checkout/prompt-vault", {
      campaign: "ai_prompts_day1_vault_bridge",
      content: "primary_cta",
      source: "ai_prompts_nurture",
      checkoutEmail: "not-an-email",
    })

    expect(url).not.toContain("checkout_email=")
  })
})
