import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"

/**
 * Editing Masterclass access gate.
 *
 * The product is delivered as academy course id 3, so this resolves entitlement
 * and deep-links into the course reader. academy-screen filters this product out
 * of the tile grid (COURSE_PRODUCT_IDS), which is why it needs its own link
 * rather than a tile href.
 */
const COURSE_ID = 3

export default async function AcademyEditingMasterclassAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/editing-masterclass")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("editing_masterclass")

  if (!hasEntitlement) {
    redirect("/academy?access=required")
  }

  redirect(`/studio?tab=academy&academy_course_id=${COURSE_ID}`)
}
