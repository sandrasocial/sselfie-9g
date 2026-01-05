"use server"

import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getProductById } from "@/lib/products"
import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe"

export async function createUpgradeCheckoutSession(
  promoCode?: string | null
) {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error("Please sign in first to upgrade your membership")
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user) {
    throw new Error("User not found")
  }

  // Only Creator Studio membership is available for upgrades
  const productId = "sselfie_studio_membership"

  // Get product details (EXACT same pattern as landing-checkout.ts)
  const product = getProductById(productId)
  if (!product) {
    console.error("[v0] Product not found:", productId)
    throw new Error(`Product not found: ${productId}`)
  }

  // Determine which Stripe Price ID to use based on product type (EXACT same as landing-checkout.ts line 35-43)
  let stripePriceId: string | undefined
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership") {
    stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  }

  // Use environment variable for price ID (no hardcoded fallback)
  // Correct Price ID should be set in STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  // Expected: price_1SmIRaEVJvME7vkwMo5vSLzf ($97/month)

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
  console.log("[v0] Product details:", {
    productId,
    productName: product.name,
    productType: product.type,
    expectedEnvVar: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
  })

  // Verify the Stripe Price ID points to the correct product
  try {
    const stripePrice = await stripe.prices.retrieve(stripePriceId, {
      expand: ['product'],
    })
    const stripeProduct = typeof stripePrice.product === 'string'
      ? await stripe.products.retrieve(stripePrice.product)
      : stripePrice.product
    
    // Check if product is deleted
    if (stripeProduct.deleted) {
      console.warn(`[v0] ⚠️ WARNING: Stripe product is deleted for price ${stripePriceId}`)
    } else {
      console.log("[v0] Stripe Price verification:", {
        priceId: stripePriceId,
        priceAmount: stripePrice.unit_amount ? `$${(stripePrice.unit_amount / 100).toFixed(2)}` : "N/A",
        productId: stripeProduct.id,
        productName: stripeProduct.name,
        expectedName: product.name,
        matches: stripeProduct.name === product.name,
      })
      
      if (stripeProduct.name !== product.name) {
        console.warn(`[v0] ⚠️ WARNING: Stripe product name "${stripeProduct.name}" does not match expected "${product.name}"`)
        console.warn(`[v0] The Price ID ${stripePriceId} belongs to product "${stripeProduct.name}" but we expect "${product.name}"`)
      }
    }
  } catch (error: any) {
    console.error(`[v0] Error verifying Stripe price: ${error.message}`)
    // Continue anyway - the price might still work
  }

  // Get or create Stripe customer
  const sql = neon(process.env.DATABASE_URL!)
  
  let customerId: string | undefined
  
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    const existingUser = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${user.id} AND stripe_customer_id IS NOT NULL LIMIT 1
    `
    
    if (existingUser[0]?.stripe_customer_id) {
      customerId = existingUser[0].stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
    }
  }

  // Validate and apply promo code if provided
  // Stripe has two types: Promotion Codes (customer-facing like "FIRSTMONTH40") and Coupons (discount definitions)
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
        // Check if promotion code is still valid
        if (promoCodeObj.active && (!promoCodeObj.max_redemptions || promoCodeObj.times_redeemed < promoCodeObj.max_redemptions)) {
          validatedPromoCode = promoCodeObj.id
          console.log(`[v0] ✅ Valid promotion code found: ${codeUpper} -> ${promoCodeObj.id}`)
        } else {
          console.log(`[v0] ⚠️ Promotion code ${codeUpper} found but not valid (inactive or max redemptions reached)`)
        }
      }
    } catch (error: any) {
      console.log(`[v0] Promotion code lookup failed for ${codeUpper}: ${error.message}`)
    }
    
    // If not found as promotion code, try as coupon ID
    if (!validatedPromoCode) {
      try {
        const coupon = await stripe.coupons.retrieve(codeUpper)
        console.log(`[v0] Coupon retrieved: ${coupon.id}, valid: ${coupon.valid}, percent_off: ${coupon.percent_off}, duration: ${coupon.duration}`)
        
        if (coupon.valid) {
          // Check additional restrictions
          const now = Math.floor(Date.now() / 1000)
          const isExpired = coupon.redeem_by && coupon.redeem_by < now
          const maxReached = coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions
          
          if (isExpired) {
            console.log(`[v0] ⚠️ Coupon ${codeUpper} has expired (redeem_by: ${coupon.redeem_by})`)
          } else if (maxReached) {
            console.log(`[v0] ⚠️ Coupon ${codeUpper} has reached max redemptions (${coupon.times_redeemed}/${coupon.max_redemptions})`)
          } else {
            validatedCoupon = coupon.id
            console.log(`[v0] ✅ Valid coupon found: ${codeUpper} (${coupon.percent_off}% off, ${coupon.duration})`)
          }
        } else {
          console.log(`[v0] ⚠️ Coupon ${codeUpper} is not valid`)
        }
      } catch (error: any) {
        console.log(`[v0] Code ${codeUpper} not found as coupon: ${error.message}`)
      }
    }
    
    if (!validatedPromoCode && !validatedCoupon) {
      console.log(`[v0] ℹ️ Code ${codeUpper} not validated - user can enter manually in checkout form`)
    }
  }

  // Create checkout session (EXACT same structure as landing-checkout.ts but with customer and discount)
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "embedded",
    mode: "subscription",
    redirect_on_completion: "never",
    customer: customerId,
    line_items: [
      {
        price: stripePriceId, // EXACT same price ID as landing checkout uses
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        product_id: productId,
        product_type: product.type,
        credits: product.credits?.toString() || "0",
        source: "email_automation",
        campaign: "onetime-to-creator",
        original_promo: promoCode || "",
      },
    },
    metadata: {
      user_id: user.id,
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: "email_automation",
      campaign: "onetime-to-creator",
    },
  }
  
  // Apply discount if we found a valid promotion code or coupon
  // IMPORTANT: Cannot use both discounts and allow_promotion_codes simultaneously
  if (validatedPromoCode) {
    sessionConfig.discounts = [{ promotion_code: validatedPromoCode }]
    console.log(`[v0] Applying promotion code: ${validatedPromoCode}`)
  } else if (validatedCoupon) {
    sessionConfig.discounts = [{ coupon: validatedCoupon }]
    console.log(`[v0] Applying coupon: ${validatedCoupon}`)
  } else {
    // Only allow promotion codes if no discount is pre-applied
    sessionConfig.allow_promotion_codes = true
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

