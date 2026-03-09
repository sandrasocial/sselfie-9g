"use server"

import { stripe } from "@/lib/stripe"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCreditPackageById, getProductById } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"
import { getMembershipPromoBlockReason } from "@/lib/stripe/membership-promo-policy"
import { sql } from "@/lib/db/client"

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

export async function startProductCheckoutSession(
  productId: string,
  promoCode?: string,
  options?: { source?: string; returnTo?: string },
) {
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
  const allowManualPromotionCodes = !isSubscription
  const checkoutSource = options?.source?.trim() || "app"
  
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
    } catch (error) {
      if (error instanceof Error && error.message.includes("no longer available")) {
        throw error
      }
      // Invalid coupon code - only allow manual promotion codes for non-subscription products
      console.log(
        `[v0] ⚠️ Promo code ${promoCode?.toUpperCase()} not found, ${allowManualPromotionCodes ? "allowing" : "blocking"} manual promotion codes`,
      )
    }
  }
  
  // FIX B1: Removed hardcoded fallback - fail fast if env var not set
  let stripePriceId: string | undefined
  const envVarName =
    product.type === "one_time_session"
      ? "STRIPE_ONE_TIME_SESSION_PRICE_ID"
      : product.type === "paid_blueprint"
        ? "STRIPE_PAID_BLUEPRINT_PRICE_ID"
        : product.type === "brand_strategy_pack"
          ? "STRIPE_PRICE_BRAND_STRATEGY_PACK"
          : product.type === "selfie_guide_bundle"
            ? "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE"
          : product.type === "selfie_guide"
            ? "STRIPE_PRICE_SELFIE_GUIDE"
            : "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"
  
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership") {
    stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  } else if (product.type === "paid_blueprint") {
    stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  } else if (product.type === "brand_strategy_pack") {
    stripePriceId = process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK
  } else if (product.type === "selfie_guide_bundle") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE_BUNDLE
  } else if (product.type === "selfie_guide") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE
  }
  stripePriceId = stripePriceId?.trim()

  if (!stripePriceId) {
    console.error("[v0] ❌ CRITICAL: Missing Stripe Price ID for product:", productId)
    console.error("[v0] ❌ Required environment variable:", envVarName)
    throw new Error(
      `Stripe Price ID not configured. Please contact support. (Missing: ${envVarName})`
    )
  }

  let customerId: string | undefined

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
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        })
        customerId = customer.id
        console.log(`[v0] ✅ Created new Stripe customer: ${customerId}`)
        
        // Save to users table immediately for one-time purchases
        // (Subscriptions will save it via webhook to subscriptions table)
        if (!isSubscription) {
          try {
            await sql`
              UPDATE users 
              SET stripe_customer_id = ${customerId}
              WHERE id = ${user.id}
            `
            console.log(`[v0] ✅ Saved customer ID to users table`)
          } catch (error) {
            console.error("[v0] ❌ Error saving customer ID to users table:", error)
            // Non-critical - webhook will save it
          }
        }
      } catch (customerError: any) {
        console.error(`[v0] ❌ Error creating Stripe customer:`, customerError.message)
        // For one-time payments, we can use customer_email instead
        // This will prevent payment_methods API errors
        // For subscriptions, customer ID is required - fail if we can't create one
        if (isSubscription) {
          throw new Error(`Failed to create Stripe customer for subscription: ${customerError.message}`)
        }
        customerId = undefined
      }
    }
  }

  // FIX BUG 2: For subscriptions, customer ID is required - fail early if missing
  if (isSubscription && !customerId) {
    throw new Error("Stripe customer ID is required for subscriptions but was not found or created")
  }

  // For embedded checkout, use customer_email for one-time payments if customer doesn't exist
  // This prevents Stripe from trying to fetch payment methods for non-existent customers
  const sessionConfig: any = {
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    // NOTE: optional_items is NOT supported with ui_mode: "embedded" (Stripe restriction).
    // Brand Strategy order bump is delivered via post-purchase email in the Stripe webhook.
    mode: isSubscription ? "subscription" : "payment",
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
          source: checkoutSource,
          ...(promoCode && { promo_code: promoCode }),
          ...(options?.returnTo && { return_to: options.returnTo }),
        },
      },
    }),
    metadata: {
      user_id: user.id,
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: checkoutSource,
      ...(promoCode && { promo_code: promoCode }),
      ...(options?.returnTo && { return_to: options.returnTo }),
    },
  }

  // For one-time payments: use customer_email if customer doesn't exist yet
  // For subscriptions: always use customer ID (required) - already validated above
  if (isSubscription) {
    sessionConfig.customer = customerId
  } else {
    // One-time payment: prefer customer_email to avoid payment_methods API errors
    if (customerId) {
      sessionConfig.customer = customerId
    } else {
      sessionConfig.customer_email = user.email
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  return session.client_secret
}

export async function getCheckoutSessionStatus(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    status: session.status,
    customer_email: session.customer_details?.email,
  }
}
