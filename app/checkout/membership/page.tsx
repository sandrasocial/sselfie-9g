import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export default async function MembershipCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Redirect to embedded Stripe checkout for membership
  if (authUser) {
    // User is logged in - use standard checkout flow
    redirect(`/studio?checkout=studio_membership`)
  } else {
    // User not logged in - redirect to sign up with checkout intent
    redirect(`/auth/sign-up?checkout=studio_membership`)
  }
}
