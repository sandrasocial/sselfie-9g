import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from 'next/navigation'
import FeedPlannerScreen from "@/components/feed-planner/feed-planner-screen"

export default async function FeedPlannerPage() {
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

  return <FeedPlannerScreen />
  // </CHANGE>
}
