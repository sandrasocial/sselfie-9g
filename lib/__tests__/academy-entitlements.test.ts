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

  it("recovers Prompt Vault access from successful Stripe payments", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM user_entitlements")) {
        throw new Error("simulate legacy entitlement table miss")
      }
      if (query.includes("FROM stripe_payments")) {
        return [
          {
            product_type: "prompt_vault",
            metadata_product_id: null,
            valid_from: "2026-05-25T00:00:00.000Z",
            status: "succeeded",
            is_test_mode: false,
          },
        ]
      }
      if (query.includes("FROM subscriptions") && query.includes("product_type = ANY")) return []

      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("user_1")
    const promptVault = state.catalog.find(product => product.id === "prompt_vault")

    expect(state.accessibleProductIds).toContain("prompt_vault")
    expect(promptVault).toMatchObject({
      hasAccess: true,
      accessSource: "purchase",
      accessUrl: "/academy/access/prompt-vault",
      purchaseUrl: "/prompt-vault",
    })
  })

  it.each([
    ["user_entitlements", "what_to_say", "admin_grant"],
    ["academy_course_purchases", "show_up", "academy_course_purchase"],
    ["subscriptions", "get_paid", "legacy_subscription"],
    ["stripe_payments", "what_to_say", "stripe_payment"],
  ])("preserves valid %s ownership when every other ownership source fails", async (source, productId, expectedSource) => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []

      const ownershipSource = [
        "user_entitlements",
        "academy_course_purchases",
        "subscriptions",
        "stripe_payments",
      ].find(candidate => query.includes(`FROM ${candidate}`))

      if (!ownershipSource) return []
      if (ownershipSource !== source) throw new Error(`${ownershipSource} unavailable`)

      if (source === "stripe_payments") {
        return [{
          product_type: productId,
          metadata_product_id: null,
          valid_from: "2026-06-01T00:00:00.000Z",
          status: "succeeded",
          is_test_mode: false,
        }]
      }

      return [{
        product_id: productId,
        valid_from: "2026-06-01T00:00:00.000Z",
        source: expectedSource,
      }]
    })

    const { getAcademyExplicitOwnership } = await import("@/lib/academy-entitlements")
    const ownership = await getAcademyExplicitOwnership("owner_1")

    expect(ownership).toEqual([expect.objectContaining({
      productId,
      sources: [expectedSource],
    })])
  })

  it("normalizes current Academy Stripe metadata and preserves legacy exact product types", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (query.includes("FROM stripe_payments")) {
        return [
          {
            product_type: "academy_mini_product",
            metadata_product_id: "what_to_say",
            valid_from: "2026-06-01T00:00:00.000Z",
            status: "succeeded",
            is_test_mode: false,
          },
          {
            product_type: "show_up",
            metadata_product_id: null,
            valid_from: "2026-06-02T00:00:00.000Z",
            status: "succeeded",
            is_test_mode: false,
          },
        ]
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("owner_1")

    expect(state.accessibleProductIds).toEqual(
      expect.arrayContaining(["what_to_say", "show_up"]),
    )
  })

  it("rejects test, unsuccessful, malformed, and unknown Academy Stripe ownership", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (query.includes("FROM stripe_payments")) {
        return [
          { product_type: "academy_mini_product", metadata_product_id: "what_to_say", status: "failed", is_test_mode: false },
          { product_type: "academy_mini_product", metadata_product_id: "show_up", status: "succeeded", is_test_mode: true },
          { product_type: "academy_mini_product", metadata_product_id: null, status: "succeeded", is_test_mode: false },
          { product_type: "academy_mini_product", metadata_product_id: "not_an_academy_product", status: "succeeded", is_test_mode: false },
          { product_type: "not_an_academy_product", metadata_product_id: "get_paid", status: "succeeded", is_test_mode: false },
        ]
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("owner_1")

    expect(state.explicitProductIds).toEqual([])
  })

  it("keeps explicit inactive product access and expands visibility suite aliases", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) {
        return [{ product_id: "what_to_say", active: false }]
      }
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (query.includes("FROM academy_course_purchases")) {
        return [{
          product_id: "visibility_suite",
          valid_from: "2026-06-01T00:00:00.000Z",
          source: "migration_backfill",
        }]
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("owner_1")
    const whatToSay = state.catalog.find(product => product.id === "what_to_say")

    expect(state.accessibleProductIds).toEqual(
      expect.arrayContaining(["visibility_suite", "what_to_say", "show_up", "get_paid"]),
    )
    expect(state.directExplicitProductIds).toEqual(["visibility_suite"])
    expect(whatToSay).toMatchObject({ active: false, hasAccess: true, accessSource: "purchase" })
  })

  it("collapses entitlement expansion rows to the purchased base product", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM user_entitlements")) {
        return ["visibility_suite", "what_to_say", "show_up", "get_paid"].map(productId => ({
          product_id: productId,
          purchased_product_id: "visibility_suite",
          valid_from: "2026-06-01T00:00:00.000Z",
          source: "purchase",
        }))
      }
      return []
    })

    const { getAcademyExplicitOwnership } = await import("@/lib/academy-entitlements")
    const ownership = await getAcademyExplicitOwnership("suite_owner")

    expect(ownership).toEqual([{
      productId: "visibility_suite",
      purchasedAt: "2026-06-01T00:00:00.000Z",
      sources: ["purchase"],
    }])
  })

  it("preserves every One Selfie direct grant instead of collapsing to its purchase id", async () => {
    const directGrants = [
      "selfie_visibility_bundle",
      "masterclass",
      "starter_kit",
      "prompt_vault",
    ]
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (query.includes("FROM user_entitlements")) {
        return directGrants.map(productId => ({
          product_id: productId,
          purchased_product_id: "selfie_visibility_bundle",
          valid_from: "2026-06-01T00:00:00.000Z",
          source: "purchase",
        }))
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("one_selfie_owner")

    expect(state.directExplicitProductIds).toEqual(expect.arrayContaining(directGrants))
    expect(state.accessibleProductIds).toEqual(expect.arrayContaining(directGrants))
    expect(state.catalog.find(product => product.id === "masterclass")).toMatchObject({
      hasAccess: true,
      accessSource: "purchase",
    })
  })

  it.each(["stripe_payments", "subscriptions"])(
    "expands One Selfie bundle access from isolated %s ownership when entitlements are unavailable",
    async ownershipSource => {
      sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(" ")
        if (query.includes("FROM academy_products")) return []
        if (query.includes("FROM academy_product_overrides")) return []
        if (query.includes("FROM user_entitlements")) {
          throw new Error("user_entitlements unavailable")
        }
        if (query.includes("FROM academy_course_purchases")) return []
        if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
        if (query.includes("FROM subscriptions")) {
          return ownershipSource === "subscriptions"
            ? [
                {
                  product_id: "selfie_visibility_bundle",
                  valid_from: "2026-06-01T00:00:00.000Z",
                  source: "legacy_subscription",
                },
              ]
            : []
        }
        if (query.includes("FROM stripe_payments")) {
          return ownershipSource === "stripe_payments"
            ? [
                {
                  product_type: "selfie_visibility_bundle",
                  metadata_product_id: null,
                  valid_from: "2026-06-01T00:00:00.000Z",
                  status: "succeeded",
                  is_test_mode: false,
                },
              ]
            : []
        }
        return []
      })

      const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
      const state = await getAcademyEntitlementState(`one_selfie_${ownershipSource}`)

      expect(state.directExplicitProductIds).toEqual(["selfie_visibility_bundle"])
      expect(state.accessibleProductIds).toEqual(
        expect.arrayContaining([
          "selfie_visibility_bundle",
          "masterclass",
          "starter_kit",
          "prompt_vault",
          "brand_strategy_pack",
          "branded_by_sselfie",
          "editing_masterclass",
        ]),
      )
    },
  )

  it("excludes membership-sourced and arbitrary user entitlement rows", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (query.includes("FROM user_entitlements")) {
        return [
          { product_id: "what_to_say", valid_from: "2026-06-01T00:00:00.000Z", source: "membership" },
          { product_id: "academy_mini_product", valid_from: "2026-06-01T00:00:00.000Z", source: "purchase" },
          { product_id: "arbitrary_product", valid_from: "2026-06-01T00:00:00.000Z", source: "admin_grant" },
        ]
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("owner_1")

    expect(state.directExplicitProductIds).toEqual([])
    expect(state.accessibleProductIds).toEqual([])
  })

  it("fails closed when every explicit ownership source is unavailable", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM academy_products")) return []
      if (query.includes("FROM academy_product_overrides")) return []
      if (query.includes("FROM subscriptions") && query.includes("COALESCE(plan")) return []
      if (["user_entitlements", "academy_course_purchases", "subscriptions", "stripe_payments"]
        .some(source => query.includes(`FROM ${source}`))) {
        throw new Error("ownership source unavailable")
      }
      return []
    })

    const { getAcademyEntitlementState } = await import("@/lib/academy-entitlements")
    const state = await getAcademyEntitlementState("owner_1")

    expect(state.explicitProductIds).toEqual([])
    expect(state.accessibleProductIds).toEqual([])
  })
})
