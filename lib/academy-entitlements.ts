import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS } from "@/lib/products"

const MEMBERSHIP_PRODUCT_TYPES = ["sselfie_studio_membership", "brand_studio_membership", "pro"] as const

const DIRECT_ONE_TIME_ACADEMY_TYPES = ["selfie_guide", "selfie_guide_bundle", "brand_strategy_pack"] as const

export type AcademyProductType = "course" | "pack" | "template" | "resource" | "bundle"

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
}

export type AcademyEntitlementSource = "purchase" | "membership" | "admin_grant" | "migration_backfill"

type EntitlementRow = {
  product_id: string
}

function buildDefaultRegistry(): AcademyProductRecord[] {
  const miniProducts: AcademyProductRecord[] = Object.values(ACADEMY_PRODUCTS).map((product, idx) => ({
    id: product.id,
    slug: product.id.replace(/_/g, "-"),
    title: product.name,
    type: product.id === "ai_photo_prompts" ? "pack" : "course",
    membershipIncluded: true,
    purchasable: false,
    stripePriceId: product.stripePriceId || null,
    active: true,
    sortOrder: (idx + 1) * 10,
  }))

  const directProducts: AcademyProductRecord[] = [
    {
      id: "selfie_guide",
      slug: "selfie-guide",
      title: "Selfie Guide",
      type: "course",
      membershipIncluded: true,
      purchasable: false,
      stripePriceId: process.env.STRIPE_PRICE_SELFIE_GUIDE?.trim() || null,
      active: true,
      sortOrder: 70,
    },
    {
      id: "selfie_guide_bundle",
      slug: "selfie-guide-bundle",
      title: "Selfie Guide Bundle",
      type: "bundle",
      membershipIncluded: true,
      purchasable: false,
      stripePriceId: process.env.STRIPE_PRICE_SELFIE_GUIDE_BUNDLE?.trim() || null,
      active: true,
      sortOrder: 80,
    },
    {
      id: "brand_strategy_pack",
      slug: "brand-strategy-pack",
      title: "Brand Strategy Pack",
      type: "pack",
      membershipIncluded: true,
      purchasable: false,
      stripePriceId: process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK?.trim() || null,
      active: true,
      sortOrder: 90,
    },
  ]

  return [...miniProducts, ...directProducts]
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
  const fallbackMap = new Map(defaults.map((item) => [item.id, item]))

  try {
    const rows = await sql`
      SELECT
        id,
        slug,
        title,
        type,
        membership_included,
        purchasable,
        stripe_price_id,
        active,
        sort_order
      FROM academy_products
      WHERE active = TRUE
      ORDER BY sort_order ASC, id ASC
    `

    if (!rows.length) {
      return defaults
    }

    const registry = rows.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      type: row.type as AcademyProductType,
      membershipIncluded: row.membership_included === true,
      purchasable: row.purchasable === true,
      stripePriceId: row.stripe_price_id ?? null,
      active: row.active === true,
      sortOrder: Number(row.sort_order) || 0,
    }))

    for (const item of defaults) {
      if (!registry.some((candidate) => candidate.id === item.id)) {
        registry.push(item)
      }
    }

    return registry.sort((a, b) => a.sortOrder - b.sortOrder)
  } catch {
    return defaults
  }
}

async function getExplicitEntitledProductIds(userId: string): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT product_id
      FROM user_entitlements
      WHERE user_id = ${userId}
        AND status = 'active'
        AND valid_from <= NOW()
        AND (valid_until IS NULL OR valid_until > NOW())
    `

    return rows.map((row: EntitlementRow) => row.product_id)
  } catch {
    // Graceful fallback while migration rolls out.
    const fallbackRows = await sql`
      SELECT DISTINCT product_id
      FROM (
        SELECT course_id AS product_id
        FROM academy_course_purchases
        WHERE user_id = ${userId}
          AND status = 'active'
        UNION
        SELECT product_type AS product_id
        FROM subscriptions
        WHERE user_id = ${userId}
          AND status = 'active'
          AND product_type = ANY(${DIRECT_ONE_TIME_ACADEMY_TYPES})
      ) combined
    `
    return fallbackRows.map((row: EntitlementRow) => row.product_id)
  }
}

export async function getAcademyEntitlementState(userId: string) {
  const [registry, membershipActive, explicitProductIds] = await Promise.all([
    getAcademyProductRegistry(),
    hasActiveStudioMembership(userId),
    getExplicitEntitledProductIds(userId),
  ])

  const explicitSet = new Set(explicitProductIds)
  const accessibleSet = new Set(explicitProductIds)

  if (membershipActive) {
    for (const product of registry) {
      if (product.membershipIncluded) {
        accessibleSet.add(product.id)
      }
    }
  }

  return {
    membershipActive,
    products: registry,
    explicitProductIds: Array.from(explicitSet),
    accessibleProductIds: Array.from(accessibleSet),
  }
}

export async function userHasAcademyProductAccess(userId: string, productId: string): Promise<boolean> {
  const state = await getAcademyEntitlementState(userId)
  return state.accessibleProductIds.includes(productId)
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
    // Keep webhook/API happy if migration has not been applied yet.
    console.error("[academy-entitlements] Failed to upsert entitlement:", error)
  }
}
