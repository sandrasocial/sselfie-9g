import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS, PRICING_PRODUCTS } from "@/lib/products"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { VISIBILITY_MINI_PRODUCT_BY_ID } from "@/lib/visibility-products"

const MEMBERSHIP_PRODUCT_TYPES = [
  "sselfie_studio_membership",
  "brand_studio_membership",
  "pro",
] as const

const DIRECT_ONE_TIME_ACADEMY_TYPES = [
  "selfie_guide",
  "selfie_guide_bundle",
  "brand_strategy_pack",
  "starter_kit",
  "masterclass",
  "prompt_vault",
  "presets_single",
  "presets_bundle",
  "selfie_visibility_bundle",
  "selfie_to_brand_shoot_system",
] as const

export type AcademyProductType = "course" | "pack" | "template" | "resource" | "bundle"

export type AcademyDeliveryKind = "academy_course" | "direct_private" | "collection"

export type AcademyProductRecord = {
  id: string
  slug: string
  title: string
  type: AcademyProductType
  membershipIncluded: boolean
  purchasable: boolean
  stripePriceId: string | null
  active: boolean
  sortOrder: number
  deliveryKind: AcademyDeliveryKind
  accessTarget: string
}

export type AcademyEntitlementSource =
  | "purchase"
  | "membership"
  | "admin_grant"
  | "migration_backfill"

export type AcademyResolvedAccessSource =
  | "membership"
  | "purchase"
  | "purchase_and_membership"
  | "none"

export type AcademyCatalogProduct = {
  id: string
  slug: string
  title: string
  name: string
  type: AcademyProductType
  tagline: string
  description: string
  priceCents: number | null
  price: number | null
  membershipIncluded: boolean
  purchasable: boolean
  stripePriceId: string | null
  active: boolean
  sortOrder: number
  deliveryKind: AcademyDeliveryKind
  accessTarget: string
  thumbnailUrl: string | null
  accessUrl: string
  purchaseUrl: string
}

export type AcademyResolvedCatalogEntry = AcademyCatalogProduct & {
  hasAccess: boolean
  accessSource: AcademyResolvedAccessSource
  purchasedAt: string | null
}

type ExplicitEntitlementRow = {
  product_id: string
  valid_from: string | Date | null
  source: AcademyExplicitOwnershipSource
}

type UserEntitlementOwnershipRow = ExplicitEntitlementRow & {
  purchased_product_id: string | null
}

type StripeOwnershipRow = {
  product_type: string | null
  metadata_product_id: string | null
  valid_from: string | Date | null
  status: string | null
  is_test_mode: boolean | null
}

export type AcademyExplicitOwnershipSource =
  | AcademyEntitlementSource
  | "academy_course_purchase"
  | "legacy_subscription"
  | "stripe_payment"
  | (string & {})

export type AcademyExplicitOwnershipRecord = {
  productId: string
  purchasedAt: string | null
  sources: AcademyExplicitOwnershipSource[]
}

type ProductOverrideRow = {
  product_id: string
  name: string | null
  tagline: string | null
  description: string | null
  price_cents: number | null
  thumbnail_url: string | null
  active: boolean | null
}

export type AcademyRegistryProjectionRow = {
  id: string
  slug: string
  title: string
  type: AcademyProductType
  membership_included: boolean
  purchasable: boolean
  stripe_price_id: string | null
  active: boolean
  sort_order: number
  delivery_kind: AcademyDeliveryKind | null
  access_target: string | null
}

type FallbackMetadata = {
  name: string
  tagline: string
  description: string
  priceCents: number | null
  thumbnailUrl: string | null
  stripePriceId: string | null
  purchasable: boolean
  deliveryKind: AcademyDeliveryKind
  accessTarget: string
}

const MASTERCLASS_ACCESS_ALIASES = [
  "brand_strategy_pack",
  "branded_by_sselfie",
  "editing_masterclass",
]

