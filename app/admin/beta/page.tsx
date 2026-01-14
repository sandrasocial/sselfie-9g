import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from 'next/navigation'
import { BetaProgramManager } from "@/components/admin/beta-program-manager"

export const dynamic = "force-dynamic"

export default async function BetaProgramPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get or create Neon user
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

  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL
  if (!neonUser || neonUser.email !== adminEmail) {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <BetaProgramManager />
    </div>
  )
}
