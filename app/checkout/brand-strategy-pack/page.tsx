import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { sanitizeRedirect } from "@/lib/security/url-validator"
import { startProductCheckoutSession } from "@/app/actions/stripe"

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

export default async function BrandStrategyPackCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<BrandStrategyPackCheckoutParams>
}) {
  const params = await searchParams
  const returnTo = resolveReturnTo(params)
  const checkoutPath = `/checkout/brand-strategy-pack?returnTo=${encodeURIComponent(returnTo)}`

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(checkoutPath)}`)
  }

  try {
    const clientSecret = await startProductCheckoutSession("brand_strategy_pack", undefined, {
      source: "freebie_upsell",
      returnTo,
    })

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=brand_strategy_pack`)
    }
  } catch (error) {
    console.error("[Brand Strategy Pack Checkout] Error creating checkout session:", error)
  }

  redirect(`/brand-strategy?checkout=failed`)
}
