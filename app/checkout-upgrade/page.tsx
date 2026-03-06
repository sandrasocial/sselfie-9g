import { redirect } from "next/navigation"
import CheckoutUpgradeClient from "./checkout-upgrade-client"
import { createServerClient } from "@/lib/supabase/server"

export default async function CheckoutUpgradePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=%2Fcheckout-upgrade")
  }

  return <CheckoutUpgradeClient />
}
