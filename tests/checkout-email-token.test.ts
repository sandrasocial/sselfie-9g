// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  createCheckoutEmailToken,
  readCheckoutEmailToken,
} from "@/lib/revenue-engine/checkout-email-token"
import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"

describe("opaque checkout email tokens", () => {
  it("round-trips a normalized email without exposing it", () => {
    const token = createCheckoutEmailToken(" Sandra+Checkout@Example.COM ", 1_780_000_000_000)

    expect(token).toMatch(/^v1\./)
    expect(token?.toLowerCase()).not.toContain("sandra")
    expect(readCheckoutEmailToken(token, 1_780_000_001_000)).toBe("sandra+checkout@example.com")
    expect(normalizeCheckoutEmail(token)).toBeNull() // token is intentionally expired relative to real Date.now()
  })

  it("rejects a tampered token", () => {
    const now = Date.now()
    const token = createCheckoutEmailToken("buyer@example.com", now)
    expect(token).toBeTruthy()

    const tampered = `${token!.slice(0, -1)}${token!.endsWith("A") ? "B" : "A"}`
    expect(readCheckoutEmailToken(tampered, now + 1000)).toBeNull()
  })

  it("rejects tokens older than the checkout handoff window", () => {
    const issuedAt = Date.now() - 46 * 24 * 60 * 60 * 1000
    const token = createCheckoutEmailToken("buyer@example.com", issuedAt)

    expect(readCheckoutEmailToken(token)).toBeNull()
  })

  it("keeps legacy raw checkout_email links working", () => {
    expect(normalizeCheckoutEmail(" Legacy.Buyer@Example.com ")).toBe("legacy.buyer@example.com")
  })
})
