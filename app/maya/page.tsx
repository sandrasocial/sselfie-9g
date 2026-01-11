import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
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
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login?returnTo=/maya")
  }

  // Fix #4: Check if user has paid_blueprint subscription (block Maya access)
  const { hasPaidBlueprint } = await import("@/lib/subscription")
  const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
  
  if (isPaidBlueprint) {
    // Block Maya access - redirect to Blueprint
    console.log(`[Maya Page] Blocking access for paid_blueprint user ${neonUser.id}, redirecting to /blueprint`)
    redirect("/blueprint")
  }

  const subscription = await getUserSubscription(neonUser.id)

  console.log("[v0] [MAYA PAGE] User:", neonUser.email)
  console.log("[v0] [MAYA PAGE] Subscription status:", subscription?.status ?? "none")

  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name}
      userEmail={neonUser.email}
      isWelcome={false}
      shouldShowCheckout={false}
      subscriptionStatus={subscription?.status ?? null}
    />
  )
}
