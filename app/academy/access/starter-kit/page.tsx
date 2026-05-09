import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"

/**
 * Thin auth + redirect gate for Starter Kit buyers.
 *
 * Auth → entitlement check → look up editing_masterclass course ID → redirect into the
 * in-app course viewer at /academy/courses/[id].
 *
 * The course viewer (app/academy/courses/[courseId]) is the canonical
 * experience: it lives inside the app shell, has lesson resources attached
 * (presets, PDFs, guides), and includes the Maya chat bubble. Add new
 * resources there via the admin, not here.
 */
export default async function AcademyStarterKitAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/starter-kit")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasAccess =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("starter_kit")

  if (!hasAccess) {
    redirect("/starter-kit")
  }

  const rows = await sql`
    SELECT id FROM academy_courses
    WHERE product_id = 'editing_masterclass'
      AND status = 'published'
    LIMIT 1
  `

  const course = (rows as { id: number }[])[0]
  if (!course) {
    redirect("/starter-kit")
  }

  redirect(`/studio?tab=academy&academy_view=courses&academy_course_id=${course.id}`)
}
