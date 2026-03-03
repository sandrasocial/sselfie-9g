"use server"

import { stripe } from "@/lib/stripe"
import { getProductById } from "@/lib/products"
import { sql } from "@/lib/db/client"
import type Stripe from "stripe"
import { assertStripePricingConfig } from "@/lib/stripe/validate-pricing-config" // Declare the Stripe variable
import { getMembershipPromoBlockReason } from "@/lib/stripe/membership-promo-policy"

export async function createLandingCheckoutSession(productId: string, promoCode?: string, customerEmail?: string | null) {
  // FIX B3: Validate pricing configuration on first use
  await assertStripePricingConfig()
  
  console.log("[v0] Creating checkout session for product:", productId, promoCode ? `with promo: ${promoCode}` : "")

  const product = getProductById(productId)
  if (!product) {
    console.error("[v0] Product not found:", productId)
    throw new Error(`Product with id "${productId}" not found`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  const isSubscription = product.type === "sselfie_studio_membership"
  const allowManualPromotionCodes = !isSubscription

  const actualPrice = product.priceInCents

  console.log("[v0] Checkout config:", {
    productId,
    productType: product.type,
    isSubscription,
    price: actualPrice,
  })

  // Determine which Stripe Price ID to use based on product type
  // FIX B1: Removed hardcoded fallback - fail fast if env var not set
  let stripePriceId: string | undefined
  const envVarName =
    product.type === "one_time_session"
      ? "STRIPE_ONE_TIME_SESSION_PRICE_ID"
      : product.type === "paid_blueprint"
        ? "STRIPE_PAID_BLUEPRINT_PRICE_ID"
        : "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"
  
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership") {
    stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  } else if (product.type === "paid_blueprint") {
    stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  }
  stripePriceId = stripePriceId?.trim()

  if (!stripePriceId) {
    console.error("[v0] ❌ CRITICAL: Missing Stripe Price ID for product:", productId)
    console.error("[v0] ❌ Required environment variable:", envVarName)
    console.error("[v0] ❌ This checkout cannot proceed without proper price configuration")
    throw new Error(
      `Stripe Price ID not configured. Please contact support. (Missing: ${envVarName})`
    )
  }

  console.log("[v0] Using Stripe Price ID:", stripePriceId)

  // FIX B2: Strict validation - NO automatic fallback to "any active price"
  // Validate that the configured price ID exists and is active
  try {
    const priceObj = await stripe.prices.retrieve(stripePriceId)
    
    if (!priceObj.active) {
      console.error("[v0] ❌ CRITICAL: Configured price ID is INACTIVE:", stripePriceId)
      console.error("[v0] ❌ Environment variable:", envVarName)
      console.error("[v0] ❌ This indicates a configuration error that must be fixed")
      
      throw new Error(
        `The configured price for ${product.name} is inactive in Stripe. ` +
        `Please contact support. (Price ID: ${stripePriceId}, Env: ${envVarName})`
      )
    }
    
    // Additional validation: verify price matches expected product type
    if (isSubscription && !priceObj.recurring) {
      console.error("[v0] ❌ CRITICAL: Price is one-time but product requires subscription")
      throw new Error(
        `Price configuration error for ${product.name}. Please contact support.`
      )
    }
    
    if (!isSubscription && priceObj.recurring) {
      console.error("[v0] ❌ CRITICAL: Price is subscription but product is one-time")
      throw new Error(
        `Price configuration error for ${product.name}. Please contact support.`
      )
    }
    
    console.log("[v0] ✅ Price validation passed:", stripePriceId, `($${(priceObj.unit_amount || 0) / 100})`)
  } catch (error: any) {
    // If price doesn't exist, throw helpful error
    if (error.code === "resource_missing") {
      console.error("[v0] ❌ CRITICAL: Price ID not found in Stripe:", stripePriceId)
      console.error("[v0] ❌ Environment variable:", envVarName)
      
      throw new Error(
        `The configured price for ${product.name} does not exist in Stripe. ` +
        `Please contact support. (Price ID: ${stripePriceId}, Env: ${envVarName})`
      )
    }
    // Re-throw all errors (including our custom validation errors)
    throw error
  }

  // Validate promo code if provided (consistent with startCreditCheckoutSession)
  let validatedCoupon: string | null = null
  if (promoCode) {
    try {
      const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
      if (coupon.valid) {
        if (isSubscription) {
          const blockReason = getMembershipPromoBlockReason({
            duration: coupon.duration,
            percentOff: coupon.percent_off,
          })
          if (blockReason) {
            throw new Error(blockReason)
          }
        }
        validatedCoupon = coupon.id
        console.log(`[v0] ✅ Valid promo code found: ${promoCode.toUpperCase()}, applying discount`)
      } else {
        console.log(`[v0] ⚠️ Promo code ${promoCode.toUpperCase()} is not valid`)
      }
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("no longer available")) {
        throw error
      }
      // Invalid coupon code - only allow manual promotion codes for non-subscription products
      console.log(
        `[v0] ⚠️ Promo code ${promoCode?.toUpperCase()} not found, ${allowManualPromotionCodes ? "allowing" : "blocking"} manual promotion codes`,
      )
    }
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "embedded",
    mode: isSubscription ? "subscription" : "payment",
    redirect_on_completion: "never",
    ...(customerEmail && { customer_email: customerEmail }),
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    // Apply validated coupon OR allow promotion codes (mutually exclusive per Stripe API)
    ...(validatedCoupon && {
      discounts: [
        {
          coupon: validatedCoupon,
        },
      ],
    }),
    ...(!validatedCoupon && allowManualPromotionCodes && {
      allow_promotion_codes: true,
    }),
    ...(isSubscription && {
      subscription_data: {
        metadata: {
          product_id: productId,
          product_type: product.type,
          credits: product.credits?.toString() || "0",
          source: "landing_page",
        },
      },
    }),
    metadata: {
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: "landing_page",
      ...(customerEmail && { customer_email: customerEmail }),
      ...(promoCode && { promo_code: promoCode }),
    },
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionConfig)
    console.log("[v0] Checkout session created successfully:", session.id)
    console.log("[v0] Client secret generated:", !!session.client_secret)
    return session.client_secret
  } catch (error: any) {
    console.error("[v0] Stripe API error creating checkout session:", {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    })
    throw error
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    })

    return {
      status: session.status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
      metadata: session.metadata,
    }
  } catch (error: any) {
    throw error
  }
}

