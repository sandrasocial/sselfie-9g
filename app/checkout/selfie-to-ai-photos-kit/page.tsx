import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { shouldShowPromptVaultCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { buildCheckoutRedirectUrl, getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"
import { normalizeCheckoutEmail } from "@/lib/revenue-engine/checkout-email"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Checkout | Selfie To AI Photos Kit",
  description: "Complete your Selfie To AI Photos Kit purchase.",
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
      AND (
        source = 'ai-prompts'
        OR 'ai-prompts-subscriber' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'ai-photoshoot-audience' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  return (rows[0]?.email as string | undefined) || null
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

function getErrorInfo(error: unknown): { message: string; code: string | null; type: string | null } {
  if (error instanceof Error) {
    const stripeLike = error as Error & { code?: unknown; type?: unknown }
    return {
      message: error.message,
      code: typeof stripeLike.code === "string" ? stripeLike.code : null,
      type: typeof stripeLike.type === "string" ? stripeLike.type : null,
    }
  }

  return {
    message: typeof error === "string" ? error : "Unknown checkout session error",
    code: null,
    type: null,
  }
}

export default async function SelfieAiPhotosKitCheckoutPage({
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
    prompt_n?: string
    prompt_number?: string
    entry_path?: string
    entry_post_slug?: string
    buyer_stage?: string
    freebie_token?: string
    checkout_email?: string
    email?: string
    skip_email_capture?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "selfie_ai_photos_kit_paid",
    buyerStage: "micro",
    ctaKeyword: "PROMPT",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const freebieEmail = authUser?.email ? null : await getEmailFromFreebieToken(params.freebie_token)
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? freebieEmail ?? urlEmail ?? null
  const prefillEmailSource = authUser?.email ? "auth" : freebieEmail ? "freebie_token" : urlEmail ? "url" : "none"
  const hasPrefillEmail = Boolean(checkoutEmail)

  if (
    shouldShowPromptVaultCheckoutEmailCapture({
      params,
      hasRecoverableEmail: hasPrefillEmail,
      hasAuthUser: Boolean(authUser?.id),
      hasFreebieToken: Boolean(params.freebie_token?.trim()),
    })
  ) {
    await logAnalyticsEvent({
      eventName: "selfie_ai_photos_kit_checkout_email_capture_view",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-ai-photos-kit",
      properties: {
        product_type: "selfie_ai_photos_kit",
        source: attribution.source,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        checkout_source: attribution.checkoutSource,
        cta_keyword: attribution.ctaKeyword,
        buyer_stage: attribution.buyerStage,
        has_freebie_token: Boolean(params.freebie_token),
      },
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={params}
        actionPath="/checkout/selfie-to-ai-photos-kit"
        eyebrow="SELFIE TO AI PHOTOS KIT"
        title="Where should I send your Kit?"
        copy="Add your email before checkout so your AI photo prompts, fix prompts, and access link go to the right place."
        proofQuote="I want AI photos, but I still want them to look like me."
        proofAuthor="The SSELFIE woman this kit was made for"
        inputId="selfie-ai-photos-kit-checkout-email"
        productName="Selfie To AI Photos Kit"
        productMeta="One clear selfie into realistic AI photos"
        productPrice="$37 one-time"
        visuals={[
          {
            src: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
            alt: "Clean editorial AI photo example",
          },
          {
            src: "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
            alt: "Dark feminine AI photo example",
          },
          {
            src: "/images/ai-prompts/denim-street-shot-1.jpg",
            alt: "Denim street AI photo example",
          },
        ]}
      />
    )
  }

  try {
    await logAnalyticsEvent({
      eventName: "selfie_ai_photos_kit_checkout_session_requested",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-ai-photos-kit",
      properties: {
        product_type: "selfie_ai_photos_kit",
        source: attribution.source,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        checkout_source: attribution.checkoutSource,
        cta_keyword: attribution.ctaKeyword,
        buyer_stage: attribution.buyerStage,
        has_prefill_email: hasPrefillEmail,
        prefill_email_source: prefillEmailSource,
      },
    })

    const clientSecret = await createLandingCheckoutSession(
      "selfie_ai_photos_kit",
      undefined,
      checkoutEmail,
      attribution,
    )

    if (clientSecret) {
      const stripeSessionId = clientSecret.split("_secret_")[0] || null
      await logAnalyticsEvent({
        eventName: "selfie_ai_photos_kit_checkout_session_created",
        userId: authUser?.id || null,
        path: "/checkout/selfie-to-ai-photos-kit",
        properties: {
          product_type: "selfie_ai_photos_kit",
          checkout_session_id: stripeSessionId,
          source: attribution.source,
          utm_source: attribution.utmSource,
          utm_medium: attribution.utmMedium,
          utm_campaign: attribution.utmCampaign,
          utm_content: attribution.utmContent,
          checkout_source: attribution.checkoutSource,
          cta_keyword: attribution.ctaKeyword,
          buyer_stage: attribution.buyerStage,
          has_prefill_email: hasPrefillEmail,
          prefill_email_source: prefillEmailSource,
        },
      })
      redirect(buildCheckoutRedirectUrl(clientSecret, "selfie_ai_photos_kit", params))
    }
  } catch (error: unknown) {
    if (isNextRedirectError(error)) {
      throw error
    }

    const errorInfo = getErrorInfo(error)
    await logAnalyticsEvent({
      eventName: "selfie_ai_photos_kit_checkout_session_failed",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-ai-photos-kit",
      properties: {
        product_type: "selfie_ai_photos_kit",
        source: attribution.source,
        error_message: errorInfo.message,
        error_code: errorInfo.code,
        error_type: errorInfo.type,
        has_prefill_email: hasPrefillEmail,
        prefill_email_source: prefillEmailSource,
      },
    })
    console.error("[Selfie AI Photos Kit Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-to-ai-photos-kit?checkout=failed")
}
