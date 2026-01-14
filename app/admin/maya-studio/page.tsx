import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import MayaStudioClient from "@/components/admin/maya-studio-client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function MayaStudioPage() {
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
    redirect("/404")
  }

  return (
    <MayaStudioClient
      userId={String(neonUser.id)}
      userEmail={neonUser.email}
      userName={neonUser.display_name || null}
    />
  )
}
