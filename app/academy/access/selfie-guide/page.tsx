import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { ensurePaidSelfieGuideSubscriber } from "@/lib/freebie/selfie-guide-access"

export default async function AcademySelfieGuideAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/selfie-guide")

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  const hasAccess =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("selfie_guide") ||
    entitlementState.accessibleProductIds.includes("selfie_guide_bundle") ||
    entitlementState.accessibleProductIds.includes("starter_kit")

  if (!hasAccess) {
    redirect("/selfie-guide")
  }

  const subscriber = await ensurePaidSelfieGuideSubscriber(neonUser.email, null)
  redirect(`/selfie-guide/access/${encodeURIComponent(subscriber.accessToken)}`)
}
