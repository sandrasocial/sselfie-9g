#!/usr/bin/env tsx

/**
 * Release 1B read-only catalogue report.
 *
 * Reads only product configuration plus raw academy_products / academy_product_overrides rows.
 * It makes no Stripe calls, performs no writes, emits no PII, writes no files, and always exits
 * zero when conflicts are found. Operational failures are represented as unavailable evidence.
 */

import { loadEnvConfig } from "@next/env"
import { readFileSync } from "node:fs"

import {
  createCatalogShadowReport,
  serializeCatalogShadowReport,
  type CatalogShadowAlias,
  type CatalogShadowCodeProductSnapshot,
  type CatalogShadowDatabaseSnapshot,
  type CatalogShadowDatabaseOverrideSnapshot,
  type CatalogShadowDatabaseProductSnapshot,
  type CatalogShadowEffectiveAcademySnapshot,
  type CatalogShadowPriceReference,
  type CatalogShadowProvenance,
  type CatalogShadowPublicCopySnapshot,
  type CatalogShadowSourceSnapshot,
} from "@/lib/catalog/catalog-shadow"
import type { PricingProduct } from "@/lib/products"

type ProductsModule = typeof import("@/lib/products")
type LaunchPricingModule = typeof import("@/lib/launch/cash-launch-pricing")

loadEnvConfig(process.cwd())

const nowArgument = process.argv
  .find(argument => argument.startsWith("--now="))
  ?.slice("--now=".length)
const parsedObservationNow = nowArgument ? new Date(nowArgument) : new Date()
const observationNow = Number.isFinite(parsedObservationNow.getTime())
  ? parsedObservationNow
  : new Date(0)
const observationClockFailure = Number.isFinite(parsedObservationNow.getTime())
  ? null
  : "invalid --now observation timestamp"

function codeProvenance(location: string, detail?: string): CatalogShadowProvenance {
  return { source: "code", location, ...(detail ? { detail } : {}) }
}

function environmentPriceReference(
  envKey: string,
  provenance: CatalogShadowProvenance,
  window?: {
    effectiveFrom?: string
    effectiveUntil?: string
    selectedAtObservation?: boolean
    scenario?: string
    condition?: string
  }
): CatalogShadowPriceReference {
  const priceId = process.env[envKey]?.trim() || null
  return {
    envKey,
    priceId,
    status: priceId ? "configured_unverified" : "missing",
    selectedAtObservation: window?.selectedAtObservation,
    scenario: window?.scenario,
    condition: window?.condition,
    effectiveFrom: window?.effectiveFrom || null,
    effectiveUntil: window?.effectiveUntil || null,
    provenance: {
      source: "environment",
      location: envKey,
      detail: `${provenance.location}; configured IDs are unverified until Stripe is read separately`,
    },
  }
}

const ENV_KEY_BY_PRODUCT_TYPE: Record<string, string | null> = {
  one_time_session: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
  paid_blueprint: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
  brand_strategy_pack: "STRIPE_PRICE_BRAND_STRATEGY_PACK",
  selfie_guide_bundle: "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE",
  selfie_guide: "STRIPE_PRICE_SELFIE_GUIDE",
  starter_kit: "STRIPE_PRICE_STARTER_KIT",
  selfie_ai_photos_kit: "STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT",
  masterclass: "STRIPE_PRICE_MASTERCLASS",
  presets_single: "STRIPE_PRICE_PRESETS_SINGLE",
  presets_bundle: "STRIPE_PRICE_PRESETS_BUNDLE",
  selfie_visibility_bundle: "STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE",
  selfie_to_brand_shoot_system: "STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM",
  sselfie_studio_membership: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
  sselfie_studio_membership_annual: "STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID",
  vault_maya: "STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID",
  campaign_outcome: null,
}

