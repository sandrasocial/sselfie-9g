import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"

/** AI Photo Prompt Pack access gate. */
export default async function AcademyAiPhotoPromptsAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/ai-photo-prompts")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("ai_photo_prompts")

  if (!hasEntitlement) {
    redirect("/academy?access=required")
  }

  redirect("/academy/ai_photo_prompts")
}
