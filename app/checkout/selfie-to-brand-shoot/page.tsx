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

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
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
  const upgradePromoCode = vaultCreditEligible
    ? "VAULT27"
    : starterKitCreditEligible
      ? "STARTER37"
      : undefined
  const checkoutParams = {
    ...params,
    ...(vaultCreditEligible
      ? {
          vault_credit: "1",
          upgrade_credit: "2700",
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

    console.error("[Selfie to Brand Shoot Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-to-brand-shoot?checkout=failed")
}
