import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserCredits } from "@/lib/credits"
import { hasStudioMembership } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function StudioPage({
  searchParams,
}: {
  searchParams: { welcome?: string; showCheckout?: string; checkout?: string }
}) {
  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    redirect("/auth/login?error=supabase_config&returnTo=/studio")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=/studio")
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
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login?returnTo=/studio")
  }

  const creditBalance = await getUserCredits(neonUser.id)
  const hasActiveMembership = await hasStudioMembership(neonUser.id)

  console.log("[v0] [ACCESS CONTROL] User:", neonUser.email)
  console.log("[v0] [ACCESS CONTROL] Credits:", creditBalance)
  console.log("[v0] [ACCESS CONTROL] Has Membership:", hasActiveMembership)

  // If user has no credits AND no active membership, redirect to checkout
  if (creditBalance === 0 && !hasActiveMembership) {
    console.log("[v0] [ACCESS CONTROL] ❌ User has no access - redirecting to checkout")
    redirect("/checkout/one-time")
  }

  console.log("[v0] [ACCESS CONTROL] ✅ User has access to studio")

  const isWelcome = searchParams.welcome === "true"
  const shouldShowCheckout = searchParams.showCheckout === "true" || searchParams.checkout === "one_time"

  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name}
      userEmail={neonUser.email}
      isWelcome={isWelcome}
      shouldShowCheckout={shouldShowCheckout}
    />
  )
}