function productAliases(product: PricingProduct, foundingAnnualPlan: string): CatalogShadowAlias[] {
  const provenance = codeProvenance("lib/products.ts", product.id)
  const aliases: CatalogShadowAlias[] = [
    { kind: "product_id", value: product.id, provenance },
    { kind: "product_type", value: product.type, provenance },
  ]
  if (product.id === "sselfie_studio_membership_annual") {
    aliases.push(
      { kind: "product_type", value: "sselfie_studio_membership", provenance },
      { kind: "plan", value: "annual", provenance },
      { kind: "plan", value: foundingAnnualPlan, provenance }
    )
  }
  if (product.id === "sselfie_studio_membership") {
    aliases.push(
      { kind: "product_type", value: "brand_studio_membership", provenance },
      { kind: "product_type", value: "pro", provenance },
      { kind: "plan", value: "maya_pro_pilot", provenance }
    )
  }
  if (product.id === "maya_essential_pilot") {
    aliases.push({
      kind: "plan",
      value: "maya_essential_pilot",
      provenance: codeProvenance("lib/business/maya-tier-pilot.ts", "MAYA_ESSENTIAL_PILOT_PLAN"),
    })
  }
  return aliases
}

function priceReferencesFor(
  product: PricingProduct,
  now: Date,
  launchPricing: LaunchPricingModule
): CatalogShadowPriceReference[] {
  const provenance = codeProvenance("app/actions/landing-checkout.ts", product.id)
  if (product.id === "maya_essential_pilot") {
    return [environmentPriceReference("STRIPE_MAYA_ESSENTIAL_PILOT_PRICE_ID", provenance)]
  }
  if (product.id === "prompt_vault") {
    const flipped = launchPricing.isPromptVaultFlashPriceFlipped(now)
    const resolvedPriceId = launchPricing.resolvePromptVaultPriceId(process.env, now) || null
    const afterFlashPriceId = process.env.STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH?.trim() || null
    return [
      environmentPriceReference("STRIPE_PRICE_PROMPT_VAULT", provenance, {
        effectiveUntil: launchPricing.PROMPT_VAULT_FLASH_PRICE_FLIPS_AT,
        selectedAtObservation: !flipped || !afterFlashPriceId,
      }),
      environmentPriceReference("STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH", provenance, {
        effectiveFrom: launchPricing.PROMPT_VAULT_FLASH_PRICE_FLIPS_AT,
        selectedAtObservation: flipped && Boolean(afterFlashPriceId),
      }),
    ].map(reference => ({
      ...reference,
      provenance: {
        ...reference.provenance,
        detail: `${reference.provenance.detail}; resolver selected ${resolvedPriceId ? "a configured price" : "no price"}`,
      },
    }))
  }
  if (product.id === "vault_maya") {
    const flipped = launchPricing.isVaultMayaFounderPriceFlipped(now, process.env)
    const resolvedPriceId = launchPricing.resolveVaultMayaPriceId(process.env, now) || null
    return [
      environmentPriceReference("STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID", provenance, {
        selectedAtObservation: !flipped,
      }),
      environmentPriceReference("STRIPE_VAULT_MAYA_PRICE_ID", provenance, {
        selectedAtObservation: flipped,
      }),
    ].map(reference => ({
      ...reference,
      provenance: {
        ...reference.provenance,
        detail: `${reference.provenance.detail}; resolver selected ${resolvedPriceId ? "a configured price" : "no price"}`,
      },
    }))
  }
  if (product.id === "sselfie_studio_membership_annual") {
    return [
      environmentPriceReference("STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID", provenance, {
        scenario: "annual_membership_plan",
        condition: "requestedPlan=founding and foundingStatus.available",
      }),
      environmentPriceReference("STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID", provenance, {
        scenario: "annual_membership_plan",
        condition: "otherwise",
      }),
    ]
  }
  const envKey = ENV_KEY_BY_PRODUCT_TYPE[product.type]
  const references = envKey ? [environmentPriceReference(envKey, provenance)] : []
  const embeddedPriceId = product.stripePriceId?.trim() || null
  if (embeddedPriceId) {
    references.push({
      envKey: `PricingProduct.${product.id}.stripePriceId`,
      priceId: embeddedPriceId,
      status: "configured_unverified",
      scenario: "legacy_visibility_suite_checkout",
      condition: "product.type=visibility_suite; handler reads product.stripePriceId",
      provenance: codeProvenance(
        "app/actions/landing-checkout.ts",
        `visibility_suite -> PricingProduct.${product.id}.stripePriceId`
      ),
    })
  }
  return references
}

