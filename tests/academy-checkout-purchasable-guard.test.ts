// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createSession,
  getAcademyEntitlementState,
  getAcademyProductCatalog,
  getUserByAuthId,
} = vi.hoisted(() => ({
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
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "auth-user" } }, error: null })),
    },
  })),
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
})
