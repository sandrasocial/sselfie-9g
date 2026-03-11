import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export const dynamic = "force-dynamic"

export default async function OneTimeCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>
}) {
  try {
    const params = await searchParams
    const promoCode = params?.promo
    const clientSecret = await createLandingCheckoutSession("one_time_session", promoCode)

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      redirect(`/checkout?client_secret=${clientSecret}`)
    }

    // Fallback if session creation fails
    redirect("/checkout/failure?product=one_time_session")
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[v0] Error creating one-time checkout session:", error)
  }

  redirect("/checkout/failure?product=one_time_session")
}
