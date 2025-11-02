"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_TIERS } from "@/lib/products"

/**
 * Create a Stripe checkout session for landing page (pre-authentication)
 * This uses redirect mode instead of embedded mode
 */
export async function createLandingCheckoutSession(tierId: string) {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
  if (!tier) {
    throw new Error(`Subscription tier with id "${tierId}" not found`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

  console.log("[v0] Landing checkout - NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)
  console.log("[v0] Landing checkout - NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL)
  console.log("[v0] Landing checkout - Using baseUrl:", baseUrl)
  console.log("[v0] Landing checkout - Success URL:", `${baseUrl}/checkout/success`)

  // Create Checkout Session with redirect URLs
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: tier.name,
            description: tier.description,
          },
          unit_amount: tier.priceInCents,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: {
      tier: tierId,
      credits: tier.credits.toString(),
      source: "landing_page",
    },
  })

  console.log("[v0] Landing checkout - Created session with URL:", session.url)

  return session.url
}

/**
 * Get checkout session details for success page
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    })

    return {
      status: session.status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
      metadata: session.metadata,
    }
  } catch (error) {
    console.error("Error retrieving checkout session:", error)
    return null
  }
}
