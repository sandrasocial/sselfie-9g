import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("Stripe webhook secret logging", () => {
  it("never prints any part of the signing secret", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/webhooks/stripe/route.ts"),
      "utf8",
    )

    expect(route).not.toContain("Webhook secret preview")
    expect(route).not.toContain("webhookSecret.substring")
  })
})
