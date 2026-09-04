import { redirect } from "next/navigation"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"

/**
 * AI Photo Prompt Pack access gate.
 *
 * This product has no dedicated content route and no fulfilment handler — the
 * `bought_ai_photo_prompts` tag is declared in lib/products.ts and referenced
 * nowhere else. (/ai-prompts is a separate free lead magnet that upsells the
 * Prompt Vault, so it is the wrong destination for someone who owns this.)
 *
 * Until the pack has real content, entitled members land on the product page,
 * which lists what the pack includes and links onward into the library. That is
 * an honest destination; a 404 was not.
 */
export default async function AcademyAiPhotoPromptsAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/ai-photo-prompts")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("ai_photo_prompts")

  if (!hasEntitlement) {
    redirect("/academy?access=required")
  }

  redirect("/academy/products/ai_photo_prompts")
}