const ACADEMY_ACCESS_ALIASES: Readonly<Record<string, readonly string[]>> = {
  selfie_guide_bundle: ["selfie_guide", "brand_strategy_pack"],
  selfie_to_brand_shoot_system: ["brand_strategy_pack"],
  masterclass: ["brand_strategy_pack", "branded_by_sselfie", "editing_masterclass"],
  visibility_suite: [
    "what_to_say",
    "show_up",
    "get_paid",
    "concept_cards_pack",
    "caption_sprint",
    "feed_reset_9grid",
    "ai_photo_refresh",
  ],
}

const HANDLER_ENTITLEMENT_GRANTS: Readonly<
  Record<
    string,
    {
      productIds: readonly string[]
      conditionalGrants?: readonly { productId: string; condition: string }[]
      location: string
    }
  >
> = {
  starter_kit: {
    productIds: ["starter_kit"],
    location: "lib/payments/handlers/starter-kit.ts",
  },
  selfie_ai_photos_kit: {
    productIds: ["selfie_ai_photos_kit"],
    location: "lib/payments/handlers/selfie-ai-photos-kit.ts",
  },
  masterclass: {
    productIds: ["masterclass", "brand_strategy_pack"],
    location: "lib/payments/handlers/masterclass.ts",
  },
  selfie_guide: {
    productIds: ["selfie_guide"],
    conditionalGrants: [
      {
        productId: "brand_strategy_pack",
        condition: "brand strategy order-bump line item present",
      },
    ],
    location: "lib/payments/handlers/selfie-guide.ts",
  },
  selfie_guide_bundle: {
    productIds: ["selfie_guide_bundle", "brand_strategy_pack"],
    location: "lib/payments/handlers/selfie-guide.ts",
  },
  prompt_vault: {
    productIds: ["prompt_vault"],
    location: "lib/payments/handlers/prompt-vault.ts",
  },
  presets_single: {
    productIds: ["presets_single"],
    location: "lib/payments/handlers/presets.ts",
  },
  presets_bundle: {
    productIds: ["presets_bundle"],
    location: "lib/payments/handlers/presets.ts",
  },
  brand_strategy_pack: {
    productIds: ["brand_strategy_pack"],
    location: "lib/payments/handlers/brand-strategy-pack.ts",
  },
  selfie_to_brand_shoot_system: {
    productIds: ["selfie_to_brand_shoot_system", "prompt_vault"],
    location: "lib/payments/handlers/selfie-to-brand-shoot.ts",
  },
  selfie_visibility_bundle: {
    productIds: ["selfie_visibility_bundle", "masterclass", "starter_kit", "prompt_vault"],
    location: "lib/payments/handlers/selfie-visibility-bundle.ts",
  },
  work_with_me: {
    productIds: [
      "work_with_me",
      "masterclass",
      "brand_strategy_pack",
      "selfie_to_brand_shoot_system",
      "prompt_vault",
    ],
    location: "lib/payments/handlers/work-with-me.ts",
  },
  visibility_suite: {
    productIds: [
      "visibility_suite",
      "what_to_say",
      "show_up",
      "get_paid",
      "concept_cards_pack",
      "caption_sprint",
      "feed_reset_9grid",
      "ai_photo_refresh",
    ],
    location: "lib/payments/handlers/academy-products.ts",
  },
}

function academyAliasEvidence(
  purchasedProductId: string,
  directlyGrantedProductIds: readonly string[]
) {
  const sourceProductIds = Array.from(
    new Set([purchasedProductId, ...directlyGrantedProductIds])
  ).sort((left, right) => left.localeCompare(right))
  return sourceProductIds.flatMap(sourceProductId =>
    (ACADEMY_ACCESS_ALIASES[sourceProductId] || []).map(productId => ({
      productId,
      provenance: codeProvenance(
        "lib/academy-entitlements.ts",
        `PRODUCT_ACCESS_ALIASES.${sourceProductId}`
      ),
    }))
  )
}

