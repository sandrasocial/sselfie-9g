// @vitest-environment node

import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  CATALOG_SHADOW_FINDING_CODES,
  createCatalogShadowReport,
  serializeCatalogShadowReport,
  type CatalogShadowCodeProductSnapshot,
  type CatalogShadowDatabaseOverrideSnapshot,
  type CatalogShadowDatabaseProductSnapshot,
  type CatalogShadowDatabaseSnapshot,
  type CatalogShadowEffectiveAcademySnapshot,
  type CatalogShadowInput,
  type CatalogShadowProvenance,
  type CatalogShadowPublicCopySnapshot,
} from "@/lib/catalog/catalog-shadow"

const NOW = new Date("2026-08-20T12:00:00.000Z")
const code = (location: string): CatalogShadowProvenance => ({ source: "code", location })
const database = (location: string): CatalogShadowProvenance => ({ source: "database", location })
const environment = (location: string): CatalogShadowProvenance => ({
  source: "environment",
  location,
})
const runtimeProjection = (location: string): CatalogShadowProvenance => ({
  source: "runtime_projection",
  location,
  observation: "academy_effective",
})

function baseInput(
  codeProducts: CatalogShadowCodeProductSnapshot[],
  databaseSnapshot:
    | CatalogShadowDatabaseSnapshot
    | {
        state: "available"
        products: CatalogShadowDatabaseProductSnapshot[]
        overrides: CatalogShadowDatabaseOverrideSnapshot[]
        provenance: CatalogShadowProvenance
      }
    | {
        state: "empty" | "missing" | "unavailable"
        reason?: string
        provenance: CatalogShadowProvenance
      } = {
    state: "empty",
    provenance: database("academy_products"),
  },
  academyEffective: CatalogShadowEffectiveAcademySnapshot = {
    state: "empty",
    provenance: {
      ...runtimeProjection("getAcademyProductCatalog()"),
    },
  },
  publicCopy: CatalogShadowPublicCopySnapshot = {
    state: "complete",
    probes: [],
    provenance: { source: "public_copy", location: "public surfaces" },
  }
): CatalogShadowInput {
  const normalizedDatabase: CatalogShadowDatabaseSnapshot =
    "state" in databaseSnapshot
      ? databaseSnapshot.state === "available"
        ? {
            products: {
              state: databaseSnapshot.products.length ? "available" : "empty",
              rows: databaseSnapshot.products,
              provenance: databaseSnapshot.provenance,
            } as CatalogShadowDatabaseSnapshot["products"],
            overrides: {
              state: databaseSnapshot.overrides.length ? "available" : "empty",
              rows: databaseSnapshot.overrides,
              provenance: databaseSnapshot.provenance,
            } as CatalogShadowDatabaseSnapshot["overrides"],
          }
        : {
            products: {
              state: databaseSnapshot.state,
              reason: databaseSnapshot.reason,
              provenance: databaseSnapshot.provenance,
            },
            overrides: {
              state: databaseSnapshot.state,
              reason: databaseSnapshot.reason,
              provenance: databaseSnapshot.provenance,
            },
          }
      : databaseSnapshot
  return {
    now: NOW,
    codeProducts,
    database: normalizedDatabase,
    academyEffective,
    publicCopy,
  }
}

function codes(report: ReturnType<typeof createCatalogShadowReport>, productId: string) {
  return report.findings.filter(item => item.productId === productId).map(item => item.code)
}

