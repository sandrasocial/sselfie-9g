import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export default async function MembershipCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = await createLandingCheckoutSession("sselfie_studio_membership")

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      redirect(`/checkout?client_secret=${clientSecret}`)
    } else {
      // Fallback if session creation fails
      redirect("/auth/sign-up?checkout=studio_membership")
    }
  } catch (error) {
    console.error("[v0] Error creating membership checkout session:", error)
    redirect("/auth/sign-up?checkout=studio_membership")
  }
}
