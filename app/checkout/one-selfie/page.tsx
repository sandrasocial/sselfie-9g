import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { getSelfieVisibilityBundleOfferStatus } from "@/lib/launch/selfie-visibility-bundle"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Checkout | One Selfie Visibility Bundle",
  description: "Complete your one-time One Selfie Visibility Bundle purchase.",
}

type CheckoutSearchParams = {
  source?: string
  offer_slug?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  email_type?: string
  campaign_id?: string
  ref?: string
  referral_code?: string
  checkout_source?: string
  cta_keyword?: string
  entry_path?: string
  entry_post_slug?: string
  buyer_stage?: string
  checkout_email?: string
  email?: string
}

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export default async function OneSelfieCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutSearchParams>
}) {
  const params = await searchParams
  const offerStatus = getSelfieVisibilityBundleOfferStatus()

  if (offerStatus.phase === "upcoming") {
    redirect("/one-selfie?offer=upcoming")
  }
  if (offerStatus.phase === "closed") {
    redirect("/one-selfie?offer=closed")
  }

  const attribution = getCheckoutAttributionFromParams(params, {
    offerSlug: "one-selfie-visibility-bundle",
    source: "one_selfie_launch",
    utmCampaign: "one_selfie_visibility_48h",
    checkoutSource: "one_selfie_checkout",
    ctaKeyword: "BUNDLE",
    buyerStage: "suite",
    entryPath: "/one-selfie",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const checkoutEmail =
    authUser?.email ?? normalizeCheckoutEmail(params.checkout_email || params.email)

  try {
    const clientSecret = await createLandingCheckoutSession(
      "selfie_visibility_bundle",
      undefined,
      checkoutEmail,
      attribution
    )

    if (clientSecret) {
      redirect(
        buildCheckoutRedirectUrl(clientSecret, "selfie_visibility_bundle", {
          ...params,
          checkout_email: undefined,
          email: undefined,
        })
      )
    }
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }

    console.error("[One Selfie Checkout] Error creating checkout session:", error)
  }

  redirect("/one-selfie?checkout=failed")
}