describe("catalogue shadow conflicts", () => {
  it("covers the complete stable finding-code contract", () => {
    expect(CATALOG_SHADOW_FINDING_CODES).toEqual([
      "LIFECYCLE_CONFLICT",
      "DB_DISABLED_BUT_EFFECTIVE_ACTIVE",
      "DB_NONPURCHASABLE_BUT_EFFECTIVE_PURCHASABLE",
      "DB_PRICE_SHADOWED_BY_CODE",
      "PRICE_REFERENCE_CONFLICT",
      "MISSING_PRICE_CONFIGURATION",
      "DUPLICATE_STRIPE_PRICE_REFERENCE",
      "AMOUNT_CONFLICT",
      "CURRENCY_CONFLICT",
      "CURRENCY_UNKNOWN",
      "PUBLIC_PRICE_LITERAL",
      "CODE_ONLY_PRODUCT",
      "DB_ONLY_PRODUCT",
      "MISSING_REVENUE_PATH",
      "MISSING_FULFILLMENT_CONTRACT",
      "REPORT_FAILURE",
    ])
  })

  it.each(["one_time_session", "selfie_guide"])(
    "detects the current %s lifecycle conflict",
    productId => {
      const report = createCatalogShadowReport(
        baseInput([
          { id: productId, lifecycleStatus: "live", provenance: code("LIVE_PRICING_PRODUCTS") },
          { id: productId, lifecycleStatus: "archived", provenance: code("PRODUCT_REVENUE_PATHS") },
        ])
      )
      expect(codes(report, productId)).toContain("LIFECYCLE_CONFLICT")
    }
  )

  it("detects an inactive database row reintroduced by fallback", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [{ id: "hidden", effectiveActive: true, provenance: code("fallback") }],
        {
          state: "available",
          provenance: database("academy_products"),
          products: [
            {
              id: "hidden",
              active: false,
              purchasable: false,
              provenance: { ...database("hidden"), observation: "academy_db" },
            },
          ],
          overrides: [],
        },
        {
          state: "available",
          provenance: {
            ...database("getAcademyProductCatalog()"),
            observation: "academy_effective",
          },
          products: [
            {
              id: "hidden",
              active: true,
              purchasable: false,
              provenance: {
                ...database("effective:hidden"),
                observation: "academy_effective",
              },
            },
          ],
        }
      )
    )
    expect(codes(report, "hidden")).toContain("DB_DISABLED_BUT_EFFECTIVE_ACTIVE")
  })

  it("detects database non-purchasable overridden true", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [{ id: "course", effectivePurchasable: true, provenance: code("fallback") }],
        {
          state: "available",
          provenance: database("academy_products"),
          products: [
            {
              id: "course",
              active: true,
              purchasable: false,
              provenance: { ...database("course"), observation: "academy_db" },
            },
          ],
          overrides: [],
        },
        {
          state: "available",
          provenance: {
            ...database("getAcademyProductCatalog()"),
            observation: "academy_effective",
          },
          products: [
            {
              id: "course",
              active: true,
              purchasable: true,
              provenance: {
                ...database("effective:course"),
                observation: "academy_effective",
              },
            },
          ],
        }
      )
    )
    expect(codes(report, "course")).toContain("DB_NONPURCHASABLE_BUT_EFFECTIVE_PURCHASABLE")
  })

  it("treats an inactive override as disabled when effective Academy is active", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [],
        {
          state: "available",
          provenance: database("academy tables"),
          products: [],
          overrides: [
            {
              productId: "course",
              active: false,
              provenance: { ...database("override:course"), observation: "academy_override" },
            },
          ],
        },
        {
          state: "available",
          provenance: runtimeProjection("catalog"),
          products: [
            {
              id: "course",
              active: true,
              purchasable: false,
              provenance: runtimeProjection("catalog:course"),
            },
          ],
        }
      )
    )
    expect(codes(report, "course")).toContain("DB_DISABLED_BUT_EFFECTIVE_ACTIVE")
  })

  it("finds conflicting amounts and currencies", () => {
    const report = createCatalogShadowReport(
      baseInput([
        { id: "priced", amountCents: 1900, currency: "usd", provenance: code("a") },
        { id: "priced", amountCents: 2900, currency: "eur", provenance: code("b") },
      ])
    )
    expect(codes(report, "priced")).toEqual(
      expect.arrayContaining(["AMOUNT_CONFLICT", "CURRENCY_CONFLICT"])
    )
  })

  it("detects database price shadowed by code and the effective reference conflict", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [
          {
            id: "course",
            priceReferences: [
              {
                envKey: "STRIPE_PRICE_COURSE",
                priceId: "price_code",
                status: "configured_unverified",
                provenance: environment("STRIPE_PRICE_COURSE"),
              },
            ],
            provenance: code("fallback"),
          },
        ],
        {
          state: "available",
          provenance: database("academy_products"),
          products: [
            {
              id: "course",
              active: true,
              purchasable: true,
              stripePriceId: "price_database",
              provenance: { ...database("course"), observation: "academy_db" },
            },
          ],
          overrides: [],
        },
        {
          state: "available",
          provenance: {
            ...database("getAcademyProductCatalog()"),
            observation: "academy_effective",
          },
          products: [
            {
              id: "course",
              active: true,
              purchasable: true,
              stripePriceId: "price_code",
              provenance: {
                ...database("effective:course"),
                observation: "academy_effective",
              },
            },
          ],
        }
      )
    )
    expect(codes(report, "course")).toEqual(
      expect.arrayContaining(["DB_PRICE_SHADOWED_BY_CODE", "PRICE_REFERENCE_CONFLICT"])
    )
  })

  it("selects Prompt Vault before/after references from injected now", () => {
    const product: CatalogShadowCodeProductSnapshot = {
      id: "prompt_vault",
      priceReferences: [
        {
          envKey: "BEFORE",
          priceId: "price_before",
          status: "configured_unverified",
          effectiveUntil: "2026-06-26T22:01:00.000Z",
          provenance: environment("BEFORE"),
        },
        {
          envKey: "AFTER",
          priceId: "price_after",
          status: "configured_unverified",
          effectiveFrom: "2026-06-26T22:01:00.000Z",
          provenance: environment("AFTER"),
        },
      ],
      provenance: code("prompt-vault"),
    }
    const before = createCatalogShadowReport({
      ...baseInput([product]),
      now: new Date("2026-06-26T22:00:59.000Z"),
    })
    const after = createCatalogShadowReport({
      ...baseInput([product]),
      now: new Date("2026-06-26T22:01:00.000Z"),
    })
    expect(codes(before, "prompt_vault")).not.toContain("PRICE_REFERENCE_CONFLICT")
    expect(codes(after, "prompt_vault")).not.toContain("PRICE_REFERENCE_CONFLICT")
  })

  it("uses the explicitly selected price reference at the observation time", () => {
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "vault_maya",
          priceReferences: [
            {
              envKey: "FOUNDER",
              priceId: "price_founder",
              status: "configured_unverified",
              selectedAtObservation: true,
              provenance: environment("FOUNDER"),
            },
            {
              envKey: "STANDARD",
              priceId: "price_standard",
              status: "configured_unverified",
              selectedAtObservation: false,
              provenance: environment("STANDARD"),
            },
          ],
          provenance: code("vault-maya"),
        },
      ])
    )
    expect(codes(report, "vault_maya")).not.toContain("PRICE_REFERENCE_CONFLICT")
  })

  it("preserves selectedAtObservation in price-reference dedupe", () => {
    const provenance = environment("SAME")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "selection",
          priceReferences: [
            {
              envKey: "SAME",
              priceId: "price_same",
              status: "configured_unverified",
              selectedAtObservation: true,
              provenance,
            },
            {
              envKey: "SAME",
              priceId: "price_same",
              status: "configured_unverified",
              selectedAtObservation: false,
              provenance,
            },
          ],
          provenance: code("selection"),
        },
      ])
    )
    expect(report.rows[0].priceReferences).toHaveLength(2)
  })

  it("preserves scenario and condition in price-reference dedupe", () => {
    const provenance = environment("ANNUAL")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "annual",
          priceReferences: [
            {
              envKey: "ANNUAL",
              priceId: "price_same",
              status: "configured_unverified",
              scenario: "annual_membership_plan",
              condition: "founding",
              provenance,
            },
            {
              envKey: "ANNUAL",
              priceId: "price_same",
              status: "configured_unverified",
              scenario: "annual_membership_plan",
              condition: "standard",
              provenance,
            },
          ],
          provenance: code("annual"),
        },
      ])
    )
    expect(report.rows[0].priceReferences).toHaveLength(2)
  })

  it("does not treat a private pilot's live operational path as a lifecycle conflict", () => {
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "maya_essential_pilot",
          privatePilot: true,
          lifecycleStatus: "private",
          provenance: code("private product"),
        },
        {
          id: "maya_essential_pilot",
          lifecycleStatus: "live",
          provenance: code("live fulfillment path"),
        },
      ])
    )
    expect(codes(report, "maya_essential_pilot")).not.toContain("LIFECYCLE_CONFLICT")
  })

  it("keeps private pilot separate and preserves annual/founding aliases", () => {
    const provenance = code("private-and-aliases")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "maya_essential_pilot",
          privatePilot: true,
          lifecycleStatus: "private",
          effectivePurchasable: true,
          priceMode: "inline",
          revenuePath: "private:checkout",
          fulfillmentContract: "private:fulfillment",
          provenance,
        },
        {
          id: "sselfie_studio_membership_annual",
          aliases: [
            { kind: "product_id", value: "sselfie_studio_membership_annual", provenance },
            { kind: "product_type", value: "sselfie_studio_membership", provenance },
            { kind: "plan", value: "annual", provenance },
            { kind: "plan", value: "founding_annual", provenance },
          ],
          provenance,
        },
      ])
    )
    const pilot = report.rows.find(row => row.id === "maya_essential_pilot")!
    const annual = report.rows.find(row => row.id === "sselfie_studio_membership_annual")!
    expect(pilot.privatePilot).toBe(true)
    expect(pilot.saleEligibility).toBe("private")
    expect(annual.aliases.map(alias => `${alias.kind}:${alias.value}`)).toEqual(
      expect.arrayContaining([
        "product_id:sselfie_studio_membership_annual",
        "product_type:sselfie_studio_membership",
        "plan:annual",
        "plan:founding_annual",
      ])
    )
  })

  it("retains code-only and database-only products", () => {
    const report = createCatalogShadowReport(
      baseInput([{ id: "code_only", provenance: code("products") }], {
        state: "available",
        provenance: database("academy_products"),
        products: [
          { id: "db_only", active: true, purchasable: false, provenance: database("db_only") },
        ],
        overrides: [],
      })
    )
    expect(report.rows.map(row => row.id)).toEqual(["code_only", "db_only"])
    expect(codes(report, "code_only")).toContain("CODE_ONLY_PRODUCT")
    expect(codes(report, "db_only")).toContain("DB_ONLY_PRODUCT")
  })

  it("preserves raw database, raw override, and effective Academy provenance separately", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [],
        {
          state: "available",
          provenance: database("academy SELECTs"),
          products: [
            {
              id: "course",
              active: false,
              purchasable: false,
              provenance: { ...database("academy_products:course"), observation: "academy_db" },
            },
          ],
          overrides: [
            {
              productId: "course",
              priceCents: 3700,
              active: true,
              provenance: {
                ...database("academy_product_overrides:course"),
                observation: "academy_override",
              },
            },
          ],
        },
        {
          state: "available",
          provenance: {
            ...database("getAcademyProductCatalog()"),
            observation: "academy_effective",
          },
          products: [
            {
              id: "course",
              active: false,
              purchasable: true,
              priceCents: 3700,
              provenance: {
                ...database("getAcademyProductCatalog():course"),
                observation: "academy_effective",
              },
            },
          ],
        }
      )
    )
    expect(report.rows[0].provenance.map(item => item.observation)).toEqual([
      "academy_db",
      "academy_effective",
      "academy_override",
    ])
    expect(report.rows[0]).toMatchObject({
      databaseActive: false,
      databasePurchasable: false,
      academyEffectiveActive: false,
      academyEffectivePurchasable: true,
    })
  })

  it("retains one raw table when the other table is unavailable", () => {
    const report = createCatalogShadowReport(
      baseInput([], {
        products: {
          state: "available",
          rows: [
            {
              id: "retained",
              active: true,
              purchasable: false,
              provenance: { ...database("academy_products:retained"), observation: "academy_db" },
            },
          ],
          provenance: database("academy_products"),
        },
        overrides: {
          state: "unavailable",
          reason: "override query failed",
          provenance: database("academy_product_overrides"),
        },
      })
    )
    expect(report.rows.map(row => row.id)).toContain("retained")
    expect(report.database.products.state).toBe("available")
    expect(report.database.overrides.state).toBe("unavailable")
  })

  it("keeps credit package variants under one product row", () => {
    const provenance = code("CREDIT_PACKAGES")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "credit_topup",
          aliases: [
            { kind: "package_id", value: "credits_topup_10", provenance },
            { kind: "package_id", value: "credits_topup_100", provenance },
            { kind: "package_id", value: "credits_topup_200", provenance },
          ],
          variants: [
            {
              id: "credits_topup_10",
              amountCents: 999,
              currency: "usd",
              credits: 10,
              priceMode: "inline",
              saleAudience: "existing_members",
              provenance,
            },
            {
              id: "credits_topup_100",
              amountCents: 4500,
              currency: "usd",
              credits: 100,
              priceMode: "inline",
              saleAudience: "existing_members",
              provenance,
            },
            {
              id: "credits_topup_200",
              amountCents: 8500,
              currency: "usd",
              credits: 200,
              priceMode: "inline",
              saleAudience: "existing_members",
              provenance,
            },
          ],
          provenance,
        },
      ])
    )
    expect(report.rows.map(row => row.id)).toEqual(["credit_topup"])
    expect(report.rows[0].variants.map(variant => variant.id)).toEqual([
      "credits_topup_10",
      "credits_topup_100",
      "credits_topup_200",
    ])
  })

  it("keeps handler entitlements, Academy aliases, and non-entitlement grants separate", () => {
    const handler = code("lib/payments/handlers/selfie-visibility-bundle.ts")
    const academy = code("lib/academy-entitlements.ts")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "selfie_visibility_bundle",
          entitlementGrants: [
            { productId: "selfie_visibility_bundle", provenance: handler },
            { productId: "masterclass", provenance: handler },
            { productId: "starter_kit", provenance: handler },
            { productId: "prompt_vault", provenance: handler },
          ],
          academyAccessAliases: [
            { productId: "branded_by_sselfie", provenance: academy },
            { productId: "editing_masterclass", provenance: academy },
          ],
          nonEntitlementGrants: [
            { kind: "preset_order", id: "presets_bundle", provenance: handler },
            {
              kind: "temporary_subscription_pass",
              id: "selfie_visibility_bundle_pass",
              provenance: handler,
            },
          ],
          provenance: handler,
        },
      ])
    )
    expect(report.rows[0].entitlementGrants.map(item => item.productId)).toEqual([
      "masterclass",
      "prompt_vault",
      "selfie_visibility_bundle",
      "starter_kit",
    ])
    expect(report.rows[0].academyAccessAliases.map(item => item.productId)).toEqual([
      "branded_by_sselfie",
      "editing_masterclass",
    ])
    expect(report.rows[0].nonEntitlementGrants.map(item => `${item.kind}:${item.id}`)).toEqual([
      "preset_order:presets_bundle",
      "temporary_subscription_pass:selfie_visibility_bundle_pass",
    ])
  })

  it("keeps the Selfie Guide strategy order-bump entitlement conditional", () => {
    const provenance = code("lib/payments/handlers/selfie-guide.ts")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "selfie_guide",
          entitlementGrants: [
            { productId: "selfie_guide", provenance },
            {
              productId: "brand_strategy_pack",
              condition: "brand strategy order-bump line item present",
              provenance,
            },
          ],
          provenance,
        },
      ])
    )
    expect(report.rows[0].entitlementGrants[0]).toEqual({
      productId: "brand_strategy_pack",
      condition: "brand strategy order-bump line item present",
      provenance,
    })
    expect(report.rows[0].entitlementGrants[1]).toEqual({
      productId: "selfie_guide",
      provenance,
    })
    expect(report.rows[0].entitlementGrants[1]).not.toHaveProperty("condition")
  })

  it("models the private one-time Work With Me product and its exact grants", () => {
    const handler = code("lib/payments/handlers/work-with-me.ts")
    const academyMasterclass: CatalogShadowProvenance = {
      source: "code",
      location: "lib/academy-entitlements.ts",
      detail: "PRODUCT_ACCESS_ALIASES.masterclass",
    }
    const academyBrandShoot: CatalogShadowProvenance = {
      source: "code",
      location: "lib/academy-entitlements.ts",
      detail: "PRODUCT_ACCESS_ALIASES.selfie_to_brand_shoot_system",
    }
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "work_with_me",
          lifecycleStatus: "private",
          amountCents: 200000,
          currency: "eur",
          billingInterval: "one_time",
          priceMode: "stripe_price",
          priceReferences: [
            {
              envKey: "STRIPE_PRICE_WORK_WITH_ME",
              priceId: "price_work_with_me",
              status: "configured_unverified",
              provenance: code("lib/work-with-me/checkout.ts"),
            },
          ],
          entitlementGrants: [
            "work_with_me",
            "masterclass",
            "brand_strategy_pack",
            "selfie_to_brand_shoot_system",
            "prompt_vault",
          ].map(productId => ({ productId, provenance: handler })),
          academyAccessAliases: [
            { productId: "brand_strategy_pack", provenance: academyMasterclass },
            { productId: "brand_strategy_pack", provenance: academyBrandShoot },
            { productId: "branded_by_sselfie", provenance: academyMasterclass },
            { productId: "editing_masterclass", provenance: academyMasterclass },
          ],
          revenuePath: "lib/work-with-me/checkout.ts:createWorkWithMeCheckoutLink",
          fulfillmentContract: "lib/payments/handlers/work-with-me.ts:handleWorkWithMeCheckout",
          provenance: code("lib/work-with-me/checkout.ts"),
        },
      ])
    )
    const row = report.rows[0]
    expect(row).toMatchObject({
      id: "work_with_me",
      amountCents: [200000],
      currencies: ["eur"],
      billingIntervals: ["one_time"],
      saleEligibility: "private",
    })
    expect(row.entitlementGrants).toEqual([
      { productId: "brand_strategy_pack", provenance: handler },
      { productId: "masterclass", provenance: handler },
      { productId: "prompt_vault", provenance: handler },
      { productId: "selfie_to_brand_shoot_system", provenance: handler },
      { productId: "work_with_me", provenance: handler },
    ])
    expect(row.academyAccessAliases).toEqual([
      { productId: "brand_strategy_pack", provenance: academyMasterclass },
      { productId: "brand_strategy_pack", provenance: academyBrandShoot },
      { productId: "branded_by_sselfie", provenance: academyMasterclass },
      { productId: "editing_masterclass", provenance: academyMasterclass },
    ])
  })

  it("preserves Maya Essential pilot plan alias with its defining provenance", () => {
    const provenance = code("lib/business/maya-tier-pilot.ts")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "maya_essential_pilot",
          aliases: [{ kind: "plan", value: "maya_essential_pilot", provenance }],
          provenance: code("private pilot"),
        },
      ])
    )
    expect(report.rows[0].aliases).toContainEqual({
      kind: "plan",
      value: "maya_essential_pilot",
      provenance,
    })
  })

  it("preserves SUITE membership product and pilot aliases", () => {
    const provenance = code("membership aliases")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "sselfie_studio_membership",
          aliases: [
            { kind: "product_type", value: "brand_studio_membership", provenance },
            { kind: "product_type", value: "pro", provenance },
            { kind: "plan", value: "maya_pro_pilot", provenance },
          ],
          provenance,
        },
      ])
    )
    expect(report.rows[0].aliases.map(alias => `${alias.kind}:${alias.value}`)).toEqual(
      expect.arrayContaining([
        "product_type:brand_studio_membership",
        "product_type:pro",
        "plan:maya_pro_pilot",
      ])
    )
  })

  it("does not treat conditional price branches as simultaneous conflicts", () => {
    const provenance = environment("annual")
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "annual",
          effectivePurchasable: true,
          priceMode: "stripe_price",
          priceReferences: [
            {
              envKey: "FOUNDING",
              priceId: "price_founding",
              status: "configured_unverified",
              scenario: "annual_membership_plan",
              condition: "requestedPlan=founding and foundingStatus.available",
              provenance,
            },
            {
              envKey: "STANDARD",
              priceId: "price_standard",
              status: "configured_unverified",
              scenario: "annual_membership_plan",
              condition: "otherwise",
              provenance,
            },
          ],
          revenuePath: "/checkout/membership?interval=year",
          fulfillmentContract: "subscription",
          provenance: code("annual"),
        },
      ])
    )
    expect(codes(report, "annual")).not.toContain("PRICE_REFERENCE_CONFLICT")
    expect(codes(report, "annual")).not.toContain("MISSING_PRICE_CONFIGURATION")
  })

  it.each(["empty", "missing", "unavailable"] as const)(
    "distinguishes the %s database state without promoting it to available",
    state => {
      const report = createCatalogShadowReport(
        baseInput([], {
          state,
          reason: state === "empty" ? undefined : state,
          provenance: database("academy_products"),
        })
      )
      expect(report.database.products.state).toBe(state)
      expect(report.database.overrides.state).toBe(state)
      expect(report.rows).toEqual([])
    }
  )

  it("does not promote a sale while source evidence is unavailable", () => {
    const input = baseInput(
      [
        {
          id: "candidate",
          effectivePurchasable: true,
          provenance: code("candidate"),
        },
      ],
      {
        state: "unavailable",
        reason: "database unavailable",
        provenance: database("academy_products"),
      }
    )
    expect(createCatalogShadowReport(input).rows[0].saleEligibility).toBe("unknown")
  })

  it("detects duplicate configured Stripe IDs across products", () => {
    const priceReference = (envKey: string) => ({
      envKey,
      priceId: "price_duplicate",
      status: "configured_unverified" as const,
      provenance: environment(envKey),
    })
    const report = createCatalogShadowReport(
      baseInput([
        { id: "a", priceReferences: [priceReference("A")], provenance: code("a") },
        { id: "b", priceReferences: [priceReference("B")], provenance: code("b") },
      ])
    )
    expect(codes(report, "a")).toContain("DUPLICATE_STRIPE_PRICE_REFERENCE")
    expect(codes(report, "b")).toContain("DUPLICATE_STRIPE_PRICE_REFERENCE")
  })

  it("never infers currency and flags public price literals", () => {
    const report = createCatalogShadowReport({
      ...baseInput([
        {
          id: "priced",
          amountCents: 3700,
          currency: null,
          provenance: code("products"),
        },
      ]),
      publicCopy: {
        state: "complete",
        provenance: { source: "public_copy", location: "public surfaces" },
        probes: [
          {
            productId: "priced",
            literal: "$37",
            status: "observed",
            amountCents: 3700,
            currency: "usd",
            provenance: { source: "public_copy", location: "page.tsx" },
          },
        ],
      },
    })
    expect(report.rows[0].currencies).toEqual([])
    expect(codes(report, "priced")).toEqual(
      expect.arrayContaining(["CURRENCY_UNKNOWN", "PUBLIC_PRICE_LITERAL"])
    )
  })

  it("compares parsed public amount and currency observations", () => {
    const report = createCatalogShadowReport({
      ...baseInput([
        {
          id: "priced",
          amountCents: 3700,
          currency: "usd",
          provenance: code("products"),
        },
      ]),
      publicCopy: {
        state: "partial",
        provenance: { source: "public_copy", location: "public surfaces" },
        probes: [
          {
            productId: "priced",
            literal: "€39",
            status: "observed",
            amountCents: 3900,
            currency: "eur",
            provenance: { source: "public_copy", location: "page.tsx:1" },
          },
          {
            productId: "priced",
            literal: "$37",
            status: "missing",
            reason: "not found",
            provenance: { source: "public_copy", location: "other.tsx" },
          },
        ],
      },
    })
    expect(codes(report, "priced")).toEqual(
      expect.arrayContaining(["AMOUNT_CONFLICT", "CURRENCY_CONFLICT"])
    )
    expect(report.publicCopy.state).toBe("partial")
  })

  it("represents unavailable public-copy evidence instead of silently treating it as empty", () => {
    const report = createCatalogShadowReport({
      ...baseInput([]),
      publicCopy: {
        state: "unavailable",
        probes: [
          {
            productId: "priced",
            literal: "$37",
            status: "unavailable",
            reason: "source unavailable",
            provenance: { source: "public_copy", location: "page.tsx" },
          },
        ],
        provenance: { source: "public_copy", location: "public surfaces" },
      },
    })
    expect(report.publicCopy).toMatchObject({ state: "unavailable" })
    expect(report.findings).toEqual([])
  })

  it("detects missing price, revenue path, and fulfillment contracts", () => {
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "broken_sale",
          effectivePurchasable: true,
          amountCents: 3700,
          priceMode: "stripe_price",
          provenance: code("products"),
        },
      ])
    )
    expect(codes(report, "broken_sale")).toEqual(
      expect.arrayContaining([
        "MISSING_PRICE_CONFIGURATION",
        "MISSING_REVENUE_PATH",
        "MISSING_FULFILLMENT_CONTRACT",
      ])
    )
  })

  it("does not let a database price hide a missing checkout environment price", () => {
    const report = createCatalogShadowReport(
      baseInput(
        [
          {
            id: "checkout_env_missing",
            effectivePurchasable: true,
            priceMode: "stripe_price",
            priceReferences: [
              {
                envKey: "STRIPE_PRICE_CHECKOUT_ENV_MISSING",
                priceId: null,
                status: "missing",
                selectedAtObservation: true,
                provenance: environment("STRIPE_PRICE_CHECKOUT_ENV_MISSING"),
              },
            ],
            revenuePath: "/checkout/example",
            fulfillmentContract: "checkout.session.completed:example",
            provenance: code("products"),
          },
        ],
        {
          state: "available",
          provenance: database("academy_products"),
          products: [
            {
              id: "checkout_env_missing",
              active: true,
              purchasable: true,
              stripePriceId: "price_database_only",
              provenance: { ...database("checkout_env_missing"), observation: "academy_db" },
            },
          ],
          overrides: [],
        },
        {
          state: "available",
          provenance: runtimeProjection("getAcademyProductCatalog()"),
          products: [
            {
              id: "checkout_env_missing",
              active: true,
              purchasable: true,
              stripePriceId: "price_database_only",
              provenance: runtimeProjection("effective:checkout_env_missing"),
            },
          ],
        }
      )
    )
    expect(codes(report, "checkout_env_missing")).toContain("MISSING_PRICE_CONFIGURATION")
  })

  it("keeps archived products visible but never projects them purchasable", () => {
    const report = createCatalogShadowReport(
      baseInput([
        {
          id: "legacy",
          lifecycleStatus: "archived",
          effectivePurchasable: true,
          priceMode: "inline",
          revenuePath: "legacy",
          fulfillmentContract: "historical",
          provenance: code("archive"),
        },
      ])
    )
    expect(report.rows[0]).toMatchObject({
      projectedHistoricalVisible: true,
      saleEligibility: "blocked_by_legacy",
    })
  })

  it("produces stable ordering and byte-identical JSON for identical input and now", () => {
    const input = baseInput([
      { id: "z", name: "Z", provenance: code("z") },
      { id: "a", name: "A", provenance: code("a") },
    ])
    const first = serializeCatalogShadowReport(createCatalogShadowReport(input))
    const second = serializeCatalogShadowReport(createCatalogShadowReport(input))
    expect(first).toBe(second)
    expect(createCatalogShadowReport(input).rows.map(row => row.id)).toEqual(["a", "z"])
  })

  it("emits an explicit failure status and non-empty failure finding", () => {
    const report = createCatalogShadowReport({
      ...baseInput([]),
      failure: {
        reason: "projection failed",
        provenance: code("catalog-shadow-report"),
      },
    })
    expect(report.status).toBe("failed")
    expect(codes(report, "__report__")).toContain("REPORT_FAILURE")
    expect(report.summary.findingCount).toBeGreaterThan(0)
  })
})

