// @vitest-environment node

import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { resolveCheckoutProductType, resolveCheckoutSource } from "@/lib/payments/checkout-metadata"

describe("Stripe public paid checkout source allowlist", () => {
  it("treats AI Prompts access upsells as public paid checkout sources", () => {
    const webhookRoute = readFileSync(
      "lib/payments/lifecycle/checkout-session-completed.ts",
      "utf8"
    )

    expect(webhookRoute).toContain('source === "ai_prompts_access"')
  })

  it("treats Work With Me payment links as public paid checkout sources", () => {
    const webhookRoute = readFileSync(
      "lib/payments/lifecycle/checkout-session-completed.ts",
      "utf8"
    )

    expect(webhookRoute).toContain('source === "work_with_me_paid"')
  })

  it("normalizes legacy Work With Me payment link metadata", () => {
    const metadata = { product: "work_with_me" }
    const productType = resolveCheckoutProductType(metadata)

    expect(productType).toBe("work_with_me")
    expect(resolveCheckoutSource(metadata, productType)).toBe("work_with_me_paid")
  })

  it("prefers explicit Work With Me metadata when present", () => {
    const metadata = { product_type: "work_with_me", source: "custom_private_link" }
    const productType = resolveCheckoutProductType(metadata)

    expect(productType).toBe("work_with_me")
    expect(resolveCheckoutSource(metadata, productType)).toBe("custom_private_link")
  })
})
