import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { unlockAiPhotosKitForMember } from "@/lib/skool/member-product-unlock"

/**
 * Selfie To AI Photos Kit access gate.
 *
 * Auth -> entitlement check -> mint-or-reuse the buyer token -> redirect to
 * /access/selfie-to-ai-photos-kit/[token], which stays the canonical delivery so
 * the link in a buyer's email keeps working.
 *
 * Members reach this without ever having bought, so the token is minted here
 * rather than by a Stripe webhook.
 */
export default async function AcademyAiPhotosKitAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/selfie-to-ai-photos-kit")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("selfie_ai_photos_kit")

  if (!hasEntitlement) {
    redirect("/selfie-to-ai-photos-kit?access=required")
  }

  const token = await unlockAiPhotosKitForMember(neonUser.email)
  if (!token) {
    redirect("/selfie-to-ai-photos-kit?access=required")
  }

  redirect(`/access/selfie-to-ai-photos-kit/${encodeURIComponent(token)}`)
}
