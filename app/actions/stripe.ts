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
  
  // Validate promo code if provided (consistent with startCreditCheckoutSession)
  let validatedCoupon = null
  if (promoCode) {
    try {
      const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
      if (coupon.valid) {
        validatedCoupon = coupon.id
        console.log(`[v0] ✅ Valid promo code found: ${promoCode.toUpperCase()}, applying discount`)
      } else {
        console.log(`[v0] ⚠️ Promo code ${promoCode.toUpperCase()} is not valid`)
      }
    } catch (error) {
      // Invalid coupon code - will allow promotion codes in UI instead
      console.log(`[v0] ⚠️ Promo code ${promoCode?.toUpperCase()} not found, allowing promotion codes in UI`)
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
    mode: isSubscription ? "subscription" : "payment",
    // Apply validated coupon OR allow promotion codes (mutually exclusive per Stripe API)
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
