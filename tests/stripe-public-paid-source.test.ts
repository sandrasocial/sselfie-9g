// @vitest-environment node

import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"

describe("Stripe public paid checkout source allowlist", () => {
  it("treats AI Prompts access upsells as public paid checkout sources", () => {
    const webhookRoute = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

    expect(webhookRoute).toContain('source === "ai_prompts_access"')
  })
})
