"use server"

import { stripe } from "@/lib/stripe"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCreditPackageById, getProductById } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"

export async function startCreditCheckoutSession(packageId: string, promoCode?: string) {
  const creditPackage = getCreditPackageById(packageId)
  if (!creditPackage) {
    throw new Error(`Credit package with id "${packageId}" not found`)
  }

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error("User not authenticated")
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user) {
    throw new Error("User not found")
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

  let validatedCoupon = null
  if (promoCode) {
    try {
      const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
      if (coupon.valid) {
        validatedCoupon = coupon.id
      }
    } catch (error) {
      // Invalid coupon code - will be handled by showing error to user
      throw new Error("Invalid promo code")
    }
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: creditPackage.name,
            description: creditPackage.description,
          },
          unit_amount: creditPackage.priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    ...(validatedCoupon && {
      discounts: [
        {
          coupon: validatedCoupon,
        },
      ],
    }),
    ...(!validatedCoupon && {
      allow_promotion_codes: true,
    }),
    metadata: {
      user_id: user.id,
      credits: creditPackage.credits.toString(),
      package_id: packageId,
      product_type: "credit_topup",
      source: "app",
      ...(promoCode && { promo_code: promoCode }),
    },
  })

  return session.client_secret
}

export async function startProductCheckoutSession(productId: string, promoCode?: string) {
  const product = getProductById(productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error("User not authenticated")
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user) {
    throw new Error("User not found")
  }

  const isSubscription = product.type === "sselfie_studio_membership"
  
  // Validate and apply promo code if provided (same logic as createLandingCheckoutSession)
  let validatedPromoCode: string | null = null
  let validatedCoupon: string | null = null
  
  if (promoCode) {
    const codeUpper = promoCode.toUpperCase()
    console.log(`[v0] Validating promo code for product checkout: ${codeUpper}`)
    
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
          console.log(`[v0] ✅ Valid promotion code found: ${codeUpper} -> ${promoCodeObj.id}`)
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
  
  // Determine which Stripe Price ID to use based on product type (same as createLandingCheckoutSession)
  let stripePriceId: string | undefined
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership") {
    stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "price_1SmIRaEVJvME7vkwMo5vSLzf"
  } else if (product.type === "paid_blueprint") {
    stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  }

  if (!stripePriceId) {
    const envVarName =
      product.type === "one_time_session"
        ? "STRIPE_ONE_TIME_SESSION_PRICE_ID"
        : product.type === "paid_blueprint"
          ? "STRIPE_PAID_BLUEPRINT_PRICE_ID"
          : "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"
    console.error("[v0] Environment variable needed:", envVarName)
    throw new Error(`Stripe Price ID not configured for ${productId}`)
  }

  let customerId: string | undefined

  const { neon } = await import("@/lib/db")
  const sql = neon(process.env.DATABASE_URL!)
  
  // Check subscriptions table first (for existing subscriptions)
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    // Check users table for existing customer ID (for one-time purchases)
    const existingUser = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${user.id} AND stripe_customer_id IS NOT NULL LIMIT 1
    `
    
    if (existingUser[0]?.stripe_customer_id) {
      customerId = existingUser[0].stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id
      
      // Save to users table immediately for one-time purchases
      // (Subscriptions will save it via webhook to subscriptions table)
      if (!isSubscription) {
        try {
          await sql`
            UPDATE users 
            SET stripe_customer_id = ${customerId}
            WHERE id = ${user.id}
          `
        } catch (error) {
          console.error("[v0] Error saving customer ID to users table:", error)
          // Non-critical - webhook will save it
        }
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer: customerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: isSubscription ? "subscription" : "payment",
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
          source: "app",
          ...(promoCode && { promo_code: promoCode }),
        },
      },
    }),
    metadata: {
      user_id: user.id,
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: "app",
      ...(promoCode && { promo_code: promoCode }),
    },
  })

  return session.client_secret
}

export async function getCheckoutSessionStatus(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    status: session.status,
    customer_email: session.customer_details?.email,
  }
}
