import { redirect, notFound } from "next/navigation"
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
  searchParams: Promise<{ email?: string; promo?: string }>
}) {
  // Check feature flag first
  const featureEnabled = await isPaidBlueprintEnabled()
  if (!featureEnabled) {
    console.log("[Blueprint Checkout] Feature disabled, returning 404")
    return notFound()
  }

  const params = await searchParams
  const email = params?.email
  const promoCode = params?.promo

  // Validate email is provided
  if (!email) {
    console.log("[Blueprint Checkout] No email provided, redirecting to blueprint")
    redirect("/blueprint?message=complete_free_first")
  }

  try {
    // Create checkout session
    console.log("[Blueprint Checkout] Creating session for email:", email, promoCode ? `with promo: ${promoCode}` : "")
    const clientSecret = await createLandingCheckoutSession("paid_blueprint", promoCode)

    if (clientSecret) {
      // Redirect to the universal checkout page with client secret
      console.log("[Blueprint Checkout] Session created, redirecting to checkout")
      redirect(`/checkout?client_secret=${clientSecret}&product_type=paid_blueprint`)
    } else {
      // Fallback if session creation fails
      console.error("[Blueprint Checkout] No client secret returned")
      redirect("/blueprint?message=checkout_error")
    }
  } catch (error) {
    console.error("[Blueprint Checkout] Error creating checkout session:", error)
    // If it's a Stripe error about missing price ID, show helpful message
    if (error instanceof Error && error.message.includes("STRIPE_PAID_BLUEPRINT_PRICE_ID")) {
      throw error // Let Next.js error boundary show the detailed error in dev
    }
    redirect("/blueprint?message=checkout_error")
  }
}
