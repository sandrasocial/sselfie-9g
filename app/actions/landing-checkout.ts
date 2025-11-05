"use server"

import { stripe } from "@/lib/stripe"
import { getProductById } from "@/lib/products"

/**
 * Create a Stripe checkout session for landing page (pre-authentication)
 * Updated to use new pricing configuration
 */
export async function createLandingCheckoutSession(productId: string) {
  const product = getProductById(productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

  console.log("[v0] Landing checkout - Product:", productId)
  console.log("[v0] Landing checkout - Using baseUrl:", baseUrl)

  // Determine if this is a subscription or one-time payment
  const isSubscription = product.type === "sselfie_studio_membership"

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
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
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
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
    },
  })

  console.log("[v0] Landing checkout - Created session:", session.id)

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
