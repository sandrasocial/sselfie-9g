import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"
import { createServerClient } from "@/lib/supabase/server"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | Masterclass",
  description: "Complete your Selfie Masterclass purchase with one direct checkout path.",
}

export default async function MasterclassCheckoutPage({
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
    checkout_email?: string
    email?: string
    skip_email_capture?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "masterclass_paid",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const checkoutEmail = authUser?.email ?? normalizeCheckoutEmail(params.checkout_email || params.email)

  if (
    shouldShowCheckoutEmailCapture({
      params,
      hasRecoverableEmail: Boolean(checkoutEmail),
      hasAuthUser: Boolean(authUser?.id),
      hasFreebieToken: false,
    })
  ) {
    await logAnalyticsEvent({
      eventName: "masterclass_checkout_email_capture_view",
      path: "/checkout/masterclass",
      properties: {
        product_type: "masterclass",
        source: attribution.source,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        email_type: attribution.emailType,
        checkout_source: attribution.checkoutSource,
        cta_keyword: attribution.ctaKeyword,
        entry_post_slug: attribution.entryPostSlug,
        buyer_stage: attribution.buyerStage,
      },
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={params}
        actionPath="/checkout/masterclass"
        eyebrow="SELFIE BRANDING MASTERCLASS"
        title="Turn your photos into a brand people understand."
        copy="Review your order, then add the email where you want your course access. You’ll start with your foundation, then build the content, captions, offer bridge, and 30-day plan that give your photos somewhere to lead."
        proofQuote=""
        proofAuthor=""
        inputId="masterclass-checkout-email"
        buttonLabel="Continue to secure checkout"
        productName="Selfie Branding Masterclass"
        productMeta="The complete clarity-to-content method, yours to keep"
        productPrice="$147 one-time"
        orderLabel="Your order"
        reassurance="Your receipt and instant course access go to this inbox."
        visuals={[
          {
            src: "/academy/sselfie-minimalism/academy-masterclass.jpg",
            alt: "Selfie Branding Masterclass course preview",
          },
          {
            src: "/assets/brand-strategy/woman.png",
            alt: "Personal brand strategy workbook preview",
          },
          {
            src: "/assets/brand-strategy/journals.png",
            alt: "Brand planning journal preview",
          },
        ]}
      />
    )
  }

  try {
    await logAnalyticsEvent({
      eventName: "masterclass_checkout_session_requested",
      path: "/checkout/masterclass",
      properties: {
        product_type: "masterclass",
        source: attribution.source,
        checkout_source: attribution.checkoutSource,
        has_prefill_email: Boolean(checkoutEmail),
        prefill_email_source: authUser?.email ? "auth" : "url",
      },
    })

    const clientSecret = await createLandingCheckoutSession(
      "masterclass",
      undefined,
      checkoutEmail,
      attribution,
    )

    if (clientSecret) {
      await logAnalyticsEvent({
        eventName: "masterclass_checkout_session_created",
        path: "/checkout/masterclass",
        properties: {
          product_type: "masterclass",
          checkout_session_id: clientSecret.split("_secret_")[0] || null,
          source: attribution.source,
          checkout_source: attribution.checkoutSource,
          has_prefill_email: Boolean(checkoutEmail),
        },
      })

      redirect(
        buildCheckoutRedirectUrl(clientSecret, "masterclass", {
          ...params,
          checkout_email: undefined,
          email: undefined,
        }),
      )
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Masterclass Checkout] Error creating checkout session:", error)
    await logAnalyticsEvent({
      eventName: "masterclass_checkout_session_failed",
      path: "/checkout/masterclass",
      properties: {
        product_type: "masterclass",
        source: attribution.source,
        checkout_source: attribution.checkoutSource,
        has_prefill_email: Boolean(checkoutEmail),
        error_message: error?.message || String(error),
      },
    })
  }

  redirect("/masterclass?checkout=failed")
}
