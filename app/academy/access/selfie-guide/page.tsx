import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { ensurePaidSelfieGuideSubscriber } from "@/lib/freebie/selfie-guide-access"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export default async function AcademySelfieGuideAccessPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/selfie-guide")}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/selfie-guide")}`)
  }

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  const hasAccess =
    entitlementState.accessibleProductIds.includes("selfie_guide") ||
    entitlementState.accessibleProductIds.includes("selfie_guide_bundle")

  if (!hasAccess) {
    redirect("/selfie-guide")
  }

  const subscriber = await ensurePaidSelfieGuideSubscriber(authUser.email, null)
  redirect(`/selfie-guide/access/${encodeURIComponent(subscriber.accessToken)}`)
}
