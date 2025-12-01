import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { HooksLibraryClient } from "@/components/admin/ai/hooks-library-client"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function HooksLibraryPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    redirect("/admin")
  }

  return <HooksLibraryClient />
}