const PRODUCT_ACCESS_ALIASES: Record<string, string[]> = {
  selfie_guide_bundle: ["selfie_guide", "brand_strategy_pack"],
  selfie_visibility_bundle: [
    "masterclass",
    "starter_kit",
    "prompt_vault",
    ...MASTERCLASS_ACCESS_ALIASES,
  ],
  // Selfie to Brand Shoot includes the Brand Strategy tool in its price — it is the
  // personalized Step 0 of that course (gate before Modules 1-5).
  selfie_to_brand_shoot_system: ["brand_strategy_pack"],
  masterclass: MASTERCLASS_ACCESS_ALIASES,
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

const KNOWN_ACADEMY_PRODUCT_IDS = new Set<string>([
  ...Object.keys(ACADEMY_PRODUCTS),
  ...DIRECT_ONE_TIME_ACADEMY_TYPES,
])

const PRODUCT_THUMBNAILS: Record<string, string> = {
  what_to_say: "/academy/visibility-suite/what-to-say.png",
  show_up: "/academy/visibility-suite/show-up.png",
  get_paid: "/academy/visibility-suite/get-paid.png",
  visibility_suite: "/academy/visibility-suite/hero.png",
  concept_cards_pack: "/academy/sselfie-minimalism/academy-bonus-library.jpg",
  caption_sprint: "/academy/sselfie-minimalism/academy-workbook.jpg",
  feed_reset_9grid: "/academy/sselfie-minimalism/academy-course.jpg",
  ai_photo_refresh: "/academy/sselfie-minimalism/academy-studio-resources.jpg",
  ai_photo_prompts: "/images/ai-prompts/ai-prompts-hero.jpg",
  editing_masterclass: "/academy/sselfie-minimalism/academy-workbook.jpg",
  branded_by_sselfie: "/academy/sselfie-minimalism/academy-course.jpg",
  starter_kit: "/images/starter-kit/hero.png",
  masterclass: "/academy/sselfie-minimalism/academy-masterclass.jpg",
  prompt_vault: "/images/ai-prompts/ai-prompts-hero.jpg",
  presets_single: "/images/presets/hero.jpg",
  presets_bundle: "/images/presets/hero.jpg",
  selfie_to_brand_shoot_system: "/landing/lookbook-on-location.png",
  selfie_guide: "/academy/sselfie-minimalism/academy-selfie-guide.jpg",
  selfie_guide_bundle: "/academy/sselfie-minimalism/academy-selfie-guide.jpg",
  brand_strategy_pack: "/academy/sselfie-minimalism/academy-brand-strategy.jpg",
}

function priceFromCents(priceCents: number | null): number | null {
  if (priceCents === null || !Number.isFinite(priceCents)) {
    return null
  }
  return priceCents / 100
}

function buildDefaultRegistry(): AcademyProductRecord[] {
  const miniProducts: AcademyProductRecord[] = Object.values(ACADEMY_PRODUCTS).map(
    (product, idx) => ({
      id: product.id,
      slug: product.id.replace(/_/g, "-"),
      title: product.name,
      type: product.id === "visibility_suite" ? "bundle" : product.id === "ai_photo_prompts" ? "pack" : "course",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: product.stripePriceId || null,
      active: true,
      sortOrder: (idx + 1) * 10,
      deliveryKind: product.id === "visibility_suite" ? "collection" : "academy_course",
      accessTarget:
        product.id === "visibility_suite"
          ? "visibility-suite"
          : VISIBILITY_MINI_PRODUCT_BY_ID[product.id as keyof typeof VISIBILITY_MINI_PRODUCT_BY_ID]?.slug || product.id,
    })
  )

  const directProducts: AcademyProductRecord[] = [
    {
      id: "starter_kit",
      slug: "starter-kit",
      title: "Starter Kit",
      type: "bundle",
      // D3 (2026-06-11, Sandra-approved): SUITE membership includes every one-time product.
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_STARTER_KIT?.trim() || null,
      active: true,
      sortOrder: 65,
      deliveryKind: "direct_private",
      accessTarget: "starter-kit",
    },
    {
      id: "masterclass",
      slug: "masterclass",
      title: "Selfie Masterclass",
      type: "bundle",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_MASTERCLASS?.trim() || null,
      active: true,
      sortOrder: 66,
      deliveryKind: "collection",
      accessTarget: "masterclass",
    },
    {
      id: "prompt_vault",
      slug: "prompt-vault",
      title: "AI Photo Prompt Vault",
      type: "pack",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_PROMPT_VAULT?.trim() || null,
      active: true,
      sortOrder: 67,
      deliveryKind: "direct_private",
      accessTarget: "prompt-vault",
    },
    {
      id: "selfie_to_brand_shoot_system",
      slug: "selfie-to-brand-shoot",
      title: "Selfie to Brand Shoot System",
      type: "bundle",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM?.trim() || null,
      active: true,
      sortOrder: 68,
      deliveryKind: "direct_private",
      accessTarget: "selfie-to-brand-shoot",
    },
    {
      id: "selfie_guide",
      slug: "selfie-guide",
      title: "Selfie Guide",
      type: "course",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_SELFIE_GUIDE?.trim() || null,
      active: true,
      sortOrder: 70,
      deliveryKind: "direct_private",
      accessTarget: "selfie-guide",
    },
    {
      id: "selfie_guide_bundle",
      slug: "selfie-guide-bundle",
      title: "Selfie Guide Bundle",
      type: "bundle",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_SELFIE_GUIDE_BUNDLE?.trim() || null,
      active: true,
      sortOrder: 80,
      deliveryKind: "direct_private",
      accessTarget: "selfie-guide",
    },
    {
      // Archived — no longer sold standalone. Existing buyers access via /strategy/[token].
      // Included via access aliases in selfie_guide_bundle and masterclass purchases.
      id: "brand_strategy_pack",
      slug: "brand-strategy-pack",
      title: "Strategy Foundation",
      type: "pack",
      membershipIncluded: true,
      purchasable: false,
      stripePriceId: null,
      active: false,
      sortOrder: 90,
      deliveryKind: "direct_private",
      accessTarget: "brand-strategy",
    },
  ]

  return [...miniProducts, ...directProducts]
}

function getFallbackMetadata(productId: string): FallbackMetadata {
  const academyProduct = (ACADEMY_PRODUCTS as Record<string, any>)[productId]
  if (academyProduct) {
    return {
      name: academyProduct.name,
      tagline: academyProduct.tagline ?? "",
      description: academyProduct.description ?? "",
      priceCents: academyProduct.price ?? null,
      thumbnailUrl: PRODUCT_THUMBNAILS[productId] ?? null,
      stripePriceId: academyProduct.stripePriceId || null,
      purchasable: true,
      deliveryKind: "academy_course",
      accessTarget: productId,
    }
  }

  const pricingProduct = PRICING_PRODUCTS.find(product => product.id === productId)
  if (pricingProduct) {
    const directAccessTargets: Record<string, string> = {
      brand_strategy_pack: "brand-strategy",
      prompt_vault: "prompt-vault",
      presets_single: "presets",
      presets_bundle: "presets",
      selfie_to_brand_shoot_system: "selfie-to-brand-shoot",
      starter_kit: "starter-kit",
      masterclass: "masterclass",
      selfie_guide: "selfie-guide",
      selfie_guide_bundle: "selfie-guide",
    }
    const accessTarget = directAccessTargets[productId] || "selfie-guide"

    return {
      name: pricingProduct.displayName || pricingProduct.name,
      tagline: pricingProduct.description,
      description: pricingProduct.description,
      priceCents: pricingProduct.priceInCents,
      thumbnailUrl: PRODUCT_THUMBNAILS[productId] ?? null,
      stripePriceId: pricingProduct.stripePriceId?.trim() || null,
      purchasable: true,
      deliveryKind: "direct_private",
      accessTarget,
    }
  }

  return {
    name: productId,
    tagline: "",
    description: "",
    priceCents: null,
    thumbnailUrl: PRODUCT_THUMBNAILS[productId] ?? null,
    stripePriceId: null,
    purchasable: false,
    deliveryKind: "academy_course",
    accessTarget: productId,
  }
}

function resolveAcademyProductAccessUrl(
  product: Pick<AcademyCatalogProduct, "deliveryKind" | "accessTarget" | "id">
): string {
  if (product.deliveryKind === "direct_private") {
    return `/academy/access/${product.accessTarget}`
  }

  if (product.deliveryKind === "collection") {
    return `/academy/access/${product.accessTarget}`
  }

  // academy_course products: the course lives in the library at /academy.
  return `/academy/access/${product.accessTarget}`
}

function resolveAcademyProductPurchaseUrl(
  product: Pick<AcademyCatalogProduct, "deliveryKind" | "accessTarget" | "id">
): string {
  if (product.id === "starter_kit") {
    return "/starter-kit"
  }

  if (product.id === "masterclass") {
    return "/masterclass"
  }

  if (product.id === "prompt_vault") {
    return "/prompt-vault"
  }

  if (product.id === "presets_single" || product.id === "presets_bundle") {
    return "/presets"
  }

  if (product.id === "visibility_suite") {
    // LEGACY_ACCESS_ONLY: existing suite buyers keep access, but new visitors go to Masterclass.
    return "/masterclass"
  }

  if (product.deliveryKind === "direct_private") {
    if (product.accessTarget === "brand-strategy") {
      // Archived product — route new visitors to Masterclass
      return "/masterclass"
    }
    if (product.accessTarget === "starter-kit") {
      return "/starter-kit"
    }
    if (product.accessTarget === "presets") {
      return "/presets"
    }
    return "/selfie-guide"
  }

  return `/academy/products/${product.id}`
}

async function getAcademyProductOverrides(): Promise<Map<string, ProductOverrideRow>> {
  try {
    const overrides = (await sql`
      SELECT product_id, name, tagline, description, price_cents, thumbnail_url, active
      FROM academy_product_overrides
    `) as ProductOverrideRow[]

    return new Map(overrides.map(row => [row.product_id, row]))
  } catch {
    try {
      const legacyOverrides = (await sql`
        SELECT product_id, name, tagline, description, price_cents, active
        FROM academy_product_overrides
      `) as Array<Omit<ProductOverrideRow, "thumbnail_url">>

      return new Map(
        legacyOverrides.map(row => [row.product_id, { ...row, thumbnail_url: null }])
      )
    } catch {
      return new Map()
    }
  }
}

export async function hasActiveStudioMembership(userId: string): Promise<boolean> {
  try {
    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const membership = await sql`
      SELECT 1
      FROM subscriptions
      WHERE user_id = ${userId}
        AND product_type = ANY(${MEMBERSHIP_PRODUCT_TYPES})
        AND COALESCE(plan, '') <> 'maya_essential_pilot'
        AND (
          status IN ('active', 'trialing')
          OR (
            status IN ('canceled', 'cancelled', 'past_due')
            AND current_period_end IS NOT NULL
            AND current_period_end > NOW()
          )
        )
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
      LIMIT 1
    `

    return membership.length > 0
  } catch (error) {
    console.error("[academy-entitlements] Failed membership lookup:", error)
    return false
  }
}

export function projectAcademyProductRegistry(
  rows: readonly AcademyRegistryProjectionRow[],
  defaults = buildDefaultRegistry()
): AcademyProductRecord[] {
  const fallbackMap = new Map(defaults.map(item => [item.id, item]))

  if (!rows.length) return defaults

  const registry = rows.map(row => {
    const fallback = fallbackMap.get(row.id)
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      type: row.type as AcademyProductType,
      membershipIncluded: row.membership_included === true,
      // An explicit database false is authoritative. Defaults still fill products that have
      // no database row, but cannot silently reopen a row an operator disabled.
      purchasable: row.purchasable === true,
      stripePriceId: fallback?.stripePriceId ?? row.stripe_price_id ?? null,
      active: row.active === true,
      sortOrder: Number(row.sort_order) || fallback?.sortOrder || 0,
      deliveryKind: row.delivery_kind ?? fallback?.deliveryKind ?? "academy_course",
      accessTarget: row.access_target ?? fallback?.accessTarget ?? row.id,
    } satisfies AcademyProductRecord
  })

  for (const item of defaults) {
    if (!registry.some(candidate => candidate.id === item.id)) registry.push(item)
  }

  return registry.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getAcademyProductRegistry(): Promise<AcademyProductRecord[]> {
  const defaults = buildDefaultRegistry()

  try {
    const rows = (await sql`
      SELECT
        id,
        slug,
        title,
        type,
        membership_included,
        purchasable,
        stripe_price_id,
        active,
        sort_order,
        delivery_kind,
        access_target
      FROM academy_products
      WHERE active = TRUE
      ORDER BY sort_order ASC, id ASC
    `) as AcademyRegistryProjectionRow[]

    return projectAcademyProductRegistry(rows, defaults)
  } catch {
    return defaults
  }
}

export async function getAcademyProductCatalog(): Promise<AcademyCatalogProduct[]> {
  const [registry, overrides] = await Promise.all([
    getAcademyProductRegistry(),
    getAcademyProductOverrides(),
  ])

  return registry.map(product => {
    const fallback = getFallbackMetadata(product.id)
    const override = overrides.get(product.id)
    const name = override?.name ?? product.title ?? fallback.name
    const tagline = override?.tagline ?? fallback.tagline
    const description = override?.description ?? fallback.description
    const priceCents = override?.price_cents ?? fallback.priceCents
    const thumbnailUrl = override?.thumbnail_url ?? fallback.thumbnailUrl
    const active = product.active && (override?.active ?? true)

    const baseProduct: AcademyCatalogProduct = {
      id: product.id,
      slug: product.slug,
      title: name,
      name,
      type: product.type,
      tagline,
      description,
      priceCents,
      price: priceFromCents(priceCents),
      membershipIncluded: product.membershipIncluded,
      purchasable:
        product.purchasable && Boolean(product.stripePriceId ?? fallback.stripePriceId),
      stripePriceId: product.stripePriceId ?? fallback.stripePriceId ?? null,
      active,
      sortOrder: product.sortOrder,
      deliveryKind: product.deliveryKind,
      accessTarget: product.accessTarget,
      thumbnailUrl,
      accessUrl: "",
      purchaseUrl: "",
    }

    return {
      ...baseProduct,
      accessUrl: resolveAcademyProductAccessUrl(baseProduct),
      purchaseUrl: resolveAcademyProductPurchaseUrl(baseProduct),
    }
  })
}

async function getUserEntitlementOwnership(userId: string): Promise<ExplicitEntitlementRow[]> {
  try {
    const rows = (await sql`
      SELECT DISTINCT
        product_id,
        metadata ->> 'purchased_product_id' AS purchased_product_id,
        valid_from,
        source
      FROM user_entitlements
      WHERE user_id = ${userId}
        AND status = 'active'
        AND source <> 'membership'
        AND valid_from <= NOW()
        AND (valid_until IS NULL OR valid_until > NOW())
    `) as UserEntitlementOwnershipRow[]

    return rows.flatMap(row => {
      if (row.source === "membership") return []

      const isVisibilitySuiteExpansion =
        row.purchased_product_id === "visibility_suite" &&
        (row.product_id === "visibility_suite" ||
          PRODUCT_ACCESS_ALIASES.visibility_suite.includes(row.product_id))
      const productId = isVisibilitySuiteExpansion ? "visibility_suite" : row.product_id

      if (!KNOWN_ACADEMY_PRODUCT_IDS.has(productId)) return []

      return [{ product_id: productId, valid_from: row.valid_from, source: row.source }]
    })
  } catch (error) {
    console.error("[academy-entitlements] user_entitlements ownership unavailable:", error)
    return []
  }
}

async function getCoursePurchaseOwnership(userId: string): Promise<ExplicitEntitlementRow[]> {
  try {
    return (await sql`
      SELECT DISTINCT
        course_id AS product_id,
        purchased_at AS valid_from,
        'academy_course_purchase' AS source
      FROM academy_course_purchases
      WHERE user_id = ${userId}
        AND status = 'active'
    `) as ExplicitEntitlementRow[]
  } catch (error) {
    console.error("[academy-entitlements] academy_course_purchases ownership unavailable:", error)
    return []
  }
}

async function getLegacySubscriptionOwnership(userId: string): Promise<ExplicitEntitlementRow[]> {
  const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
  const knownProductIds = Array.from(KNOWN_ACADEMY_PRODUCT_IDS)

  try {
    return (await sql`
      SELECT DISTINCT
        product_type AS product_id,
        created_at AS valid_from,
        'legacy_subscription' AS source
      FROM subscriptions
      WHERE user_id = ${userId}
        AND status = 'active'
        AND product_type = ANY(${knownProductIds})
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
    `) as ExplicitEntitlementRow[]
  } catch (error) {
    console.error("[academy-entitlements] legacy subscription ownership unavailable:", error)
    return []
  }
}

function normalizeStripeOwnership(row: StripeOwnershipRow): ExplicitEntitlementRow | null {
  if (row.status !== "succeeded" || row.is_test_mode === true) {
    return null
  }

  const productId =
    row.product_type === "academy_mini_product"
      ? row.metadata_product_id
      : row.product_type

  if (!productId || !KNOWN_ACADEMY_PRODUCT_IDS.has(productId)) {
    return null
  }

  return {
    product_id: productId,
    valid_from: row.valid_from,
    source: "stripe_payment",
  }
}

async function getStripePaymentOwnership(userId: string): Promise<ExplicitEntitlementRow[]> {
  const knownProductIds = Array.from(KNOWN_ACADEMY_PRODUCT_IDS)

  try {
    const rows = (await sql`
      SELECT DISTINCT
        product_type,
        metadata ->> 'product_id' AS metadata_product_id,
        payment_date AS valid_from,
        status,
        is_test_mode
      FROM stripe_payments
      WHERE user_id = ${userId}
        AND status = 'succeeded'
        AND COALESCE(is_test_mode, false) = false
        AND (
          product_type = 'academy_mini_product'
          OR product_type = ANY(${knownProductIds})
        )
    `) as StripeOwnershipRow[]

    return rows
      .map(normalizeStripeOwnership)
      .filter((row): row is ExplicitEntitlementRow => row !== null)
  } catch (error) {
    console.error("[academy-entitlements] stripe_payments ownership unavailable:", error)
    return []
  }
}

function ownershipTimestamp(value: string | Date | null): string | null {
  if (!value) return null
  const timestamp = new Date(value)
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null
}

export async function getAcademyExplicitOwnership(
  userId: string,
): Promise<AcademyExplicitOwnershipRecord[]> {
  const ownership = await Promise.all([
    getUserEntitlementOwnership(userId),
    getCoursePurchaseOwnership(userId),
    getLegacySubscriptionOwnership(userId),
    getStripePaymentOwnership(userId),
  ])

  const directOwnership = new Map<string, AcademyExplicitOwnershipRecord>()

  for (const row of ownership.flat()) {
    if (!KNOWN_ACADEMY_PRODUCT_IDS.has(row.product_id)) continue

    const purchasedAt = ownershipTimestamp(row.valid_from)
    const existing = directOwnership.get(row.product_id)
    if (!existing) {
      directOwnership.set(row.product_id, {
        productId: row.product_id,
        purchasedAt,
        sources: [row.source],
      })
      continue
    }

    directOwnership.set(row.product_id, {
      productId: row.product_id,
      purchasedAt:
        existing.purchasedAt && purchasedAt
          ? existing.purchasedAt < purchasedAt
            ? existing.purchasedAt
            : purchasedAt
          : (existing.purchasedAt ?? purchasedAt),
      sources: Array.from(new Set([...existing.sources, row.source])).sort(),
    })
  }

  return Array.from(directOwnership.values()).sort((a, b) =>
    a.productId.localeCompare(b.productId),
  )
}

export async function getAcademyEntitlementState(userId: string) {
  const [catalog, membershipActive, explicitOwnership] = await Promise.all([
    getAcademyProductCatalog(),
    hasActiveStudioMembership(userId),
    getAcademyExplicitOwnership(userId),
  ])

  const explicitMap = new Map<
    string,
    {
      purchasedAt: string | null
      sources: Set<AcademyExplicitOwnershipSource>
    }
  >()

  for (const ownership of explicitOwnership) {
    explicitMap.set(ownership.productId, {
      purchasedAt: ownership.purchasedAt,
      sources: new Set(ownership.sources),
    })
  }

  const directExplicitProductIds = explicitOwnership.map(ownership => ownership.productId)

  const accessibleSet = new Set<string>(explicitMap.keys())
  for (const ownedProductId of Array.from(explicitMap.keys())) {
    const explicitOwnership = explicitMap.get(ownedProductId)
    for (const alias of PRODUCT_ACCESS_ALIASES[ownedProductId] || []) {
      accessibleSet.add(alias)
      if (!explicitMap.has(alias)) {
        explicitMap.set(alias, {
          purchasedAt: explicitOwnership?.purchasedAt ?? null,
          sources: new Set(explicitOwnership?.sources || []),
        })
      }
    }
  }

  if (membershipActive) {
    for (const product of catalog) {
      if (product.membershipIncluded) {
        accessibleSet.add(product.id)
      }
    }
  }

  const resolvedCatalog: AcademyResolvedCatalogEntry[] = catalog.map(product => {
    const explicitOwnership = explicitMap.get(product.id)
    const hasAccess = accessibleSet.has(product.id)
    let accessSource: AcademyResolvedAccessSource = "none"

    if (explicitOwnership && membershipActive) {
      accessSource = "purchase_and_membership"
    } else if (explicitOwnership) {
      accessSource = "purchase"
    } else if (membershipActive && product.membershipIncluded) {
      accessSource = "membership"
    }

    return {
      ...product,
      hasAccess,
      accessSource,
      purchasedAt: explicitOwnership?.purchasedAt ?? null,
    }
  })

  return {
    membershipActive,
    products: catalog,
    directExplicitProductIds,
    explicitProductIds: Array.from(explicitMap.keys()),
    accessibleProductIds: Array.from(accessibleSet),
    catalog: resolvedCatalog,
  }
}

export async function userHasAcademyProductAccess(
  userId: string,
  productId: string
): Promise<boolean> {
  const state = await getAcademyEntitlementState(userId)
  return state.accessibleProductIds.includes(productId)
}

export async function userHasAcademyMembershipCollectionAccess(userId: string): Promise<boolean> {
  const state = await getAcademyEntitlementState(userId)
  return state.membershipActive
}

export async function upsertPurchaseEntitlement({
  userId,
  productId,
  sourceRef,
  source = "purchase",
  metadata,
  throwOnError = false,
}: {
  userId: string
  productId: string
  sourceRef?: string | null
  source?: AcademyEntitlementSource
  metadata?: Record<string, unknown>
  /** Paid bundle fulfillment uses strict mode so Stripe retries instead of emailing partial access. */
  throwOnError?: boolean
}) {
  try {
    const normalizedSourceRef = sourceRef ?? ""
    await sql`
      INSERT INTO user_entitlements (
        user_id,
        product_id,
        source,
        source_ref,
        status,
        metadata,
        valid_from,
        updated_at
      )
      VALUES (
        ${userId},
        ${productId},
        ${source},
        ${normalizedSourceRef},
        'active',
        ${JSON.stringify(metadata || {})}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, product_id, source, source_ref)
      DO UPDATE SET
        status = 'active',
        metadata = EXCLUDED.metadata,
        valid_from = LEAST(user_entitlements.valid_from, EXCLUDED.valid_from),
        updated_at = NOW()
    `
  } catch (error) {
    console.error("[academy-entitlements] Failed to upsert entitlement:", error)
    if (throwOnError) throw error
  }
}
