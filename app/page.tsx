import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import LuxuryLandingPage from "@/components/landing/LuxuryLandingPage"

export const dynamic = "force-dynamic"

export default async function Home() {
  const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured (V0 preview), just show landing page
  if (!supabaseConfigured) {
    console.log("[v0] Supabase not configured - showing landing page")
    return <LuxuryLandingPage />
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const headersList = await headers()
    const referer = headersList.get("referer")
    const refererPath = referer ? new URL(referer).pathname : null

    // If user came from an internal page (not external or direct visit),
    // don't redirect - let them see the landing page
    const isInternalNavigation = refererPath && refererPath !== "/" && !refererPath.startsWith("/auth/")

    // Only redirect to studio if this is a direct visit or external navigation
    if (!isInternalNavigation) {
      // Try to get user from database using correct mapping
      let neonUser = null

      try {
        neonUser = await getUserByAuthId(user.id)
      } catch (error) {
        console.error("[v0] Error fetching user by auth ID:", error)
      }

      // If user not found and we have email, try to sync/create
      if (!neonUser && user.email) {
        try {
          neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
        } catch (error) {
          console.error("[v0] Error syncing user with database:", error)
        }
      }

      // Only redirect if user is properly synced to database
      if (neonUser) {
        redirect("/studio")
      }
    }
  }

  return <LuxuryLandingPage />
}
