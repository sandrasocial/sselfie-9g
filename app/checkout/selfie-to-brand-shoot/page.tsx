import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
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

function getErrorInfo(error: unknown): { message: string; code: string | null; type: string | null } {
  if (error instanceof Error) {
    const stripeLike = error as Error & { code?: unknown; type?: unknown }
    return {
      message: error.message,
      code: typeof stripeLike.code === "string" ? stripeLike.code : null,
      type: typeof stripeLike.type === "string" ? stripeLike.type : null,
    }
  }

  if (typeof error === "object" && error !== null) {
    const value = error as { message?: unknown; code?: unknown; type?: unknown }
    return {
      message: typeof value.message === "string" ? value.message : "Unknown checkout session error",
      code: typeof value.code === "string" ? value.code : null,
      type: typeof value.type === "string" ? value.type : null,
    }
  }

  return {
    message: typeof error === "string" ? error : "Unknown checkout session error",
    code: null,
    type: null,
  }
}

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

async function hasPromptVaultBuyerAccess(input: {
  token?: string | null
  email?: string | null
}): Promise<boolean> {
  const cleanToken = input.token?.trim()
  const cleanEmail = input.email?.trim().toLowerCase()
  if (!cleanToken && !cleanEmail) return false

  const rows = await sql`
    SELECT 1
    FROM freebie_subscribers
    WHERE (
        (${cleanToken || null}::text IS NOT NULL AND access_token = ${cleanToken || null})
        OR (${cleanEmail || null}::text IS NOT NULL AND LOWER(email) = ${cleanEmail || null})
      )
      AND (
        source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  return rows.length > 0
}

async function hasStarterKitBuyerAccess(input: {
  token?: string | null
  email?: string | null
}): Promise<boolean> {
  const cleanToken = input.token?.trim()
  const cleanEmail = input.email?.trim().toLowerCase()
  if (!cleanToken && !cleanEmail) return false

  const rows = await sql`
    SELECT 1
    FROM freebie_subscribers
    WHERE (
        (${cleanToken || null}::text IS NOT NULL AND access_token = ${cleanToken || null})
        OR (${cleanEmail || null}::text IS NOT NULL AND LOWER(email) = ${cleanEmail || null})
      )
      AND (
        source = 'starter-kit-paid'
        OR 'starter-kit-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  return rows.length > 0
}

function checkoutStartProperties(
  params: Awaited<Parameters<typeof getCheckoutAttributionFromParams>[0]>,
  attribution: ReturnType<typeof getCheckoutAttributionFromParams>,
  extra?: Record<string, string | number | boolean | null>,
) {
  return {
    product_type: "selfie_to_brand_shoot_system",
    source: attribution.source || "selfie_to_brand_shoot_paid",
    utm_source: attribution.utmSource || null,
    utm_medium: attribution.utmMedium || null,
    utm_campaign: attribution.utmCampaign || null,
    utm_content: attribution.utmContent || null,
    campaign_id: attribution.campaignId ? String(attribution.campaignId) : null,
    cta_keyword: attribution.ctaKeyword || null,
    entry_post_slug: attribution.entryPostSlug || null,
    buyer_stage: attribution.buyerStage || null,
    checkout_source: attribution.checkoutSource || null,
    freebie_source: attribution.freebieSource || null,
    has_freebie_token: Boolean(params.freebie_token),
    // Vault credit moved $27 -> $37 on 2026-07-03 (Vault price flip); accept the legacy
    // 2700 marker so old email links still classify correctly.
    requested_vault_credit:
      params.vault_credit === "1" || params.upgrade_credit === "2700" || (params.upgrade_credit === "3700" && params.starter_kit_credit !== "1"),
    requested_starter_kit_credit: params.starter_kit_credit === "1",
    ...extra,
  }
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
    vault_credit?: string
    starter_kit_credit?: string
    upgrade_credit?: string
    checkout_email?: string
    email?: string
    skip_email_capture?: string
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
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? freebieEmail ?? urlEmail ?? null

  if (
    shouldShowCheckoutEmailCapture({
      params,
      hasRecoverableEmail: Boolean(checkoutEmail),
      hasAuthUser: Boolean(authUser?.id),
      hasFreebieToken: Boolean(params.freebie_token),
    })
  ) {
    await logAnalyticsEvent({
      eventName: "selfie_to_brand_shoot_checkout_email_capture_view",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-brand-shoot",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: checkoutStartProperties(params, attribution, {
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: false,
        prefill_email_source: "none",
      }),
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={params}
        actionPath="/checkout/selfie-to-brand-shoot"
        eyebrow="SELFIE TO BRAND SHOOT"
        title="Where should I send your System access?"
        copy="Add your email before checkout so your course access, Prompt Vault, and receipt go to the right place. This is the guided path for turning one clear selfie into brand images you can actually use."
        inputId="selfie-to-brand-shoot-checkout-email"
      />
    )
  }

  const vaultCreditEligible = await hasPromptVaultBuyerAccess({
    token: params.freebie_token,
    email: checkoutEmail,
  })
  const starterKitCreditEligible = vaultCreditEligible
    ? false
    : await hasStarterKitBuyerAccess({
        token: params.freebie_token,
        email: checkoutEmail,
      })
  // Vault buyers paid $37 (price flip 2026-06-26), so their credit is $37 (Stripe coupon
  // VAULT37, created 2026-07-03). VAULT27 remains in Stripe for pre-flip history only.
  const upgradePromoCode = vaultCreditEligible
    ? "VAULT37"
    : starterKitCreditEligible
      ? "STARTER37"
      : undefined
  const checkoutParams = {
    ...params,
    ...(vaultCreditEligible
      ? {
          vault_credit: "1",
          upgrade_credit: "3700",
          buyer_stage: params.buyer_stage || "micro",
        }
      : {}),
    ...(starterKitCreditEligible
      ? {
          starter_kit_credit: "1",
          upgrade_credit: "3700",
          buyer_stage: params.buyer_stage || "micro",
        }
      : {}),
  }

  try {
    await logAnalyticsEvent({
      eventName: "selfie_to_brand_shoot_checkout_session_requested",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-brand-shoot",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: checkoutStartProperties(params, attribution, {
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: Boolean(checkoutEmail),
        prefill_email_source: authUser?.email ? "auth" : freebieEmail ? "freebie_token" : urlEmail ? "url" : "none",
        vault_credit_applied: vaultCreditEligible,
      }),
    })

    const clientSecret = await createLandingCheckoutSession(
      "selfie_to_brand_shoot_system",
      upgradePromoCode,
      checkoutEmail,
      {
        ...attribution,
        ...(vaultCreditEligible || starterKitCreditEligible
          ? {
              source: attribution.source || (vaultCreditEligible ? "vault_access" : "starter_kit_access"),
              checkoutSource:
                attribution.checkoutSource ||
                (vaultCreditEligible ? "vault_buyer_upgrade_credit" : "starter_kit_buyer_upgrade_credit"),
              buyerStage: "micro",
            }
          : {}),
      },
    )

    if (clientSecret) {
      const stripeSessionId = clientSecret.split("_secret_")[0] || null
      await logAnalyticsEvent({
        eventName: "selfie_to_brand_shoot_checkout_session_created",
        userId: authUser?.id || null,
        path: "/checkout/selfie-to-brand-shoot",
        utm: {
          source: attribution.utmSource,
          medium: attribution.utmMedium,
          campaign: attribution.utmCampaign,
          content: attribution.utmContent,
        },
        properties: checkoutStartProperties(params, attribution, {
          checkout_session_id: stripeSessionId,
          has_auth_user: Boolean(authUser?.id),
          has_prefill_email: Boolean(checkoutEmail),
          prefill_email_source: authUser?.email ? "auth" : freebieEmail ? "freebie_token" : urlEmail ? "url" : "none",
          vault_credit_applied: vaultCreditEligible,
        }),
      })
      redirect(buildCheckoutRedirectUrl(clientSecret, "selfie_to_brand_shoot_system", checkoutParams))
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

    const errorInfo = getErrorInfo(error)
    await logAnalyticsEvent({
      eventName: "selfie_to_brand_shoot_checkout_session_failed",
      userId: authUser?.id || null,
      path: "/checkout/selfie-to-brand-shoot",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: checkoutStartProperties(params, attribution, {
        error_message: errorInfo.message,
        error_code: errorInfo.code,
        error_type: errorInfo.type,
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: Boolean(checkoutEmail),
        prefill_email_source: authUser?.email ? "auth" : freebieEmail ? "freebie_token" : urlEmail ? "url" : "none",
        vault_credit_applied: vaultCreditEligible,
      }),
    })
    console.error("[Selfie to Brand Shoot Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-to-brand-shoot?checkout=failed")
}
