import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { createServerClient } from "@/lib/supabase/server"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Starter Kit",
  description: "Complete your Selfie Starter Kit purchase with one direct checkout path.",
}

export default async function StarterKitCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    email_type?: string
    campaign_id?: string
    ref?: string
    guide_cta?: string
    freebie_source?: string
    checkout_source?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "starter_kit_paid",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = await createLandingCheckoutSession(
      "starter_kit",
      undefined,
      authUser?.email ?? null,
      attribution,
    )

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=starter_kit`)
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Starter Kit Checkout] Error creating checkout session:", error)
  }

  redirect("/starter-kit?checkout=failed")
}
