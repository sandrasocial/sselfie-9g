import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import CreditsCheckoutClient from "@/app/checkout/credits/client"

export default async function CreditsCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=%2Fcheckout%2Fcredits")
  }

  return <CreditsCheckoutClient />
}
