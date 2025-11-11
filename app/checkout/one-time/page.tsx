import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export default async function OneTimeCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Redirect to embedded Stripe checkout for one-time session
  if (authUser) {
    // User is logged in - use standard checkout flow
    redirect(`/studio?checkout=one_time`)
  } else {
    // User not logged in - redirect to sign up with checkout intent
    redirect(`/auth/sign-up?checkout=one_time`)
  }
}
