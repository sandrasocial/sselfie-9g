import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS, PRICING_PRODUCTS } from "@/lib/products"

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
  source: AcademyEntitlementSource
}

type ProductOverrideRow = {
  product_id: string
  name: string | null
  tagline: string | null
  description: string | null
  price_cents: number | null
  active: boolean | null
}

type RegistryRow = {
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
  stripePriceId: string | null
  purchasable: boolean
  deliveryKind: AcademyDeliveryKind
  accessTarget: string
}

const PRODUCT_ACCESS_ALIASES: Record<string, string[]> = {
  selfie_guide_bundle: ["selfie_guide", "brand_strategy_pack"],
  masterclass: ["branded_by_sselfie", "editing_masterclass"],
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
      type: product.id === "ai_photo_prompts" ? "pack" : "course",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: product.stripePriceId || null,
      active: true,
      sortOrder: (idx + 1) * 10,
      deliveryKind: "academy_course",
      accessTarget: product.id,
    })
  )

  const directProducts: AcademyProductRecord[] = [
    {
      id: "starter_kit",
      slug: "starter-kit",
      title: "Starter Kit",
      type: "bundle",
      membershipIncluded: false,
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
      membershipIncluded: false,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_MASTERCLASS?.trim() || null,
      active: true,
      sortOrder: 66,
      deliveryKind: "collection",
      accessTarget: "masterclass",
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
      id: "brand_strategy_pack",
      slug: "brand-strategy-pack",
      title: "Brand Strategy Pack",
      type: "pack",
      membershipIncluded: true,
      purchasable: true,
      stripePriceId: process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK?.trim() || null,
      active: true,
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
      stripePriceId: academyProduct.stripePriceId || null,
      purchasable: true,
      deliveryKind: "academy_course",
      accessTarget: productId,
    }
  }

  const pricingProduct = PRICING_PRODUCTS.find(product => product.id === productId)
  if (pricingProduct) {
    const accessTarget = productId === "brand_strategy_pack" ? "brand-strategy" : "selfie-guide"

    return {
      name: pricingProduct.displayName || pricingProduct.name,
      tagline: pricingProduct.description,
      description: pricingProduct.description,
      priceCents: pricingProduct.priceInCents,
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
    // Collection products (e.g. masterclass) grant access to constituent courses —
    // those courses are shown in the academy courses section, so link there.
    return `/academy`
  }

  return `/academy/products/${product.id}`
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

  if (product.deliveryKind === "direct_private") {
    if (product.accessTarget === "brand-strategy") {
      return "/brand-strategy"
    }
    if (product.accessTarget === "starter-kit") {
      return "/starter-kit"
    }
    return "/selfie-guide"
  }

  return `/academy/products/${product.id}`
}

async function getAcademyProductOverrides(): Promise<Map<string, ProductOverrideRow>> {
  try {
    const overrides = (await sql`
      SELECT product_id, name, tagline, description, price_cents, active
      FROM academy_product_overrides
    `) as ProductOverrideRow[]

    return new Map(overrides.map(row => [row.product_id, row]))
  } catch {
    return new Map()
  }
}

export async function hasActiveStudioMembership(userId: string): Promise<boolean> {
  try {
    const enforceLiveMode = process.env.NODE_ENV === "production"
    const membership = await sql`
      SELECT 1
      FROM subscriptions
      WHERE user_id = ${userId}
        AND product_type = ANY(${MEMBERSHIP_PRODUCT_TYPES})
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

export async function getAcademyProductRegistry(): Promise<AcademyProductRecord[]> {
  const defaults = buildDefaultRegistry()
  const fallbackMap = new Map(defaults.map(item => [item.id, item]))

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
    `) as RegistryRow[]

    if (!rows.length) {
      return defaults
    }

    const registry = rows.map(row => {
      const fallback = fallbackMap.get(row.id)
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        type: row.type as AcademyProductType,
        membershipIncluded: row.membership_included === true,
        purchasable: row.purchasable === true || fallback?.purchasable === true,
        stripePriceId: row.stripe_price_id ?? fallback?.stripePriceId ?? null,
        active: row.active === true,
        sortOrder: Number(row.sort_order) || fallback?.sortOrder || 0,
        deliveryKind: row.delivery_kind ?? fallback?.deliveryKind ?? "academy_course",
        accessTarget: row.access_target ?? fallback?.accessTarget ?? row.id,
      } satisfies AcademyProductRecord
    })

    for (const item of defaults) {
      if (!registry.some(candidate => candidate.id === item.id)) {
        registry.push(item)
      }
    }

    return registry.sort((a, b) => a.sortOrder - b.sortOrder)
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
        (product.purchasable || fallback.purchasable) &&
        Boolean(product.stripePriceId ?? fallback.stripePriceId),
      stripePriceId: product.stripePriceId ?? fallback.stripePriceId ?? null,
      active,
      sortOrder: product.sortOrder,
      deliveryKind: product.deliveryKind,
      accessTarget: product.accessTarget,
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

async function getExplicitEntitlements(userId: string): Promise<ExplicitEntitlementRow[]> {
  try {
    const rows = (await sql`
      SELECT product_id, valid_from, source
      FROM user_entitlements
      WHERE user_id = ${userId}
        AND status = 'active'
        AND valid_from <= NOW()
        AND (valid_until IS NULL OR valid_until > NOW())
    `) as ExplicitEntitlementRow[]

    return rows
  } catch {
    const fallbackRows = await sql`
      SELECT DISTINCT product_id, valid_from, source
      FROM (
        SELECT course_id AS product_id, purchased_at AS valid_from, 'migration_backfill' AS source
        FROM academy_course_purchases
        WHERE user_id = ${userId}
          AND status = 'active'
        UNION
        SELECT product_type AS product_id, created_at AS valid_from, 'migration_backfill' AS source
        FROM subscriptions
        WHERE user_id = ${userId}
          AND status = 'active'
          AND product_type = ANY(${DIRECT_ONE_TIME_ACADEMY_TYPES})
      ) combined
    `

    return fallbackRows as ExplicitEntitlementRow[]
  }
}

export async function getAcademyEntitlementState(userId: string) {
  const [catalog, membershipActive, explicitEntitlements] = await Promise.all([
    getAcademyProductCatalog(),
    hasActiveStudioMembership(userId),
    getExplicitEntitlements(userId),
  ])

  const explicitMap = new Map<
    string,
    {
      purchasedAt: string | null
      sources: Set<AcademyEntitlementSource>
    }
  >()

  for (const entitlement of explicitEntitlements) {
    const existing = explicitMap.get(entitlement.product_id)
    const purchasedAt =
      entitlement.valid_from instanceof Date
        ? entitlement.valid_from.toISOString()
        : entitlement.valid_from
          ? new Date(entitlement.valid_from).toISOString()
          : null

    if (!existing) {
      explicitMap.set(entitlement.product_id, {
        purchasedAt,
        sources: new Set([entitlement.source]),
      })
      continue
    }

    explicitMap.set(entitlement.product_id, {
      purchasedAt:
        existing.purchasedAt && purchasedAt
          ? existing.purchasedAt < purchasedAt
            ? existing.purchasedAt
            : purchasedAt
          : (existing.purchasedAt ?? purchasedAt),
      sources: new Set([...existing.sources, entitlement.source]),
    })
  }

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
}: {
  userId: string
  productId: string
  sourceRef?: string | null
  source?: AcademyEntitlementSource
  metadata?: Record<string, unknown>
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
  }
}
