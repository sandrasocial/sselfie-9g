import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { startProductCheckoutSession } from "@/app/actions/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { sanitizeRedirect } from "@/lib/security/url-validator"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

type BrandStrategyPackCheckoutParams = {
  returnTo?: string
  strategyToken?: string
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  campaign_id?: string
  ref?: string
}

function resolveReturnTo(params: BrandStrategyPackCheckoutParams) {
  if (typeof params.returnTo === "string" && params.returnTo.trim().length > 0) {
    return sanitizeRedirect(params.returnTo, "/brand-strategy")
  }

  if (typeof params.strategyToken === "string" && params.strategyToken.trim().length > 0) {
    return `/strategy/${encodeURIComponent(params.strategyToken.trim())}`
  }

  return "/brand-strategy"
}

function resolveSource(params: BrandStrategyPackCheckoutParams) {
  if (typeof params.strategyToken === "string" && params.strategyToken.trim().length > 0) {
    return "strategy_result_upsell"
  }

  return "brand_strategy_paid"
}

function buildFailedCheckoutRedirect(returnTo: string) {
  return `${returnTo}${returnTo.includes("?") ? "&" : "?"}checkout=failed`
}

export default async function BrandStrategyPackCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<BrandStrategyPackCheckoutParams>
}) {
  const params = await searchParams
  const returnTo = resolveReturnTo(params)
  const attribution = getCheckoutAttributionFromParams(params, {
    source: resolveSource(params),
    returnTo,
  })

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = authUser
      ? await startProductCheckoutSession("brand_strategy_pack", undefined, {
          ...attribution,
        })
      : await createLandingCheckoutSession("brand_strategy_pack", undefined, null, {
          ...attribution,
        })

    if (clientSecret) {
      redirect(
        `/checkout?client_secret=${clientSecret}&product_type=brand_strategy_pack&return_to=${encodeURIComponent(returnTo)}`,
      )
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Brand Strategy Pack Checkout] Error creating checkout session:", error)
  }

  redirect(buildFailedCheckoutRedirect(returnTo))
}
