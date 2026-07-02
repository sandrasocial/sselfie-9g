// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const checkoutSource = readFileSync("app/actions/landing-checkout.ts", "utf8")

describe("landing checkout payment method configuration", () => {
  it("does not pass PaymentIntent-only automatic_payment_methods to Checkout Sessions", () => {
    expect(checkoutSource).toContain("Checkout Sessions get dynamic payment methods")
    expect(checkoutSource).toContain("automatic_payment_methods")
    expect(checkoutSource).not.toContain("automatic_payment_methods:")
    expect(checkoutSource).not.toContain("enabled: true")
  })

  it("does not force billing address collection in the landing checkout", () => {
    expect(checkoutSource).not.toContain("billing_address_collection")
  })
})
