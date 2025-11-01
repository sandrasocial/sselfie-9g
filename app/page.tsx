import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import LandingPage from "@/components/sselfie/landing-page"

export default async function Home() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
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
    // Redirect is NOT in try-catch so Next.js can handle it properly
    if (neonUser) {
      redirect("/studio")
    }
  }

  return <LandingPage />
}
