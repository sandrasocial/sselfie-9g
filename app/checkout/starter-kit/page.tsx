import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { buildCheckoutRedirectUrl, getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Starter Kit",
  description: "Complete your Selfie Starter Kit purchase with one direct checkout path.",
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
    freebie_token?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "starter_kit_paid",
    buyerStage: "micro",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const freebieEmail = authUser?.email ? null : await getEmailFromFreebieToken(params.freebie_token)
  const checkoutEmail = authUser?.email ?? freebieEmail ?? null

  try {
    await logAnalyticsEvent({
      eventName: "starter_kit_checkout_session_requested",
      path: "/checkout/starter-kit",
      properties: {
        product_type: "starter_kit",
        source: attribution.source,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        email_type: attribution.emailType,
        checkout_source: attribution.checkoutSource,
        guide_cta: attribution.guideCta,
        freebie_source: attribution.freebieSource,
        cta_keyword: attribution.ctaKeyword,
        entry_post_slug: attribution.entryPostSlug,
        buyer_stage: attribution.buyerStage,
        has_freebie_token: Boolean(params.freebie_token),
        has_prefill_email: Boolean(checkoutEmail),
      },
    })

    const clientSecret = await createLandingCheckoutSession(
      "starter_kit",
      undefined,
      checkoutEmail,
      attribution,
    )

    if (clientSecret) {
      const sessionId = clientSecret.split("_secret_")[0] || null

      await logAnalyticsEvent({
        eventName: "starter_kit_checkout_session_created",
        path: "/checkout/starter-kit",
        properties: {
          product_type: "starter_kit",
          checkout_session_id: sessionId,
          source: attribution.source,
          utm_source: attribution.utmSource,
          utm_medium: attribution.utmMedium,
          utm_campaign: attribution.utmCampaign,
          utm_content: attribution.utmContent,
          email_type: attribution.emailType,
          checkout_source: attribution.checkoutSource,
          guide_cta: attribution.guideCta,
          freebie_source: attribution.freebieSource,
          cta_keyword: attribution.ctaKeyword,
          entry_post_slug: attribution.entryPostSlug,
          buyer_stage: attribution.buyerStage,
          has_freebie_token: Boolean(params.freebie_token),
          has_prefill_email: Boolean(checkoutEmail),
        },
      })

      redirect(buildCheckoutRedirectUrl(clientSecret, "starter_kit", params))
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Starter Kit Checkout] Error creating checkout session:", error)
    await logAnalyticsEvent({
      eventName: "starter_kit_checkout_session_failed",
      path: "/checkout/starter-kit",
      properties: {
        product_type: "starter_kit",
        source: attribution.source,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        email_type: attribution.emailType,
        checkout_source: attribution.checkoutSource,
        guide_cta: attribution.guideCta,
        freebie_source: attribution.freebieSource,
        cta_keyword: attribution.ctaKeyword,
        entry_post_slug: attribution.entryPostSlug,
        buyer_stage: attribution.buyerStage,
        has_freebie_token: Boolean(params.freebie_token),
        has_prefill_email: Boolean(checkoutEmail),
        error_message: error?.message || String(error),
      },
    })
  }

  redirect("/starter-kit?checkout=failed&source=checkout_retry")
}
