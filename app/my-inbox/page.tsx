import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { IgInboxClient } from "@/components/ig-agent/ig-inbox-client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function MyInboxPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")
  if (user.email !== ADMIN_EMAIL) redirect("/")

  return <IgInboxClient mobile />
}

