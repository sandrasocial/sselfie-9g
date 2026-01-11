import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from 'next/navigation'
import FeedPlannerClient from "./feed-planner-client"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { sql } from "@/lib/neon"

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

  // Phase 1.2: Check access control
  const access = await getFeedPlannerAccess(neonUser.id.toString())

  // Phase 3: Get user name for wizard
  const userResult = await sql`
    SELECT display_name, email
    FROM users
    WHERE id = ${neonUser.id}
    LIMIT 1
  `
  const userName = userResult.length > 0 ? userResult[0].display_name : null

  return <FeedPlannerClient access={access} userId={neonUser.id.toString()} userName={userName} />
}
