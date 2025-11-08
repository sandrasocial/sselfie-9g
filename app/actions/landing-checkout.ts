"use server"

import { stripe } from "@/lib/stripe"
import { getProductById, ORIGINAL_PRICING } from "@/lib/products"
import { neon } from "@neondatabase/serverless"

const ENABLE_BETA_DISCOUNT = process.env.ENABLE_BETA_DISCOUNT !== "false"

export async function createLandingCheckoutSession(productId: string) {
  const product = getProductById(productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  const isSubscription = product.type === "sselfie_studio_membership"

  const actualPrice = ENABLE_BETA_DISCOUNT
    ? product.priceInCents
    : ORIGINAL_PRICING[product.type as keyof typeof ORIGINAL_PRICING]?.priceInCents || product.priceInCents

  console.log("[v0] Checkout:", {
    productId,
    betaEnabled: ENABLE_BETA_DISCOUNT,
    price: actualPrice,
    originalPrice: product.priceInCents,
  })

  const stripePriceId = isSubscription
    ? process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
    : process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID

  if (!stripePriceId) {
    throw new Error(`Stripe Price ID not configured for ${productId}`)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: isSubscription ? "subscription" : "payment",
    redirect_on_completion: "never",
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    ...(isSubscription && {
      subscription_data: {
        metadata: {
          product_id: productId,
          product_type: product.type,
          credits: product.credits?.toString() || "0",
          source: "landing_page",
          ...(ENABLE_BETA_DISCOUNT && { beta_discount: "50_percent" }),
        },
      },
    }),
    metadata: {
      product_id: productId,
      product_type: product.type,
      credits: product.credits?.toString() || "0",
      source: "landing_page",
      ...(ENABLE_BETA_DISCOUNT && { beta_discount: "50_percent" }),
    },
  })

  return session.client_secret
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

    emailCache.set(sessionId, { email, timestamp: Date.now() })

    return getUserByEmail(email)
  } catch (error: any) {
    return null
  }
}
