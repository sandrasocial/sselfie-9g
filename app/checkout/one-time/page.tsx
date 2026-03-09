import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export default async function OneTimeCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const params = await searchParams
    const promoCode = params?.promo
    const clientSecret = await createLandingCheckoutSession("one_time_session", promoCode)

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      redirect(`/checkout?client_secret=${clientSecret}`)
    } else {
      // Fallback if session creation fails
      redirect("/checkout/failure?product=one_time_session")
    }
  } catch (error) {
    console.error("[v0] Error creating one-time checkout session:", error)
    redirect("/checkout/failure?product=one_time_session")
  }
}
