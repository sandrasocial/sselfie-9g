"use server"

import { stripe } from "@/lib/stripe"
import { getProductById } from "@/lib/products"
import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe" // Declare the Stripe variable

const ENABLE_BETA_DISCOUNT = false

export async function createLandingCheckoutSession(productId: string, promoCode?: string) {
  console.log("[v0] Creating checkout session for product:", productId, promoCode ? `with promo: ${promoCode}` : "")

  const product = getProductById(productId)
  if (!product) {
    console.error("[v0] Product not found:", productId)
    throw new Error(`Product with id "${productId}" not found`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  const isSubscription = product.type === "sselfie_studio_membership"

  const actualPrice = product.priceInCents

  console.log("[v0] Checkout config:", {
    productId,
    productType: product.type,
    isSubscription,
    price: actualPrice,
  })

  // Determine which Stripe Price ID to use based on product type
  let stripePriceId: string | undefined
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership") {
    // CRITICAL: Use correct price ID for Creator Studio membership
    // Fallback to correct price ID if env var is not set
    stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "price_1SmIRaEVJvME7vkwMo5vSLzf"
  }

  if (!stripePriceId) {
    console.error("[v0] Missing Stripe Price ID for:", productId)
    const envVarName =
      product.type === "one_time_session"
        ? "STRIPE_ONE_TIME_SESSION_PRICE_ID"
        : "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"
    console.error("[v0] Environment variable needed:", envVarName)
    throw new Error(`Stripe Price ID not configured for ${productId}`)
  }

  console.log("[v0] Using Stripe Price ID:", stripePriceId)

  // Validate and apply promo code if provided
  let validatedPromoCode: string | null = null
  let validatedCoupon: string | null = null
  
  if (promoCode) {
    const codeUpper = promoCode.toUpperCase()
    console.log(`[v0] Validating promo code: ${codeUpper}`)
    
    try {
      // First, try to find it as a promotion code (customer-facing code)
      const promotionCodes = await stripe.promotionCodes.list({
        code: codeUpper,
        active: true,
        limit: 1,
      })
      
      if (promotionCodes.data.length > 0) {
        const promoCodeObj = promotionCodes.data[0]
        if (promoCodeObj.active && (!promoCodeObj.max_redemptions || promoCodeObj.times_redeemed < promoCodeObj.max_redemptions)) {
          validatedPromoCode = promoCodeObj.id
          console.log(`[v0] ✅ Valid promotion code found: ${codeUpper}`)
        }
      }
    } catch (error: any) {
      console.log(`[v0] Promotion code lookup failed: ${error.message}`)
    }
    
    // If not found as promotion code, try as coupon ID
    if (!validatedPromoCode) {
      try {
        const coupon = await stripe.coupons.retrieve(codeUpper)
        if (coupon.valid) {
          const now = Math.floor(Date.now() / 1000)
          const isExpired = coupon.redeem_by && coupon.redeem_by < now
          const maxReached = coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions
          
          if (!isExpired && !maxReached) {
            validatedCoupon = coupon.id
            console.log(`[v0] ✅ Valid coupon found: ${codeUpper}`)
          }
        }
      } catch (error: any) {
        console.log(`[v0] Coupon lookup failed: ${error.message}`)
      }
    }
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "embedded",
    mode: isSubscription ? "subscription" : "payment",
    redirect_on_completion: "never",
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    // Apply discount if we found a valid promotion code or coupon
    ...(validatedPromoCode && {
      discounts: [{ promotion_code: validatedPromoCode }],
    }),
    ...(validatedCoupon && {
      discounts: [{ coupon: validatedCoupon }],
    }),
    // Only allow promotion codes if no discount is pre-applied
    ...(!validatedPromoCode && !validatedCoupon && {
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

export const createLandingCheckout = createLandingCheckoutSession

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
  const sql = neon(process.env.DATABASE_URL!)

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
