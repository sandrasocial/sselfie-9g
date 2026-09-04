import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"

/**
 * Branded by SSELFIE access gate.
 *
 * Resolve the current published course by product ID, then deep-link into the
 * course reader. academy-screen filters this product out
 * of the tile grid (COURSE_PRODUCT_IDS), which is why it needs its own link
 * rather than a tile href.
 */
export default async function AcademyBrandedBySselfieAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/branded-by-sselfie")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("branded_by_sselfie")

  if (!hasEntitlement) {
    redirect("/academy?access=required")
  }

  const rows = await sql`
    SELECT id FROM academy_courses
    WHERE product_id = 'branded_by_sselfie'
      AND status = 'published'
    LIMIT 1
  `
  const course = (rows as { id: number }[])[0]

  if (!course) {
    redirect("/academy?course=unavailable")
  }

  redirect(`/studio?tab=academy&academy_view=courses&academy_course_id=${course.id}`)
}