function codeSnapshots(
  now: Date,
  products: ProductsModule,
  launchPricing: LaunchPricingModule
): CatalogShadowCodeProductSnapshot[] {
  const {
    ACADEMY_PRODUCTS,
    ARCHIVED_PRICING_PRODUCTS,
    CREDIT_PACKAGES,
    LIVE_PRICING_PRODUCTS,
    PRIVATE_PILOT_PRICING_PRODUCTS,
    PRODUCT_REVENUE_PATHS,
  } = products
  const snapshots: CatalogShadowCodeProductSnapshot[] = []
  const pricingProductIds = new Set<string>()
  const addProduct = (
    product: PricingProduct,
    lifecycleStatus: "live" | "archived" | "legacy_access_only" | "private",
    privatePilot: boolean
  ) => {
    pricingProductIds.add(product.id)
    const path = PRODUCT_REVENUE_PATHS[product.id]
    const effectivePurchasable =
      lifecycleStatus === "live" &&
      Boolean(path) &&
      !path.checkoutPath.startsWith("legacy:") &&
      !path.checkoutPath.includes("existing-buyer-access-only")
    const handlerEntitlements = HANDLER_ENTITLEMENT_GRANTS[product.id]
    const handlerEntitlementProvenance = handlerEntitlements
      ? codeProvenance(handlerEntitlements.location, "direct upsertPurchaseEntitlement call")
      : null
    const directlyGrantedProductIds = handlerEntitlements
      ? [
          ...handlerEntitlements.productIds,
          ...(handlerEntitlements.conditionalGrants || []).map(grant => grant.productId),
        ]
      : []
    snapshots.push({
      id: product.id,
      name: product.displayName,
      lifecycleStatus,
      effectiveActive: lifecycleStatus === "live" || lifecycleStatus === "private",
      effectivePurchasable,
      privatePilot,
      amountCents: product.priceInCents,
      // Currency is intentionally absent: the old PricingProduct shape does not encode it.
      currency: null,
      billingInterval:
        product.type === "sselfie_studio_membership" || product.type === "vault_maya"
          ? "month"
          : product.type === "sselfie_studio_membership_annual"
            ? "year"
            : "one_time",
      priceMode: product.type === "campaign_outcome" ? "inline" : "stripe_price",
      priceReferences: priceReferencesFor(product, now, launchPricing),
      // Marketing/customer tags are deliberately excluded from entitlement evidence.
      entitlementGrants:
        handlerEntitlements && handlerEntitlementProvenance
          ? [
              ...handlerEntitlements.productIds.map(productId => ({
                productId,
                provenance: handlerEntitlementProvenance,
              })),
              ...(handlerEntitlements.conditionalGrants || []).map(grant => ({
                ...grant,
                provenance: handlerEntitlementProvenance,
              })),
            ]
          : [],
      academyAccessAliases: academyAliasEvidence(product.id, directlyGrantedProductIds),
      nonEntitlementGrants:
        product.id === "selfie_visibility_bundle"
          ? [
              {
                kind: "preset_order" as const,
                id: "presets_bundle",
                provenance: codeProvenance(
                  "lib/payments/handlers/selfie-visibility-bundle.ts",
                  "upsertPresetOrderForPurchase tier=bundle"
                ),
              },
              {
                kind: "temporary_subscription_pass" as const,
                id: "selfie_visibility_bundle_pass",
                provenance: codeProvenance(
                  "lib/payments/handlers/selfie-visibility-bundle.ts",
                  "grantSelfieVisibilityBundlePass"
                ),
              },
            ]
          : [],
      aliases: productAliases(product, launchPricing.FOUNDING_ANNUAL_PLAN),
      revenuePath: path?.checkoutPath || null,
      fulfillmentContract: path?.fulfillmentRule || null,
      provenance: codeProvenance(
        "lib/products.ts",
        privatePilot ? "PRIVATE_PILOT_PRICING_PRODUCTS" : `${lifecycleStatus} pricing list`
      ),
    })

    if (path?.lifecycleStatus) {
      snapshots.push({
        id: product.id,
        lifecycleStatus: path.lifecycleStatus,
        revenuePath: path.checkoutPath,
        fulfillmentContract: path.fulfillmentRule,
        provenance: codeProvenance("lib/products.ts", `PRODUCT_REVENUE_PATHS.${product.id}`),
      })
    }
  }

  for (const product of LIVE_PRICING_PRODUCTS) {
    addProduct(product, product.lifecycleStatus || "live", false)
  }
  for (const product of ARCHIVED_PRICING_PRODUCTS) {
    addProduct(product, product.lifecycleStatus || "archived", false)
  }
  for (const product of PRIVATE_PILOT_PRICING_PRODUCTS) {
    addProduct(product, product.lifecycleStatus || "live", true)
  }
  const workWithMeHandler = HANDLER_ENTITLEMENT_GRANTS.work_with_me
  const workWithMeHandlerProvenance = codeProvenance(
    workWithMeHandler.location,
    "five direct upsertPurchaseEntitlement calls"
  )
  const workWithMeCheckoutProvenance = codeProvenance(
    "lib/work-with-me/checkout.ts",
    "private application checkout"
  )
  snapshots.push({
    id: "work_with_me",
    name: "Your AI Content Team",
    lifecycleStatus: "private",
    effectiveActive: true,
    effectivePurchasable: true,
    amountCents: 200000,
    currency: "eur",
    billingInterval: "one_time",
    priceMode: "stripe_price",
    priceReferences: [
      environmentPriceReference("STRIPE_PRICE_WORK_WITH_ME", workWithMeCheckoutProvenance, {
        scenario: "private_work_with_me_checkout",
        condition: "admin creates checkout for a qualified application",
      }),
    ],
    entitlementGrants: workWithMeHandler.productIds.map(productId => ({
      productId,
      provenance: workWithMeHandlerProvenance,
    })),
    academyAccessAliases: academyAliasEvidence("work_with_me", workWithMeHandler.productIds),
    aliases: [
      { kind: "product_id", value: "work_with_me", provenance: workWithMeCheckoutProvenance },
      { kind: "product_type", value: "work_with_me", provenance: workWithMeHandlerProvenance },
    ],
    revenuePath: "lib/work-with-me/checkout.ts:createWorkWithMeCheckoutLink",
    fulfillmentContract: "lib/payments/handlers/work-with-me.ts:handleWorkWithMeCheckout",
    provenance: workWithMeCheckoutProvenance,
  })
  // Revenue-path compatibility discriminators such as credit_topup and academy_mini_product do
  // not have PricingProduct rows. Retain them in the union rather than silently dropping IDs that
  // checkout metadata and webhook handlers still use.
  for (const [productId, path] of Object.entries(PRODUCT_REVENUE_PATHS)) {
    if (pricingProductIds.has(productId)) continue
    snapshots.push({
      id: productId,
      lifecycleStatus: path.lifecycleStatus,
      revenuePath: path.checkoutPath,
      fulfillmentContract: path.fulfillmentRule,
      aliases: [
        {
          kind: "product_type",
          value: productId,
          provenance: codeProvenance("lib/products.ts", `PRODUCT_REVENUE_PATHS.${productId}`),
        },
      ],
      provenance: codeProvenance("lib/products.ts", `PRODUCT_REVENUE_PATHS.${productId}`),
    })
  }
  const creditTopup = snapshots.find(snapshot => snapshot.id === "credit_topup")
  if (creditTopup) {
    const provenance = codeProvenance("lib/products.ts", "CREDIT_PACKAGES")
    creditTopup.variants = CREDIT_PACKAGES.map(pkg => ({
      id: pkg.id,
      amountCents: pkg.priceInCents,
      currency: "usd",
      credits: pkg.credits,
      priceMode: "inline",
      saleAudience: "existing_members",
      provenance,
    }))
    creditTopup.aliases = [
      ...(creditTopup.aliases || []),
      ...CREDIT_PACKAGES.map(pkg => ({
        kind: "package_id" as const,
        value: pkg.id,
        provenance,
      })),
    ]
  }
  // Keep Academy fallback configuration visible as code evidence, but do not label it effective.
  // The separately observed getAcademyProductCatalog() result is the effective Academy evidence.
  for (const product of Object.values(ACADEMY_PRODUCTS)) {
    const provenance = codeProvenance("lib/products.ts", `ACADEMY_PRODUCTS.${product.id}`)
    const mappedHandlerEntitlements = HANDLER_ENTITLEMENT_GRANTS[product.id]
    const handlerProvenance = codeProvenance(
      mappedHandlerEntitlements?.location || "lib/payments/handlers/academy-products.ts",
      mappedHandlerEntitlements
        ? "direct upsertPurchaseEntitlement call"
        : "entitlementProductIds direct product branch"
    )
    const handlerProductIds = mappedHandlerEntitlements?.productIds || ([product.id] as const)
    const priceId = product.stripePriceId?.trim() || null
    snapshots.push({
      id: product.id,
      name: product.name,
      amountCents: product.price,
      currency: product.currency,
      billingInterval: "one_time",
      priceMode: "stripe_price",
      priceReferences: [
        {
          envKey: `ACADEMY_PRODUCTS.${product.id}.stripePriceId`,
          priceId,
          status: priceId ? "configured_unverified" : "missing",
          provenance,
        },
      ],
      entitlementGrants: handlerProductIds.map(productId => ({
        productId,
        provenance: handlerProvenance,
      })),
      academyAccessAliases: academyAliasEvidence(product.id, handlerProductIds),
      aliases: [
        { kind: "product_id", value: product.id, provenance },
        { kind: "product_type", value: "academy_mini_product", provenance },
        { kind: "entitlement_id", value: product.id, provenance },
      ],
      revenuePath: "POST /api/academy/checkout",
      fulfillmentContract:
        product.id === "visibility_suite"
          ? "stripe_webhook.checkout.session.completed:visibility_suite"
          : "stripe_webhook.checkout.session.completed:academy_mini_product",
      provenance,
    })
  }
  return snapshots
}

