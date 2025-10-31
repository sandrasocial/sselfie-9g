import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export default async function StudioPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No auth user - redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // Try to get user from database
  let neonUser = null
  let userError = null

  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("Error fetching user by auth ID:", error)
    userError = error
  }

  // If user not found and we have email, try to sync/create
  if (!neonUser && user.email && !userError) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("Error syncing user with database:", error)
      userError = error
    }
  }

  // If still no user or there was an error, redirect to login
  if (!neonUser || userError) {
    console.error("User authenticated but could not be synced with database")
    redirect("/auth/login")
  }

  return <SselfieApp userId={neonUser.id} userName={neonUser.display_name} userEmail={neonUser.email} />
}
