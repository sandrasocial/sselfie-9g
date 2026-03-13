import { redirect } from "next/navigation"

import BrandStrategySetupForm from "@/components/brand-strategy/brand-strategy-setup-form"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export default async function AcademyBrandStrategyAccessPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/brand-strategy")}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/brand-strategy")}`)
  }

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  if (!entitlementState.accessibleProductIds.includes("brand_strategy_pack")) {
    redirect("/brand-strategy")
  }

  const existingStrategy = await sql`
    SELECT access_token
    FROM freebie_brand_strategies
    WHERE email = LOWER(${authUser.email})
    ORDER BY created_at DESC
    LIMIT 1
  `.catch(() => [] as any[])

  if (existingStrategy[0]?.access_token) {
    redirect(`/strategy/${encodeURIComponent(existingStrategy[0].access_token)}`)
  }

  const displayName = (neonUser as any).display_name || (neonUser as any).displayName || ""

  return <BrandStrategySetupForm email={authUser.email} displayName={displayName} />
}