function filesRecursively(root: string): string[] {
  if (!statSync(root).isDirectory()) return [root]
  return readdirSync(root).flatMap(entry => filesRecursively(path.join(root, entry)))
}

describe("catalogue shadow architecture boundary", () => {
  it("is not imported by runtime checkout, webhook, payment, entitlement, or public UI consumers", () => {
    const roots = [
      "app",
      "components",
      "lib/payments",
      "lib/academy-entitlements.ts",
      "lib/products.ts",
    ]
    const forbiddenImport = /(?:@\/lib\/catalog\/catalog-shadow|lib\/catalog\/catalog-shadow)/
    const violations = roots
      .flatMap(root => filesRecursively(root))
      .filter(file => /\.(?:ts|tsx|js|jsx)$/.test(file))
      .filter(file => forbiddenImport.test(readFileSync(file, "utf8")))
    expect(violations).toEqual([])
  })

  it("keeps the report SELECT-only, stdout-only, and free of side-effect integrations", () => {
    const source = readFileSync("scripts/catalog-shadow-report.ts", "utf8")
    expect(source).toMatch(
      /SELECT id, title, active, purchasable, membership_included, stripe_price_id/
    )
    expect(source).toMatch(/SELECT product_id, price_cents, active/)
    expect(source).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/)
    expect(source).toContain("process.stdout.write")
    expect(source).not.toContain("writeFile")
    expect(source).not.toContain("stripe.prices")
    expect(source).not.toContain("sendEmail")
    expect(source).not.toContain("logAnalyticsEvent")
    expect(source).not.toContain("process.exit(1)")
  })

  it("loads environment configuration before environment-sensitive runtime imports", () => {
    const source = readFileSync("scripts/catalog-shadow-report.ts", "utf8")
    const loadIndex = source.indexOf("loadEnvConfig(process.cwd())")
    expect(loadIndex).toBeLessThan(source.indexOf('import("@/lib/products")', loadIndex))
    expect(loadIndex).toBeLessThan(
      source.indexOf('import("@/lib/academy-entitlements")', loadIndex)
    )
    expect(source).not.toMatch(
      /import\s*\{[^}]*ACADEMY_PRODUCTS[^}]*\}\s*from\s*["']@\/lib\/products["']/s
    )
  })

  it("models access expansions and credit packages without marketing tags or package rows", () => {
    const source = readFileSync("scripts/catalog-shadow-report.ts", "utf8")
    expect(source).toContain("HANDLER_ENTITLEMENT_GRANTS")
    expect(source).toContain("ACADEMY_ACCESS_ALIASES")
    expect(source).toContain('productIds: ["selfie_to_brand_shoot_system", "prompt_vault"]')
    expect(source).toContain(
      'productIds: ["selfie_visibility_bundle", "masterclass", "starter_kit", "prompt_vault"]'
    )
    expect(source).toContain("nonEntitlementGrants")
    expect(source).toContain('{ kind: "product_type", value: "brand_studio_membership"')
    expect(source).toContain('{ kind: "product_type", value: "pro"')
    expect(source).toContain('{ kind: "plan", value: "maya_pro_pilot"')
    expect(source).toContain("CREDIT_PACKAGES.map")
    expect(source).toContain('kind: "package_id"')
    expect(source).not.toContain("product.tag")
  })

  it("records conditional annual and embedded legacy checkout price branches", () => {
    const source = readFileSync("scripts/catalog-shadow-report.ts", "utf8")
    expect(source).toContain('scenario: "annual_membership_plan"')
    expect(source).toContain('condition: "requestedPlan=founding and foundingStatus.available"')
    expect(source).toContain('scenario: "legacy_visibility_suite_checkout"')
    expect(source).toContain("handler reads product.stripePriceId")
  })

  it("records conditional Selfie Guide, private Work With Me, and Maya Essential evidence", () => {
    const source = readFileSync("scripts/catalog-shadow-report.ts", "utf8")
    expect(source).toContain("brand strategy order-bump line item present")
    expect(source).toContain("STRIPE_PRICE_WORK_WITH_ME")
    expect(source).toContain("amountCents: 200000")
    expect(source).toMatch(
      /work_with_me:\s*\{\s*productIds:\s*\[\s*"work_with_me",\s*"masterclass",\s*"brand_strategy_pack",\s*"selfie_to_brand_shoot_system",\s*"prompt_vault",\s*\]/s
    )
    expect(source).toContain('value: "maya_essential_pilot"')
    expect(source).toContain('"lib/business/maya-tier-pilot.ts"')
  })
})
