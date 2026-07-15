import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { isCampaignOutcomeEnabled } from "@/lib/campaign-outcome/feature"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Your Next Campaign",
  description: "Complete your one-time $97 campaign order.",
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
  repeat_order_token?: string
}

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export default async function CampaignCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutSearchParams>
}) {
  const params = await searchParams
  if (!isCampaignOutcomeEnabled()) redirect("/campaign?offer=not-open")

  const attribution = getCheckoutAttributionFromParams(params, {
    offerSlug: "your-next-campaign",
    source: "campaign_outcome_paid",
    utmCampaign: "campaign_outcome_test",
    checkoutSource: "campaign_checkout",
    ctaKeyword: "CAMPAIGN",
    buyerStage: "micro",
    entryPath: "/campaign",
  })
  const checkoutEmail = normalizeCheckoutEmail(params.checkout_email || params.email)

  try {
    const clientSecret = await createLandingCheckoutSession(
      "campaign_outcome",
      undefined,
      checkoutEmail,
      {
        ...attribution,
        repeatOrderToken: params.repeat_order_token || null,
      }
    )

    if (clientSecret) {
      // The shared embedded checkout records campaign_checkout_start only after
      // the payment entry is actually visible. Do not also count session creation.
      redirect(
        buildCheckoutRedirectUrl(clientSecret, "campaign_outcome", {
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
    console.error("[Campaign Checkout] Could not create checkout:", error)
  }

  redirect("/campaign?checkout=failed")
}
