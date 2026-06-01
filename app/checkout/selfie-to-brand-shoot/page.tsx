import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Selfie to Brand Shoot System",
  description: "Complete your Selfie to Brand Shoot System purchase.",
}

async function getEmailFromFreebieToken(token?: string | null): Promise<string | null> {
  const cleanToken = token?.trim()
  if (!cleanToken) return null

  const rows = await sql`
    SELECT email
    FROM freebie_subscribers
    WHERE access_token = ${cleanToken}
      AND email IS NOT NULL
      AND email <> ''
    LIMIT 1
  `

  return (rows[0]?.email as string | undefined) || null
}

export default async function SelfieToBrandShootCheckoutPage({
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
    checkout_source?: string
    freebie_source?: string
    guide_cta?: string
    cta_keyword?: string
    quiz_result?: string
    entry_path?: string
    entry_post_slug?: string
    buyer_stage?: string
    freebie_token?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "selfie_to_brand_shoot_paid",
    buyerStage: "suite",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const freebieEmail = authUser?.email ? null : await getEmailFromFreebieToken(params.freebie_token)

  try {
    const clientSecret = await createLandingCheckoutSession(
      "selfie_to_brand_shoot_system",
      undefined,
      authUser?.email ?? freebieEmail ?? null,
      attribution,
    )

    if (clientSecret) {
      redirect(buildCheckoutRedirectUrl(clientSecret, "selfie_to_brand_shoot_system", params))
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

    console.error("[Selfie to Brand Shoot Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-to-brand-shoot?checkout=failed")
}
