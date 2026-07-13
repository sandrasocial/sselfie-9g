// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createSession, upsertCheckoutAttribution } = vi.hoisted(() => ({
  createSession: vi.fn(),
  upsertCheckoutAttribution: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: createSession } },
    coupons: { retrieve: vi.fn() },
  },
}))
vi.mock("@/lib/db/client", () => ({
  sql: vi.fn(),
  getDb: vi.fn(),
}))
vi.mock("@/lib/revenue-engine/checkout-attribution", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/revenue-engine/checkout-attribution")>()
  return {
    ...actual,
    upsertCheckoutAttribution,
  }
})

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

describe("One Selfie Visibility Bundle Stripe session", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T20:00:00.000Z"))
    vi.stubEnv("STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE", "price_selfie_visibility_bundle_97")
    createSession.mockResolvedValue({
      id: "cs_test_bundle",
      client_secret: "cs_test_bundle_secret_value",
      customer: null,
    })
    upsertCheckoutAttribution.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it("creates one USD-price session that expires at the fixed offer close", async () => {
    await expect(
      createLandingCheckoutSession("selfie_visibility_bundle", undefined, null, {
        offerSlug: "one-selfie-visibility-bundle",
        source: "instagram_manychat",
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "one_selfie_visibility_48h",
        utmContent: "launch_reel",
        checkoutSource: "manychat_bundle",
        ctaKeyword: "BUNDLE",
        buyerStage: "suite",
      })
    ).resolves.toBe("cs_test_bundle_secret_value")

    expect(createSession).toHaveBeenCalledTimes(1)
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        ui_mode: "embedded",
        mode: "payment",
        redirect_on_completion: "never",
        expires_at: Math.floor(Date.parse("2026-07-15T16:00:00.000Z") / 1000),
        line_items: [{ price: "price_selfie_visibility_bundle_97", quantity: 1 }],
        metadata: expect.objectContaining({
          product_id: "selfie_visibility_bundle",
          product_type: "selfie_visibility_bundle",
          offer_slug: "one-selfie-visibility-bundle",
          offer_opens_at: "2026-07-13T16:00:00.000Z",
          offer_closes_at: "2026-07-15T16:00:00.000Z",
          source: "instagram_manychat",
          utm_source: "instagram",
          utm_medium: "dm",
          utm_campaign: "one_selfie_visibility_48h",
          utm_content: "launch_reel",
          checkout_source: "manychat_bundle",
          cta_keyword: "BUNDLE",
          buyer_stage: "suite",
        }),
      })
    )
    expect(upsertCheckoutAttribution).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "cs_test_bundle",
        productId: "selfie_visibility_bundle",
        productType: "selfie_visibility_bundle",
        source: "instagram_manychat",
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "one_selfie_visibility_48h",
        utmContent: "launch_reel",
        checkoutSource: "manychat_bundle",
        ctaKeyword: "BUNDLE",
        buyerStage: "suite",
      })
    )
  })

  it("rejects a new session at the fixed close before contacting Stripe", async () => {
    vi.setSystemTime(new Date("2026-07-15T16:00:00.000Z"))

    await expect(createLandingCheckoutSession("selfie_visibility_bundle")).rejects.toThrow(
      "checkout is closed"
    )
    expect(createSession).not.toHaveBeenCalled()
    expect(upsertCheckoutAttribution).not.toHaveBeenCalled()
  })

  it("keeps the campaign at one fixed $97 price without promotion codes", async () => {
    await expect(
      createLandingCheckoutSession("selfie_visibility_bundle", "ANYCODE")
    ).rejects.toThrow("fixed $97 price")
    expect(createSession).not.toHaveBeenCalled()
  })
})
