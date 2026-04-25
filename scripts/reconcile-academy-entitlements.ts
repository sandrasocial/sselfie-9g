import "dotenv/config"

import { sql } from "@/lib/db/client"

type CheckResult = {
  label: string
  passed: boolean
  details: unknown
}

async function runChecks(): Promise<CheckResult[]> {
  const [
    missingCourseProductIds,
    duplicateActiveEntitlements,
    missingCoursePurchaseEntitlements,
    missingDirectPurchaseEntitlements,
    orphanedOverrides,
    missingDeliveryMetadata,
  ] = await Promise.all([
    sql`
      SELECT id, title
      FROM academy_courses
      WHERE status = 'published'
        AND product_id IS NULL
      ORDER BY id ASC
    `,
    sql`
      SELECT user_id, product_id, COUNT(*) AS duplicate_count
      FROM user_entitlements
      WHERE status = 'active'
        AND valid_from <= NOW()
        AND (valid_until IS NULL OR valid_until > NOW())
      GROUP BY user_id, product_id
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, user_id ASC, product_id ASC
    `,
    sql`
      SELECT acp.user_id, acp.course_id
      FROM academy_course_purchases acp
      LEFT JOIN user_entitlements ue
        ON ue.user_id = acp.user_id
       AND ue.product_id = acp.course_id
       AND ue.status = 'active'
      WHERE acp.status = 'active'
        AND ue.id IS NULL
      ORDER BY acp.user_id ASC, acp.course_id ASC
    `,
    sql`
      SELECT s.user_id, s.product_type
      FROM subscriptions s
      LEFT JOIN user_entitlements ue
        ON ue.user_id = s.user_id
       AND ue.product_id = s.product_type
       AND ue.status = 'active'
      WHERE s.status = 'active'
        AND s.product_type IN (
          'selfie_guide',
          'selfie_guide_bundle',
          'brand_strategy_pack',
          'starter_kit',
          'masterclass'
        )
        AND ue.id IS NULL
      ORDER BY s.user_id ASC, s.product_type ASC
    `,
    sql`
      SELECT apo.product_id
      FROM academy_product_overrides apo
      LEFT JOIN academy_products ap ON ap.id = apo.product_id
      WHERE ap.id IS NULL
      ORDER BY apo.product_id ASC
    `,
    sql`
      SELECT id, slug, delivery_kind, access_target, purchasable, stripe_price_id
      FROM academy_products
      WHERE active = TRUE
        AND (
          delivery_kind IS NULL
          OR access_target IS NULL
          OR (purchasable = TRUE AND stripe_price_id IS NULL)
        )
      ORDER BY sort_order ASC, id ASC
    `,
  ])

  return [
    {
      label: "Published courses must have product_id",
      passed: missingCourseProductIds.length === 0,
      details: missingCourseProductIds,
    },
    {
      label: "No duplicate active entitlements",
      passed: duplicateActiveEntitlements.length === 0,
      details: duplicateActiveEntitlements,
    },
    {
      label: "academy_course_purchases must be mirrored in user_entitlements",
      passed: missingCoursePurchaseEntitlements.length === 0,
      details: missingCoursePurchaseEntitlements,
    },
    {
      label: "Direct academy subscriptions must be mirrored in user_entitlements",
      passed: missingDirectPurchaseEntitlements.length === 0,
      details: missingDirectPurchaseEntitlements,
    },
    {
      label: "academy_product_overrides must reference academy_products",
      passed: orphanedOverrides.length === 0,
      details: orphanedOverrides,
    },
    {
      label: "Active products must have delivery metadata and Stripe metadata when purchasable",
      passed: missingDeliveryMetadata.length === 0,
      details: missingDeliveryMetadata,
    },
  ]
}

async function main() {
  const checks = await runChecks()
  let failed = false

  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL"
    console.log(`[academy-reconcile] ${status} ${check.label}`)
    if (!check.passed) {
      failed = true
      console.log(JSON.stringify(check.details, null, 2))
    }
  }

  if (failed) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error("[academy-reconcile] Fatal error:", error)
  process.exitCode = 1
})
