import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { createServerClient } from "@/lib/supabase/server"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const metadata: Metadata = {
  title: "Checkout | AI Photo Prompt Vault",
  description: "Complete your AI Photo Prompt Vault purchase.",
}

export default async function PromptVaultCheckoutPage({
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
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "prompt_vault_paid",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = await createLandingCheckoutSession(
      "prompt_vault",
      undefined,
      authUser?.email ?? null,
      attribution,
    )

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=prompt_vault`)
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Prompt Vault Checkout] Error creating checkout session:", error)
  }

  redirect("/prompt-vault?checkout=failed")
}
