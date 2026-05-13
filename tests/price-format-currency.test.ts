import { describe, expect, it } from "vitest"
import { formatPriceFromCents } from "@/lib/products"

describe("formatPriceFromCents", () => {
  it("formats USD by default", () => {
    expect(formatPriceFromCents(3700)).toBe("$37")
  })

  it("formats EUR when explicitly requested", () => {
    const formatted = formatPriceFromCents(9700, { currency: "eur" })
    expect(formatted).toContain("97")
    expect(formatted).toContain("€")
  })
})
