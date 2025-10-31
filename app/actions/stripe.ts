"use server"

import { stripe } from "@/lib/stripe"
import { CREDIT_PACKAGES, SUBSCRIPTION_TIERS } from "@/lib/products"
import { getUserByAuthId } from "@/lib/data/users"

export async function startCreditCheckoutSession(packageId: string) {
  const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId)
  if (!creditPackage) {
    throw new Error(`Credit package with id "${packageId}" not found`)
  }

  const user = await getUserByAuthId()
  if (!user) {
    throw new Error("User not authenticated")
  }

  // Create Checkout Session for one-time credit purchase
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
    metadata: {
      user_id: user.id,
      credits: creditPackage.credits.toString(),
      package_id: packageId,
    },
  })

  return session.client_secret
}

export async function startSubscriptionCheckoutSession(tierId: string) {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
  if (!tier) {
    throw new Error(`Subscription tier with id "${tierId}" not found`)
  }

  const user = await getUserByAuthId()
  if (!user) {
    throw new Error("User not authenticated")
  }

  // Create or retrieve Stripe customer
  let customerId: string | undefined

  // Check if user already has a Stripe customer ID
  const { neon } = await import("@/lib/db")
  const sql = neon(process.env.DATABASE_URL!)
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
      },
    })
    customerId = customer.id
  }

  // Create Checkout Session for subscription
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer: customerId,
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
    mode: "subscription",
    metadata: {
      user_id: user.id,
      tier: tierId,
      credits: tier.credits.toString(),
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
