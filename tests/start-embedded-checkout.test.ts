import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buildEmbeddedCheckoutUrl, openEmbeddedCheckout } from "@/lib/start-embedded-checkout"

describe("start embedded checkout helpers", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("builds a checkout url with an encoded client secret", () => {
    expect(buildEmbeddedCheckoutUrl("secret+/=")).toBe("/checkout?client_secret=secret%2B%2F%3D")
  })

  it("starts checkout and navigates to the embedded checkout page", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: "secret_123" }),
    })

    const navigate = vi.fn()

    await openEmbeddedCheckout("sselfie_studio_membership", navigate)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/landing/checkout",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(navigate).toHaveBeenCalledWith("/checkout?client_secret=secret_123")
  })
})
