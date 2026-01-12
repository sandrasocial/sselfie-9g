import { redirect, notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Check if paid blueprint feature is enabled
 * Checks env var first, falls back to DB flag
 */
async function isPaidBlueprintEnabled(): Promise<boolean> {
  try {
    // Check env var first (faster, no DB call)
    const envFlag = process.env.FEATURE_PAID_BLUEPRINT_ENABLED
    if (envFlag !== undefined) {
      return envFlag === "true" || envFlag === "1"
    }

    // Fallback to DB flag
    const result = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'paid_blueprint_enabled'
    `
    if (result.length === 0) {
      return false // Default to false if flag doesn't exist
    }
    return result[0].value === true || result[0].value === "true"
  } catch (error) {
    console.error("[Blueprint Checkout] Error checking feature flag:", error)
    return false // Fail safe: default to false
  }
}

export default async function BlueprintCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; promo?: string; promoCode?: string; code?: string; discount?: string }>
}) {
  // Check feature flag first
  const featureEnabled = await isPaidBlueprintEnabled()
  if (!featureEnabled) {
    console.log("[Blueprint Checkout] Feature disabled, returning 404")
    return notFound()
  }

  const params = await searchParams
  const email = params?.email
  // Support multiple parameter names for promo code
  const promoCode = params?.promo || params?.promoCode || params?.code || params?.discount

  console.log("[Blueprint Checkout] 📋 Checkout parameters:", {
    email: email || "none",
    promoCode: promoCode || "none",
    hasPromo: !!promoCode,
    allParams: Object.keys(params || {}),
    rawParams: params,
    promoValue: params?.promo,
    promoCodeValue: params?.promoCode,
    codeValue: params?.code,
    discountValue: params?.discount
  })

  // Decision 2: Check if user is authenticated - use authenticated checkout flow if logged in
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let clientSecret: string | null = null

  try {
    if (authUser) {
      // Authenticated user: Use startProductCheckoutSession (includes user_id in metadata)
      console.log("[Blueprint Checkout] ✅ Authenticated user, using product checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
      const { startProductCheckoutSession } = await import("@/app/actions/stripe")
      clientSecret = await startProductCheckoutSession("paid_blueprint", promoCode)
    } else {
      // Unauthenticated user: Use landing checkout session (guest checkout)
      console.log("[Blueprint Checkout] 👤 Unauthenticated user, using landing checkout session", email ? `for email: ${email}` : "without email (will be captured in checkout)", promoCode ? `with promo: ${promoCode}` : "without promo code")
      clientSecret = await createLandingCheckoutSession("paid_blueprint", promoCode)
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
