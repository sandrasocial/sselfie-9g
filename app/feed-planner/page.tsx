import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { redirect } from 'next/navigation'
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function FeedPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; tab?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=/feed-planner")
  }

  let neonUser = null
  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("[v0] Error fetching user by auth ID:", error)
  }

  if (!neonUser && user.email) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
    }
  }

  if (!neonUser) {
    redirect("/auth/login?returnTo=/feed-planner")
  }

  const subscription = await getUserSubscription(neonUser.id)
  const params = await searchParams
  const purchaseSuccess = params.purchase === "success"
  const initialTab = params.tab || "feed-planner" // Default to feed-planner tab

  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name}
      userEmail={neonUser.email}
      isWelcome={false}
      shouldShowCheckout={false}
      subscriptionStatus={subscription?.status ?? null}
      purchaseSuccess={purchaseSuccess}
      initialTab={initialTab}
    />
  )
}
