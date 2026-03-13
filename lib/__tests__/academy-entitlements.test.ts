import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const neonFactoryMock = vi.fn(() => sqlMock)

vi.mock("@neondatabase/serverless", () => ({
  neon: neonFactoryMock,
}))

describe("academy entitlements", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = "postgres://unit-test"
  })

  it("expands selfie_guide_bundle into guide and brand strategy access", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("product_type = ANY")) return []
      if (query.includes("FROM user_entitlements")) {
        return [
          {
            product_id: "selfie_guide_bundle",
            valid_from: "2026-03-01T00:00:00.000Z",
            source: "purchase",
          },
        ]
      }

      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("user_1")

    expect(state.accessibleProductIds).toEqual(
      expect.arrayContaining(["selfie_guide_bundle", "selfie_guide", "brand_strategy_pack"])
    )
  })

  it("builds private access URLs for direct products when access comes from membership", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("product_type = ANY"))
        return [{ exists: 1 }]
      if (query.includes("FROM user_entitlements")) return []

      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("member_1")
    const selfieGuide = state.catalog.find(product => product.id === "selfie_guide")

    expect(selfieGuide).toMatchObject({
      hasAccess: true,
      accessSource: "membership",
      accessUrl: "/academy/access/selfie-guide",
      purchaseUrl: "/selfie-guide",
    })
  })
})