export async function getUserByEmail(email: string) {

  try {
    const result = await sql`
      SELECT 
        id,
        email,
        display_name,
        stripe_customer_id,
        supabase_user_id,
        created_at,
        password_setup_complete
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    const user = result[0]

    const subscriptionResult = await sql`
      SELECT 
        product_type,
        status
      FROM subscriptions
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const creditsResult = await sql`
      SELECT balance
      FROM user_credits
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    const hasAccount = user.password_setup_complete === true

    console.log("[v0] getUserByEmail result:", {
      email: user.email,
      password_setup_complete: user.password_setup_complete,
      hasAccount: hasAccount,
    })

    return {
      email: user.email,
      displayName: user.display_name,
      hasAccount,
      productType: subscriptionResult[0]?.product_type || null,
      credits: creditsResult[0]?.balance || 0,
    }
  } catch (error: any) {
    console.error("[v0] getUserByEmail error:", error)
    return null
  }
}

const emailCache = new Map<string, { email: string; timestamp: number }>()
const CACHE_DURATION = 60000

export async function getUserByStripeSession(sessionId: string) {
  try {
    const cached = emailCache.get(sessionId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return getUserByEmail(cached.email)
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session.customer_details?.email && !session.customer_email) {
      return null
    }

    const email = session.customer_details?.email || session.customer_email

    if (!email) {
      return null
    }

    emailCache.set(sessionId, { email, timestamp: Date.now() })

    return getUserByEmail(email)
  } catch (error: any) {
    return null
  }
}
