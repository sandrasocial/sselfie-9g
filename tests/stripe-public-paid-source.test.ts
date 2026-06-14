// @vitest-environment node

import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"

describe("Stripe public paid checkout source allowlist", () => {
  it("treats AI Prompts access upsells as public paid checkout sources", () => {
    const webhookRoute = readFileSync("lib/payments/lifecycle/checkout-session-completed.ts", "utf8")

    expect(webhookRoute).toContain('source === "ai_prompts_access"')
  })
})
