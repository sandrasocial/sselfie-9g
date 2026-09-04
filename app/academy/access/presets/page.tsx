import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { unlockPresetsForMember } from "@/lib/skool/member-product-unlock"

/**
 * SSELFIE Presets access gate.
 *
 * Auth -> entitlement check -> mint-or-reuse the preset order -> redirect to
 * /access/presets/[token].
 *
 * Members are granted the Full Collection, which strictly contains the Single, so
 * both catalogue entries resolve here.
 */
export default async function AcademyPresetsAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/presets")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("presets_bundle") ||
    entitlementState.accessibleProductIds.includes("presets_single")

  if (!hasEntitlement) {
    redirect("/presets?access=required")
  }

  const token = await unlockPresetsForMember(neonUser.id, neonUser.email)
  if (!token) {
    redirect("/presets?access=required")
  }

  redirect(`/access/presets/${encodeURIComponent(token)}`)
}
