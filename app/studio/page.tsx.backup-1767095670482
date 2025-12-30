import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; showCheckout?: string; checkout?: string; impersonate?: string }>
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

  // Check if admin is impersonating (simple cookie check)
  const { getImpersonatedUserId } = await import("@/lib/simple-impersonation")
  const impersonatedUserId = await getImpersonatedUserId()

  let neonUser = null
  let userError = null

  if (impersonatedUserId) {
    // Admin is impersonating - get the impersonated user
    const { getNeonUserById } = await import("@/lib/user-mapping")
    try {
      neonUser = await getNeonUserById(impersonatedUserId)
      if (neonUser) {
        console.log("[v0] [IMPERSONATION] Admin impersonating user:", neonUser.email)
      }
    } catch (error) {
      console.error("[v0] Error fetching impersonated user:", error)
      userError = error
    }
  }
  
  if (!neonUser) {
    // Normal flow - get current user
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

  const isImpersonating = !!impersonatedUserId

  return (
    <>
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b-2 border-yellow-500 shadow-lg px-4 py-2 text-center">
          <p className="text-sm font-medium text-black">
            🎭 Viewing as <span className="font-semibold">{neonUser.email}</span>
            {" "}
            <a href="/admin/exit-impersonation" className="underline ml-2">Exit →</a>
          </p>
        </div>
      )}
      <SselfieApp
        userId={neonUser.id}
        userName={neonUser.display_name}
        userEmail={neonUser.email}
        isWelcome={isWelcome}
        shouldShowCheckout={shouldShowCheckout}
        subscriptionStatus={subscription?.status ?? null}
      />
    </>
  )
}
