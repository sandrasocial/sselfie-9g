import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"


export default async function BlueprintCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string
    promo?: string
    promoCode?: string
    code?: string
    discount?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const email = params?.email
  // Support multiple parameter names for promo code
  const promoCode = params?.promo || params?.promoCode || params?.code || params?.discount

  console.log("[Blueprint Checkout] 📋 Checkout parameters:", {
    email: email || "none",
    promoCode: promoCode || "none",
    hasPromo: !!promoCode,
  })
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "blueprint_checkout",
  })

  // Decision 2: Check if user is authenticated - use authenticated checkout flow if logged in
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let hasPaidBlueprint = false
  if (authUser) {
    const user = await getUserByAuthId(authUser.id)
    if (user) {
      const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
      const existing = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${user.id}
          AND status = 'active'
          AND product_type = 'paid_blueprint'
          AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
        LIMIT 1
      `
      hasPaidBlueprint = existing.length > 0
    }
  }


  let clientSecret: string | null = null

  try {
    if (authUser) {
      // Authenticated user: Use startProductCheckoutSession (includes user_id in metadata)
      console.log("[Blueprint Checkout] ✅ Authenticated user, using product checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
      const { startProductCheckoutSession } = await import("@/app/actions/stripe")
      clientSecret = await startProductCheckoutSession("paid_blueprint", promoCode, attribution)
    } else {
      // Unauthenticated user: Use landing checkout session (guest checkout)
      console.log("[Blueprint Checkout] 👤 Unauthenticated user, using landing checkout session", email ? `for email: ${email}` : "without email (will be captured in checkout)", promoCode ? `with promo: ${promoCode}` : "without promo code")
      clientSecret = await createLandingCheckoutSession("paid_blueprint", promoCode, email || null, attribution)
    }

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      // Note: redirect() throws NEXT_REDIRECT internally - this is expected behavior
      redirect(`/checkout?client_secret=${clientSecret}&product_type=paid_blueprint`)
    } else {
      // Fallback if session creation fails
      console.error("[Blueprint Checkout] No client secret returned")
      redirect("/feed-planner?message=checkout_error")
    }
  } catch (error: any) {
    // Check if this is a Next.js redirect (expected behavior)
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      // Re-throw redirect errors - they should not be caught
      throw error
    }
    
    console.error("[Blueprint Checkout] Error creating checkout session:", error)
    // If it's a Stripe error about missing price ID, show helpful message
    if (error instanceof Error && error.message.includes("STRIPE_PAID_BLUEPRINT_PRICE_ID")) {
      throw error // Let Next.js error boundary show the detailed error in dev
    }
    redirect("/feed-planner?message=checkout_error")
  }
}
