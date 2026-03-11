import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export const dynamic = "force-dynamic"

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>
}) {
  try {
    const params = await searchParams
    const promoCode = params?.promo
    const clientSecret = await createLandingCheckoutSession("sselfie_studio_membership", promoCode)

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      redirect(`/checkout?client_secret=${clientSecret}`)
    }

    // Fallback if session creation fails
    redirect("/checkout/failure?product=sselfie_studio_membership")
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[v0] Error creating membership checkout session:", error)
  }

  redirect("/checkout/failure?product=sselfie_studio_membership")
}
