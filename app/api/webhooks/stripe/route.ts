import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
import { neon } from "@/lib/db"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("[v0] Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log("[v0] Stripe webhook event:", event.type)

  try {
    switch (event.type) {
      // One-time credit purchase completed
      case "checkout.session.completed": {
        const session = event.data.object

        if (session.mode === "payment") {
          // One-time credit purchase
          const userId = session.metadata.user_id
          const credits = Number.parseInt(session.metadata.credits)
          const packageId = session.metadata.package_id

          console.log(`[v0] Credit purchase completed: ${credits} credits for user ${userId}`)

          // Add credits to user account
          await addCredits(userId, credits, "purchase", `Purchased ${packageId} package`)
        } else if (session.mode === "subscription") {
          // Subscription created - credits will be granted via subscription.created event
          console.log("[v0] Subscription checkout completed")
        }
        break
      }

      // Subscription created - grant initial credits
      case "customer.subscription.created": {
        const subscription = event.data.object
        const userId = subscription.metadata.user_id
        const tier = subscription.metadata.tier
        const credits = Number.parseInt(subscription.metadata.credits)

        console.log(`[v0] Subscription created: ${tier} tier for user ${userId}`)

        // Create or update subscription record
        await sql`
          INSERT INTO subscriptions (
            user_id, 
            tier, 
            status, 
            stripe_subscription_id,
            stripe_customer_id,
            current_period_start,
            current_period_end
          )
          VALUES (
            ${userId},
            ${tier},
            ${subscription.status},
            ${subscription.id},
            ${subscription.customer},
            to_timestamp(${subscription.current_period_start}),
            to_timestamp(${subscription.current_period_end})
          )
          ON CONFLICT (user_id) 
          DO UPDATE SET
            tier = ${tier},
            status = ${subscription.status},
            stripe_subscription_id = ${subscription.id},
            stripe_customer_id = ${subscription.customer},
            current_period_start = to_timestamp(${subscription.current_period_start}),
            current_period_end = to_timestamp(${subscription.current_period_end}),
            updated_at = NOW()
        `

        // Grant initial credits
        await addCredits(userId, credits, "subscription_grant", `${tier} subscription - initial grant`)

        // Record the grant
        await sql`
          INSERT INTO subscription_credit_grants (
            user_id,
            subscription_tier,
            credits_granted,
            grant_period_start,
            grant_period_end
          )
          VALUES (
            ${userId},
            ${tier},
            ${credits},
            to_timestamp(${subscription.current_period_start}),
            to_timestamp(${subscription.current_period_end})
          )
        `
        break
      }

      // Subscription renewed - grant monthly credits
      case "invoice.payment_succeeded": {
        const invoice = event.data.object

        // Only process subscription invoices (not one-time payments)
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const userId = subscription.metadata.user_id
          const tier = subscription.metadata.tier
          const credits = Number.parseInt(subscription.metadata.credits)

          console.log(`[v0] Subscription renewed: ${tier} tier for user ${userId}`)

          // Check if we already granted credits for this period
          const existingGrant = await sql`
            SELECT id FROM subscription_credit_grants
            WHERE user_id = ${userId}
            AND grant_period_start = to_timestamp(${subscription.current_period_start})
            AND grant_period_end = to_timestamp(${subscription.current_period_end})
          `

          if (existingGrant.length === 0) {
            // Grant monthly credits
            await addCredits(userId, credits, "subscription_grant", `${tier} subscription - monthly renewal`)

            // Record the grant
            await sql`
              INSERT INTO subscription_credit_grants (
                user_id,
                subscription_tier,
                credits_granted,
                grant_period_start,
                grant_period_end
              )
              VALUES (
                ${userId},
                ${tier},
                ${credits},
                to_timestamp(${subscription.current_period_start}),
                to_timestamp(${subscription.current_period_end})
              )
            `
          }

          // Update subscription record
          await sql`
            UPDATE subscriptions
            SET 
              status = ${subscription.status},
              current_period_start = to_timestamp(${subscription.current_period_start}),
              current_period_end = to_timestamp(${subscription.current_period_end}),
              updated_at = NOW()
            WHERE user_id = ${userId}
          `
        }
        break
      }

      // Subscription cancelled
      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const userId = subscription.metadata.user_id

        console.log(`[v0] Subscription cancelled for user ${userId}`)

        // Update subscription status
        await sql`
          UPDATE subscriptions
          SET 
            status = 'cancelled',
            updated_at = NOW()
          WHERE user_id = ${userId}
        `
        break
      }

      default:
        console.log(`[v0] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
