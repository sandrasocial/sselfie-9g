import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function GET() {
  if (process.env.ENABLE_UNUSED_ENDPOINTS !== "true") return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
  try {
    const results = {
      environment: "unknown",
      keys_configured: false,
      webhook_configured: false,
      products_found: 0,
      products: [] as any[],
      errors: [] as string[],
    }

    const secretKey = process.env.STRIPE_SECRET_KEY
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!secretKey || !publishableKey) {
      results.errors.push("Missing Stripe keys")
      return NextResponse.json(results, { status: 500 })
    }

    results.keys_configured = true

    // Determine environment (test vs live)
    if (secretKey.startsWith("sk_live_")) {
      results.environment = "LIVE MODE ✅"
    } else if (secretKey.startsWith("sk_test_")) {
      results.environment = "TEST MODE ⚠️"
    } else {
      results.environment = "UNKNOWN"
      results.errors.push("Unrecognized key format")
    }

    // Check webhook secret
    if (webhookSecret && webhookSecret.startsWith("whsec_")) {
      results.webhook_configured = true
    } else {
      results.errors.push("Webhook secret missing or invalid - set STRIPE_WEBHOOK_SECRET")
    }

    // Fetch products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    })

    results.products_found = products.data.length

    // Get prices for each product
    for (const product of products.data) {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      })

      results.products.push({
        name: product.name,
        product_id: product.id,
        prices: prices.data.map((price) => ({
          price_id: price.id,
          amount: price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "N/A",
          currency: price.currency?.toUpperCase(),
          interval: price.recurring?.interval || "one-time",
        })),
      })

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Check required price IDs in environment
    const priceIds = {
      studio_membership: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "NOT SET",
      one_time_session: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID || "NOT SET",
      credits_50: process.env.STRIPE_CREDITS_50_PRICE_ID || "NOT SET",
      credits_100: process.env.STRIPE_CREDITS_100_PRICE_ID || "NOT SET",
      credits_250: process.env.STRIPE_CREDITS_250_PRICE_ID || "NOT SET",
    }

    // Verify price IDs exist in Stripe
    for (const [key, priceId] of Object.entries(priceIds)) {
      if (priceId === "NOT SET") {
        results.errors.push(`Missing environment variable for ${key.toUpperCase()}`)
      } else if (priceId.startsWith("price_")) {
        try {
          await stripe.prices.retrieve(priceId)
        } catch (error) {
          results.errors.push(`Price ID ${priceId} for ${key} not found in Stripe`)
        }
      }
    }

    return NextResponse.json(
      {
        ...results,
        price_ids: priceIds,
        recommendations:
          results.errors.length === 0
            ? [
                "✅ All Stripe configuration looks good!",
                results.environment === "LIVE MODE ✅"
                  ? "✅ You're in LIVE mode - ready for real payments"
                  : "⚠️ You're in TEST mode - switch to live keys when ready",
                "Next step: Create a 100% off coupon for testing",
              ]
            : ["⚠️ Please fix the errors above", "Check your environment variables in the Vars section"],
      },
      { status: 200 },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to verify Stripe setup",
        message: error.message,
        hint:
          error.code === "api_key_invalid"
            ? "Your Stripe keys might be incorrect. Check the Vars section."
            : "Unknown error - check your Stripe Dashboard for issues",
      },
      { status: 500 },
    )
  }
}
