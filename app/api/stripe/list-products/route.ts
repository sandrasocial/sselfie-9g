import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY not found" }, { status: 500 })
    }

    const isTestMode = stripeKey.startsWith("sk_test_")
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" })

    // List all products
    const products = await stripe.products.list({ limit: 100, active: true })

    // Get prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({ product: product.id, active: true })
        return {
          product_id: product.id,
          name: product.name,
          description: product.description,
          prices: prices.data.map((price) => ({
            price_id: price.id,
            amount: price.unit_amount ? price.unit_amount / 100 : 0,
            currency: price.currency,
            recurring: price.recurring
              ? {
                  interval: price.recurring.interval,
                  interval_count: price.recurring.interval_count,
                }
              : null,
          })),
        }
      }),
    )

    return NextResponse.json({
      mode: isTestMode ? "TEST" : "LIVE",
      stripe_key_prefix: stripeKey.substring(0, 10) + "...",
      products: productsWithPrices,
      env_vars: {
        STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "NOT SET",
        STRIPE_ONE_TIME_SESSION_PRICE_ID: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID || "NOT SET",
        STRIPE_CREDITS_50_PRICE_ID: process.env.STRIPE_CREDITS_50_PRICE_ID || "NOT SET",
        STRIPE_CREDITS_100_PRICE_ID: process.env.STRIPE_CREDITS_100_PRICE_ID || "NOT SET",
        STRIPE_CREDITS_250_PRICE_ID: process.env.STRIPE_CREDITS_250_PRICE_ID || "NOT SET",
      },
    })
  } catch (error: any) {
    console.error("[v0] Error listing Stripe products:", error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
