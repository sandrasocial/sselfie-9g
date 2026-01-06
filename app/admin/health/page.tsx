import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { HealthCheckDashboard } from "@/components/admin/health-check-dashboard"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function AdminHealthPage() {
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
    console.error("[v0] Error fetching user by auth ID:", error)
    userError = error
  }

  // If user not found and we have email, try to sync/create
  if (!neonUser && user.email && !userError) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  // If still no user or there was an error, redirect to login
  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login")
  }

  // Check if user is admin
  if (neonUser.email !== ADMIN_EMAIL) {
    redirect("/")
  }

  return <HealthCheckDashboard />
}

