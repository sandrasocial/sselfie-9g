// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const checkoutSource = readFileSync("app/actions/landing-checkout.ts", "utf8")

describe("landing checkout payment method configuration", () => {
  it("enables dynamic payment methods for one-time embedded checkout sessions", () => {
    expect(checkoutSource).toContain("...(!isSubscription && {")
    expect(checkoutSource).toContain("automatic_payment_methods")
    expect(checkoutSource).toContain("enabled: true")
  })

  it("does not force billing address collection in the landing checkout", () => {
    expect(checkoutSource).not.toContain("billing_address_collection")
  })
})
