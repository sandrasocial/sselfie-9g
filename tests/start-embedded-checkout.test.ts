import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buildEmbeddedCheckoutUrl, openEmbeddedCheckout, startEmbeddedCheckout } from "@/lib/start-embedded-checkout"

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

  it("sends a normalized attribution payload from the browser context", async () => {
    window.history.pushState({}, "", "/why-studio?utm_source=instagram&utm_medium=social&utm_campaign=spring_launch&campaign_id=12&ref=sse123456")
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: "secret_456" }),
    })

    await startEmbeddedCheckout("sselfie_studio_membership", {
      source: "pricing_section",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/landing/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          productId: "sselfie_studio_membership",
          offerSlug: null,
          source: "pricing_section",
          utmSource: "instagram",
          utmMedium: "social",
          utmCampaign: "spring_launch",
          utmContent: null,
          campaignId: "12",
          referralCode: "SSE123456",
          returnTo: null,
          entryPath: "/why-studio?utm_source=instagram&utm_medium=social&utm_campaign=spring_launch&campaign_id=12&ref=sse123456",
        }),
      }),
    )
  })
})
