import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import ContentCalendarScreen from "@/components/sselfie/content-calendar-screen"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function AdminCalendarPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let neonUser = null
  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
  }

  if (!neonUser && user.email) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user:", error)
    }
  }

  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    redirect("/")
  }

  return (
    <div className="h-screen w-full">
      <ContentCalendarScreen userId={String(neonUser.id)} />
    </div>
  )
}
