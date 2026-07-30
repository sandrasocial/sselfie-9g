import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createServerClient } from "@/lib/supabase/server"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export default async function VaultMayaCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    promo?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
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
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "vault_maya_checkout_page",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? urlEmail ?? null
  const price = getVaultMayaPriceDisplay()
  const productId = "vault_maya"

  const captureParams = {
    ...params,
    checkout_source: params.checkout_source || "vault_maya_email_capture",
  }
  const shouldCaptureEmail = shouldShowCheckoutEmailCapture({
    params,
    hasRecoverableEmail: Boolean(checkoutEmail),
    hasAuthUser: Boolean(authUser?.id),
    hasFreebieToken: false,
  })

  if (shouldCaptureEmail) {
    await logAnalyticsEvent({
      eventName: "vault_maya_checkout_email_capture_view",
      userId: authUser?.id || null,
      path: "/checkout/vault-maya",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: {
        product_type: productId,
        source: attribution.source,
        has_auth_user: Boolean(authUser?.id),
        checkout_source: captureParams.checkout_source,
        buyer_stage: attribution.buyerStage || null,
        cta_keyword: attribution.ctaKeyword || null,
        entry_post_slug: attribution.entryPostSlug || null,
      },
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={captureParams}
        actionPath="/checkout/vault-maya"
        eyebrow="VAULT MAYA"
        title="Where should I send your access?"
        copy="Add your email so your login, receipt, and Vault Maya access go to the right place. Maya makes the vault looks from your selfie — 30 photos a month, new drops every week."
        inputId="vault-maya-checkout-email"
        buttonLabel="Continue to secure payment"
        skipLabel="Skip and go straight to payment"
        productName="Vault Maya"
        productMeta="Every vault collection, made from your selfie"
        productPrice={
          price.flipped ? "$29/month" : "$19/month founder price · then $29/month for new members"
        }
        reassurance={
          price.flipped
            ? "$29 billed monthly. Cancel from your account."
            : "Founders keep $19/month for as long as they stay. Cancel from your account."
        }
        visuals={[
          {
            src: "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
            alt: "Editorial vault look created from a selfie",
          },
          {
            src: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
            alt: "Clean personal brand portrait created from the vault",
          },
        ]}
      />
    )
  }

  try {
    const clientSecret = await createLandingCheckoutSession(productId, params.promo, checkoutEmail, {
      ...attribution,
    })
    if (clientSecret) {
      redirect(buildCheckoutRedirectUrl(clientSecret, productId, { ...params }))
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
    console.error("[checkout/vault-maya] Error creating session:", error)
  }
  redirect("/checkout/failure?product=" + productId)
}
