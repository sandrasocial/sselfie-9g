import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"

/**
 * Branded by SSELFIE access gate.
 *
 * The product is delivered as academy course id 1, so this resolves entitlement
 * and deep-links into the course reader. academy-screen filters this product out
 * of the tile grid (COURSE_PRODUCT_IDS), which is why it needs its own link
 * rather than a tile href.
 */
const COURSE_ID = 1

export default async function AcademyBrandedBySselfieAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/branded-by-sselfie")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("branded_by_sselfie")

  if (!hasEntitlement) {
    redirect("/academy?access=required")
  }

  redirect(`/studio?tab=academy&academy_course_id=${COURSE_ID}`)
}