async function databaseSnapshot(): Promise<CatalogShadowDatabaseSnapshot> {
  const productsProvenance: CatalogShadowProvenance = {
    source: "database",
    location: "academy_products",
    detail: "raw SELECT-only snapshot",
    observation: "academy_db",
  }
  const overridesProvenance: CatalogShadowProvenance = {
    source: "database",
    location: "academy_product_overrides",
    detail: "raw SELECT-only snapshot",
    observation: "academy_override",
  }
  let sql: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<Record<string, unknown>[]>
  try {
    const imported = await import("@/lib/db/client")
    sql = imported.sql as typeof sql
  } catch {
    return {
      products: {
        state: "unavailable",
        reason: "database client import failed",
        provenance: productsProvenance,
      },
      overrides: {
        state: "unavailable",
        reason: "database client import failed",
        provenance: overridesProvenance,
      },
    }
  }

  const products = await (async (): Promise<
    CatalogShadowSourceSnapshot<CatalogShadowDatabaseProductSnapshot>
  > => {
    try {
      const rows = await sql`
        SELECT id, title, active, purchasable, membership_included, stripe_price_id
        FROM academy_products
        ORDER BY id ASC
      `
      if (rows.length === 0) return { state: "empty", provenance: productsProvenance }
      return {
        state: "available",
        provenance: productsProvenance,
        rows: rows.map(row => {
          const id = String(row.id)
          return {
            id,
            title: row.title ? String(row.title) : null,
            active: row.active === true,
            purchasable: row.purchasable === true,
            membershipIncluded: row.membership_included === true,
            stripePriceId: row.stripe_price_id ? String(row.stripe_price_id) : null,
            currency: null,
            provenance: {
              ...productsProvenance,
              location: `academy_products:${id}`,
              detail: "raw product row",
            },
          }
        }),
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
      return {
        state: code === "42P01" ? "missing" : "unavailable",
        reason:
          code === "42P01"
            ? "academy_products table is missing"
            : `academy_products SELECT failed (${code || "unknown_error"})`,
        provenance: productsProvenance,
      }
    }
  })()

  const overrides = await (async (): Promise<
    CatalogShadowSourceSnapshot<CatalogShadowDatabaseOverrideSnapshot>
  > => {
    try {
      const rows = await sql`
        SELECT product_id, price_cents, active
        FROM academy_product_overrides
        ORDER BY product_id ASC
      `
      if (rows.length === 0) return { state: "empty", provenance: overridesProvenance }
      return {
        state: "available",
        provenance: overridesProvenance,
        rows: rows.map(row => ({
          productId: String(row.product_id),
          priceCents: typeof row.price_cents === "number" ? row.price_cents : null,
          active: typeof row.active === "boolean" ? row.active : null,
          currency: null,
          provenance: {
            ...overridesProvenance,
            location: `academy_product_overrides:${String(row.product_id)}`,
            detail: "raw override row; base product state is not inferred",
          },
        })),
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
      return {
        state: code === "42P01" ? "missing" : "unavailable",
        reason:
          code === "42P01"
            ? "academy_product_overrides table is missing"
            : `academy_product_overrides SELECT failed (${code || "unknown_error"})`,
        provenance: overridesProvenance,
      }
    }
  })()

  return { products, overrides }
}

async function academyEffectiveSnapshot(): Promise<CatalogShadowEffectiveAcademySnapshot> {
  const provenance: CatalogShadowProvenance = {
    source: "runtime_projection",
    location: "getAcademyProductCatalog()",
    detail: "current effective Academy catalogue observation",
    observation: "academy_effective",
  }
  try {
    const { getAcademyProductCatalog } = await import("@/lib/academy-entitlements")
    const products = await getAcademyProductCatalog()
    if (products.length === 0) return { state: "empty", provenance }
    return {
      state: "available",
      provenance,
      products: products.map(product => ({
        id: product.id,
        active: product.active,
        purchasable: product.purchasable,
        membershipIncluded: product.membershipIncluded,
        priceCents: product.priceCents,
        // The effective catalogue does not encode currency. Never infer it from display prices.
        currency: null,
        stripePriceId: product.stripePriceId,
        provenance: {
          ...provenance,
          location: `getAcademyProductCatalog():${product.id}`,
        },
      })),
    }
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
    return {
      state: "unavailable",
      reason: `effective Academy catalogue read failed (${code || "unknown_error"})`,
      provenance,
    }
  }
}

function publicCopySnapshot(): CatalogShadowPublicCopySnapshot {
  const provenance: CatalogShadowProvenance = {
    source: "public_copy",
    location: "known public price surfaces",
    detail: "read-only source observation",
  }
  const observations = [
    {
      productId: "masterclass",
      literal: "$147",
      amountCents: 14700,
      currency: "usd" as const,
      file: "app/checkout/page.tsx",
      needle: "One $147 payment",
    },
    {
      productId: "prompt_vault",
      literal: "$37",
      amountCents: 3700,
      currency: "usd" as const,
      file: "app/checkout/page.tsx",
      needle: "One $37 payment. No subscription.",
    },
    {
      productId: "presets_single",
      literal: "$19",
      amountCents: 1900,
      currency: "usd" as const,
      file: "app/presets/page.tsx",
      needle: "Get this collection · $19",
    },
    {
      productId: "presets_bundle",
      literal: "$39",
      amountCents: 3900,
      currency: "usd" as const,
      file: "app/presets/page.tsx",
      needle: ">$39</p>",
    },
    {
      productId: "starter_kit",
      literal: "$37",
      amountCents: 3700,
      currency: "usd" as const,
      file: "components/sselfie/public-marketing.tsx",
      needle: 'eyebrow="Starter Kit · $37"',
    },
    {
      productId: "masterclass",
      literal: "$147",
      amountCents: 14700,
      currency: "usd" as const,
      file: "components/sselfie/public-marketing.tsx",
      needle: 'eyebrow="Masterclass · $147"',
    },
    {
      productId: "sselfie_studio_membership",
      literal: "€97",
      amountCents: 9700,
      currency: "eur" as const,
      file: "app/checkout/page.tsx",
      needle: "SSELFIE SUITE · €97 monthly",
    },
    {
      productId: "sselfie_studio_membership",
      literal: "€97",
      amountCents: 9700,
      currency: "eur" as const,
      file: "components/sselfie/public-marketing.tsx",
      needle: "SSELFIE SUITE · €97/mo",
    },
    {
      productId: "sselfie_studio_membership_annual",
      literal: "€970",
      amountCents: 97000,
      currency: "eur" as const,
      file: "app/checkout/page.tsx",
      needle: "€970 billed yearly",
    },
  ] as const

  const sourceByFile = new Map<string, { source?: string; reason?: string }>()
  const probes = observations.map(observation => {
    let cached = sourceByFile.get(observation.file)
    if (!cached) {
      try {
        cached = { source: readFileSync(observation.file, "utf8") }
      } catch {
        cached = { reason: "source file unavailable" }
      }
      sourceByFile.set(observation.file, cached)
    }
    if (!cached.source) {
      return {
        productId: observation.productId,
        literal: observation.literal,
        status: "unavailable" as const,
        reason: cached.reason,
        provenance: {
          source: "public_copy" as const,
          location: observation.file,
          detail: "source unavailable",
        },
      }
    }
    const index = cached.source.indexOf(observation.needle)
    if (index < 0) {
      return {
        productId: observation.productId,
        literal: observation.literal,
        status: "missing" as const,
        reason: "expected literal was not found",
        provenance: {
          source: "public_copy" as const,
          location: observation.file,
          detail: "expected literal missing",
        },
      }
    }
    const line = cached.source.slice(0, index).split("\n").length
    return {
      productId: observation.productId,
      literal: observation.literal,
      status: "observed" as const,
      amountCents: observation.amountCents,
      currency: observation.currency,
      provenance: {
        source: "public_copy" as const,
        location: `${observation.file}:${line}`,
        detail: "literal observed and parsed in current source",
      },
    }
  })
  const observedCount = probes.filter(probe => probe.status === "observed").length
  const state =
    observedCount === probes.length ? "complete" : observedCount === 0 ? "unavailable" : "partial"
  return { state, probes, provenance }
}

async function main() {
  if (observationClockFailure) throw new Error(observationClockFailure)
  // These modules read environment-sensitive product constants at evaluation time. Import them
  // only after loadEnvConfig has completed above.
  const [productsModule, launchPricingModule] = await Promise.all([
    import("@/lib/products"),
    import("@/lib/launch/cash-launch-pricing"),
  ])
  const [database, academyEffective] = await Promise.all([
    databaseSnapshot(),
    academyEffectiveSnapshot(),
  ])
  const report = createCatalogShadowReport({
    now: observationNow,
    codeProducts: codeSnapshots(observationNow, productsModule, launchPricingModule),
    database,
    academyEffective,
    publicCopy: publicCopySnapshot(),
  })
  process.stdout.write(serializeCatalogShadowReport(report))
}

main().catch(error => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
  const failureReason =
    observationClockFailure || `fatal projection error (${code || "unknown_error"})`
  const fallback = createCatalogShadowReport({
    now: observationNow,
    codeProducts: [],
    database: {
      products: {
        state: "unavailable",
        reason: "catalogue report failed before academy_products could be represented",
        provenance: { source: "database", location: "academy_products" },
      },
      overrides: {
        state: "unavailable",
        reason: "catalogue report failed before academy_product_overrides could be represented",
        provenance: { source: "database", location: "academy_product_overrides" },
      },
    },
    academyEffective: {
      state: "unavailable",
      reason: "catalogue report failed before effective Academy evidence could be represented",
      provenance: {
        source: "runtime_projection",
        location: "catalog-shadow-report",
        observation: "academy_effective",
      },
    },
    publicCopy: {
      state: "unavailable",
      probes: [],
      provenance: { source: "public_copy", location: "catalog-shadow-report" },
    },
    failure: {
      reason: failureReason,
      provenance: { source: "code", location: "scripts/catalog-shadow-report.ts" },
    },
  })
  process.stdout.write(serializeCatalogShadowReport(fallback))
  process.exitCode = 0
})
