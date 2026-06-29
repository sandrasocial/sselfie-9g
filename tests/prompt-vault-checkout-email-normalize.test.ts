import { describe, expect, it } from "vitest"

import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"

describe("normalizeCheckoutEmail", () => {
  it("accepts a normal checkout email", () => {
    expect(normalizeCheckoutEmail(" Sandra@Example.COM ")).toBe("sandra@example.com")
  })

  it("rejects tracked URL fragments appended to the email", () => {
    expect(normalizeCheckoutEmail("zest@iway.na/1/0102019ef8f7d21a")).toBeNull()
  })
})
