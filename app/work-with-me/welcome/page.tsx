import { redirect } from "next/navigation"

import { WorkWithMeClientHome } from "@/components/work-with-me/client-home"
import { getWorkWithMeProject, hasWorkWithMeAccess } from "@/lib/work-with-me/client-project"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"

export default async function WorkWithMeWelcomePage() {
  const path = "/work-with-me/welcome"
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=${encodeURIComponent(path)}`)

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) redirect(`/auth/login?redirect=${encodeURIComponent(path)}`)
  const userId = String(neonUser.id)
  if (!(await hasWorkWithMeAccess(userId))) redirect("/work-with-me")

  const project = await getWorkWithMeProject(userId)
  return <WorkWithMeClientHome initialProject={project} />
}
