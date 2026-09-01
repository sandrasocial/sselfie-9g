import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserMembershipAccess } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function MayaPage() {
  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    redirect("/auth/login?error=supabase_config&returnTo=/maya")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=/maya")
  }

  let neonUser = null
  let userError = null

  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("[v0] Error fetching user by auth ID:", error)
    userError = error
  }

  if (!neonUser && user.email && !userError) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login?returnTo=/maya")
  }

  // Check Maya access: Studio members always have access, even if they also have paid blueprint
  // Priority 1: Studio Membership (highest tier) - always gets Maya
  // Priority 2: LEGACY_ACCESS_ONLY paid_blueprint only (no studio) - blocked from Maya
  // Priority 3: All others (free, one-time session) - Maya access granted
  const { hasStudioMembership, hasPaidBlueprint } = await import("@/lib/subscription")
  
  const hasStudio = await hasStudioMembership(neonUser.id)
  
  if (hasStudio) {
    // Studio members have full Maya access
    console.log(`[Maya Page] ✅ Studio member ${neonUser.email} has Maya access`)
  } else {
    // For non-studio users, check if they have paid blueprint (should use Blueprint instead)
    const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
    
    if (isPaidBlueprint) {
      // Block Maya access - redirect to Blueprint
      console.log(`[Maya Page] ❌ Paid blueprint-only user ${neonUser.email}, redirecting to /blueprint`)
      redirect("/blueprint")
    }
    
    // All other users (free, one-time session) get Maya access
    console.log(`[Maya Page] ✅ User ${neonUser.email} has Maya access`)
  }

  const subscription = await getUserMembershipAccess(neonUser.id)

  console.log("[v0] [MAYA PAGE] User:", neonUser.email)
  console.log("[v0] [MAYA PAGE] Subscription status:", subscription?.status ?? "none")

  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name ?? null}
      userEmail={neonUser.email}
      isWelcome={false}
      shouldShowCheckout={false}
      subscriptionStatus={subscription?.status ?? null}
      productType={subscription?.product_type ?? null}
      userRole={neonUser.role ?? null}
    />
  )
}
