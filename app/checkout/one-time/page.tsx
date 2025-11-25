import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export default async function OneTimeCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = await createLandingCheckoutSession("one_time_session")

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      redirect(`/checkout?client_secret=${clientSecret}`)
    } else {
      // Fallback if session creation fails
      redirect("/auth/sign-up?checkout=one_time")
    }
  } catch (error) {
    console.error("[v0] Error creating one-time checkout session:", error)
    redirect("/auth/sign-up?checkout=one_time")
  }
}
