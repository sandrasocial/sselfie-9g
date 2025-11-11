"use server"

import { stripe } from "@/lib/stripe"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCreditPackageById } from "@/lib/credit-packages"
import { getProductById } from "@/lib/products"
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

export async function startProductCheckoutSession(productId: string) {
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

  let customerId: string | undefined

  const { neon } = await import("@/lib/db")
  const sql = neon(process.env.DATABASE_URL!)
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
      },
    })
    customerId = customer.id
  }

  const isSubscription = product.type === "sselfie_studio_membership"

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          ...(isSubscription && {
            recurring: {
              interval: "month",
            },
          }),
        },
        quantity: 1,
      },
    ],
    mode: isSubscription ? "subscription" : "payment",
    metadata: {
      user_id: user.id,
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: "app",
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
