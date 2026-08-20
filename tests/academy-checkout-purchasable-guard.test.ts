// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createServerClient,
  createSession,
  getAcademyEntitlementState,
  getAcademyProductCatalog,
  getUserByAuthId,
} = vi.hoisted(() => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "auth-user" } }, error: null })),
    },
  })),
  createSession: vi.fn(),
  getAcademyEntitlementState: vi.fn(),
  getAcademyProductCatalog: vi.fn(),
  getUserByAuthId: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: createSession } } },
}))
vi.mock("@/lib/academy-entitlements", () => ({
  getAcademyEntitlementState,
  getAcademyProductCatalog,
}))
vi.mock("@/lib/supabase/server", () => ({
  createServerClient,
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId }))

import { POST } from "@/app/api/academy/checkout/route"

describe("Academy checkout purchasability guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserByAuthId.mockResolvedValue({ id: "neon-user" })
    getAcademyEntitlementState.mockResolvedValue({ membershipActive: false })
  })

  it.each(["what_to_say", "show_up", "get_paid", "ai_photo_prompts"])(
    "returns 400 for explicitly DB-disabled %s without creating a Stripe session",
    async productId => {
      getAcademyProductCatalog.mockResolvedValue([
        {
          id: productId,
          purchasable: false,
          stripePriceId: `price_${productId}`,
          deliveryKind: "academy_course",
        },
      ])

      const response = await POST(
        new Request("https://sselfie.ai/api/academy/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "Invalid productId" })
      expect(createSession).not.toHaveBeenCalled()
    }
  )

  it.each([
    "what_to_say",
    "show_up",
    "get_paid",
    "ai_photo_prompts",
    "visibility_suite",
    "concept_cards_pack",
    "caption_sprint",
    "feed_reset_9grid",
    "ai_photo_refresh",
    "editing_masterclass",
    "branded_by_sselfie",
    "brand_strategy_pack",
    "selfie_guide_bundle",
    "selfie_guide",
    "selfie_to_brand_shoot_system",
    "academy_mini_product",
  ])(
    "hard-denies retired Academy sale id %s before catalog or Stripe even when catalog would allow it",
    async productId => {
      getAcademyProductCatalog.mockResolvedValue([
        {
          id: productId,
          purchasable: true,
          stripePriceId: `price_${productId}`,
          deliveryKind: "academy_course",
        },
      ])

      const response = await POST(
        new Request("https://sselfie.ai/api/academy/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "Invalid productId" })
      expect(getAcademyProductCatalog).not.toHaveBeenCalled()
      expect(getAcademyEntitlementState).not.toHaveBeenCalled()
      expect(createServerClient).not.toHaveBeenCalled()
      expect(createSession).not.toHaveBeenCalled()
    }
  )

  it.each([
    ["starter_kit", "/checkout/starter-kit"],
    ["masterclass", "/checkout/masterclass"],
    ["prompt_vault", "/checkout/prompt-vault"],
    ["presets_single", "/checkout/presets?tier=single"],
    ["presets_bundle", "/checkout/presets?tier=bundle"],
    ["selfie_visibility_bundle", "/checkout/one-selfie"],
    ["selfie_ai_photos_kit", "/checkout/selfie-to-ai-photos-kit"],
  ])(
    "routes current product %s away from the generic Academy API to %s",
    async (productId, purchaseUrl) => {
      const response = await POST(
        new Request("https://sselfie.ai/api/academy/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: "This product uses a dedicated checkout flow.",
        purchaseUrl,
      })
      expect(getAcademyProductCatalog).not.toHaveBeenCalled()
      expect(createServerClient).not.toHaveBeenCalled()
      expect(createSession).not.toHaveBeenCalled()
    }
  )

  it.each([["unknown_product"], [123], [null], [{}]])(
    "fails closed for malformed or unknown productId %j before auth or Stripe",
    async productId => {
      const response = await POST(
        new Request("https://sselfie.ai/api/academy/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "Invalid productId" })
      expect(getAcademyProductCatalog).not.toHaveBeenCalled()
      expect(createServerClient).not.toHaveBeenCalled()
      expect(createSession).not.toHaveBeenCalled()
    }
  )

  it("fails closed for malformed JSON before auth or Stripe", async () => {
    const response = await POST(
      new Request("https://sselfie.ai/api/academy/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Invalid productId" })
    expect(getAcademyProductCatalog).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it("hard-denies a retired Academy sale before a failed catalog lookup can reopen it", async () => {
    getAcademyProductCatalog.mockRejectedValue(new Error("catalog unavailable"))

    const response = await POST(
      new Request("https://sselfie.ai/api/academy/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "what_to_say" }),
      })
    )

    expect(response.status).toBe(400)
    expect(getAcademyProductCatalog).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })
})
