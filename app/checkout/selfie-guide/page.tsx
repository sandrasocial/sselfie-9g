import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { startProductCheckoutSession } from "@/app/actions/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Selfie Guide",
  description: "Complete your Selfie Guide purchase with one direct checkout path.",
}

export default async function SelfieGuideCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "selfie_guide_paid",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = authUser
      ? await startProductCheckoutSession("selfie_guide", undefined, attribution)
      : await createLandingCheckoutSession("selfie_guide", undefined, null, attribution)

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=selfie_guide`)
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Selfie Guide Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-guide?checkout=failed")
}
