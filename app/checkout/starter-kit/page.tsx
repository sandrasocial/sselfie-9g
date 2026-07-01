import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { createServerClient } from "@/lib/supabase/server"
import { buildCheckoutRedirectUrl, getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Selfie To AI Photos Kit",
  description: "Complete your Selfie To AI Photos Kit purchase with one direct checkout path.",
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

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function isNextRedirectError(error: unknown): error is { digest: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  )
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
    cta_keyword?: string
    entry_post_slug?: string
    buyer_stage?: string
    returnTo?: string
    return_to?: string
    freebie_token?: string
    checkout_email?: string
    email?: string
    skip_email_capture?: string
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
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? freebieEmail ?? urlEmail ?? null
  const prefillEmailSource = authUser?.email
    ? "auth"
    : freebieEmail
      ? "freebie_token"
      : urlEmail
        ? "url"
        : "none"

  if (
    shouldShowCheckoutEmailCapture({
      params,
      hasRecoverableEmail: Boolean(checkoutEmail),
      hasAuthUser: Boolean(authUser?.id),
      hasFreebieToken: Boolean(params.freebie_token),
    })
  ) {
    await logAnalyticsEvent({
      eventName: "starter_kit_checkout_email_capture_view",
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
      },
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={params}
        actionPath="/checkout/starter-kit"
        eyebrow="SELFIE TO AI PHOTOS KIT"
        title="Where should I send your Kit?"
        copy="Add your email before checkout so your Kit, receipt, and access link go to the right place. This is the kit for turning one clear selfie into AI photos that still look like you."
        inputId="starter-kit-checkout-email"
      />
    )
  }

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
        prefill_email_source: prefillEmailSource,
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
          prefill_email_source: prefillEmailSource,
        },
      })

      redirect(buildCheckoutRedirectUrl(clientSecret, "starter_kit", params))
    }
  } catch (error: unknown) {
    if (isNextRedirectError(error)) {
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
        prefill_email_source: prefillEmailSource,
        error_message: error instanceof Error ? error.message : String(error),
      },
    })
  }

  redirect("/starter-kit?checkout=failed&source=checkout_retry")
}
