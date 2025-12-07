import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; showCheckout?: string; checkout?: string }>
}) {
  // Await searchParams in Next.js 15+
  const params = await searchParams

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

  const subscription = await getUserSubscription(neonUser.id)

  console.log("[v0] [STUDIO PAGE] User:", neonUser.email)
  console.log("[v0] [STUDIO PAGE] Subscription status:", subscription?.status ?? "none")

  const isWelcome = params.welcome === "true"
  const shouldShowCheckout = params.showCheckout === "true" || params.checkout === "one_time"

  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name}
      userEmail={neonUser.email}
      isWelcome={isWelcome}
      shouldShowCheckout={shouldShowCheckout}
      subscriptionStatus={subscription?.status ?? null}
    />
  )
}
