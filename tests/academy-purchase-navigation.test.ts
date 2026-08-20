// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { resolveSameOriginAcademyPurchaseUrl } from "@/lib/academy-checkout-navigation"

describe("Academy dedicated checkout navigation", () => {
  it.each([
    ["/checkout/starter-kit", "/checkout/starter-kit"],
    ["/checkout/presets?tier=single", "/checkout/presets?tier=single"],
    ["https://sselfie.ai/checkout/masterclass", "/checkout/masterclass"],
  ])("accepts same-origin purchase URL %s", (purchaseUrl, expected) => {
    expect(resolveSameOriginAcademyPurchaseUrl(purchaseUrl, "https://sselfie.ai")).toBe(expected)
  })

  it.each([
    "https://evil.example/checkout",
    "//evil.example/checkout",
    "javascript:alert(1)",
    null,
    123,
  ])("rejects unsafe purchase URL %j", purchaseUrl => {
    expect(resolveSameOriginAcademyPurchaseUrl(purchaseUrl, "https://sselfie.ai")).toBeNull()
  })

  it("makes PurchaseButton follow a safe purchaseUrl returned by a non-OK API response", () => {
    const source = readFileSync("app/academy/products/[productId]/purchase-button.tsx", "utf8")

    expect(source).toContain("resolveSameOriginAcademyPurchaseUrl")
    expect(source).toContain("window.location.assign(purchaseUrl)")
  })
})
