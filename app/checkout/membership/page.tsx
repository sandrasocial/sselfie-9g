import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import MembershipCheckoutClient from "./membership-checkout-client"

export const dynamic = "force-dynamic"

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string; interval?: string; fallback?: string }>
}) {
  const params = await searchParams

  // If interval is passed directly (from the client toggle), proceed straight to Stripe
  if (params.interval) {
    const productId = params.interval === "year"
      ? "sselfie_studio_membership_annual"
      : "sselfie_studio_membership"

    try {
      const clientSecret = await createLandingCheckoutSession(productId, params.promo)
      if (clientSecret) {
        redirect(`/checkout?client_secret=${clientSecret}`)
      }
    } catch (error: any) {
      if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
      console.error("[checkout/membership] Error creating session:", error)
    }
    redirect("/checkout/failure?product=" + productId)
  }

  // Default: show the billing toggle landing page
  return <MembershipCheckoutClient promoCode={params.promo} />
}
