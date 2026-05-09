import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"

/**
 * Thin auth + redirect gate for Masterclass buyers.
 *
 * Auth → entitlement check → look up branded_by_sselfie course ID → redirect into the
 * in-app course viewer at /academy/courses/[id].
 *
 * The course viewer (app/academy/courses/[courseId]) is the canonical
 * experience: it lives inside the app shell, has lesson resources attached,
 * and includes the Maya chat bubble. Add new resources there via the admin,
 * not here.
 */
export default async function MasterclassAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/masterclass")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const accessibleIds = new Set(entitlementState.accessibleProductIds)
  const explicitIds = new Set(entitlementState.explicitProductIds)

  const hasMasterclassAccess =
    entitlementState.membershipActive ||
    explicitIds.has("masterclass") ||
    accessibleIds.has("masterclass") ||
    accessibleIds.has("branded_by_sselfie") ||
    accessibleIds.has("editing_masterclass")

  if (!hasMasterclassAccess) {
    redirect("/masterclass")
  }

  const rows = await sql`
    SELECT id FROM academy_courses
    WHERE product_id = 'branded_by_sselfie'
      AND status = 'published'
    LIMIT 1
  `

  const course = (rows as { id: number }[])[0]
  if (!course) {
    redirect("/masterclass")
  }

  redirect(`/academy/courses/${course.id}`)
}
