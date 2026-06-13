import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Starter Kit checkout from Selfie Guide access", () => {
  it("treats the guide access bridge as a public paid checkout source", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")
    const allowlistStart = webhook.indexOf("const isPublicPaidCheckoutSource =")
    const allowlistEnd = webhook.indexOf("if (!customerEmail)", allowlistStart)
    const allowlist = webhook.slice(allowlistStart, allowlistEnd)

    expect(allowlist).toContain('source === "selfie_guide_access"')
  })
})
