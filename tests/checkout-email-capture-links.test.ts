import { describe, expect, it } from "vitest"

import { buildRevenueEmailLink } from "@/lib/email/templates/revenue-links"
import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"

describe("checkout email capture links", () => {
  it("carries checkout identity without exposing the recipient email", () => {
    const url = buildRevenueEmailLink("https://sselfie.ai/checkout/prompt-vault", {
      campaign: "ai_prompts_day1_vault_bridge",
      content: "primary_cta",
      source: "ai_prompts_nurture",
      checkoutEmail: " Sandra@Example.COM ",
    })
    const parsed = new URL(url)
    const handoff = parsed.searchParams.get("checkout_email")

    expect(handoff).toMatch(/^v1\./)
    expect(url.toLowerCase()).not.toContain("sandra%40example.com")
    expect(url.toLowerCase()).not.toContain("sandra@example.com")
    expect(normalizeCheckoutEmail(handoff)).toBe("sandra@example.com")
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
