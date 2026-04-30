import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { createServerClient } from "@/lib/supabase/server"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Visibility To Paid Suite",
  description: "Complete your Visibility To Paid Suite purchase.",
}

export default async function VisibilitySuiteCheckoutPage({
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
    source: "visibility_suite_paid",
    returnTo: "/academy/access/visibility-suite",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = await createLandingCheckoutSession(
      "visibility_suite",
      undefined,
      authUser?.email ?? null,
      attribution,
    )

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=visibility_suite&return_to=${encodeURIComponent("/academy/access/visibility-suite")}`)
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Visibility Suite Checkout] Error creating checkout session:", error)
  }

  redirect("/visibility-suite?checkout=failed")
}
