import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export default async function Home() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let neonUser = await getUserByAuthId(user.id)

  if (!neonUser && user.email) {
    neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
  }

  if (!neonUser) {
    console.error("User authenticated but could not be synced with Neon database")
    redirect("/auth/login")
  }

  return <SselfieApp userId={neonUser.id} userName={neonUser.display_name} userEmail={neonUser.email} />
}
