import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { startProductCheckoutSession } from "@/app/actions/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { sanitizeRedirect } from "@/lib/security/url-validator"

type BrandStrategyPackCheckoutParams = {
  returnTo?: string
  strategyToken?: string
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

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = authUser
      ? await startProductCheckoutSession("brand_strategy_pack", undefined, {
          source: "freebie_upsell",
          returnTo,
        })
      : await createLandingCheckoutSession("brand_strategy_pack", undefined, null, {
          source: "freebie_upsell",
          returnTo,
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
