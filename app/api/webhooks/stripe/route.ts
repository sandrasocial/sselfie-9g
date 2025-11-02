import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
import { neon } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"

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
          const userId = session.metadata.user_id
          const customerEmail = session.customer_details?.email || session.customer_email

          if (!userId && customerEmail) {
            // New user purchasing subscription - create account automatically
            console.log(`[v0] New subscription purchase from ${customerEmail} - creating account...`)

            try {
              // Create Supabase auth user with admin API
              const supabaseAdmin = createAdminClient()

              const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                  created_via: "stripe_subscription",
                  stripe_customer_id: session.customer,
                },
              })

              if (authError) {
                console.error(`[v0] Error creating auth user for ${customerEmail}:`, authError)
                throw authError
              }

              if (!authData.user) {
                throw new Error("No user data returned from Supabase")
              }

              console.log(`[v0] Created Supabase auth user for ${customerEmail}`)

              // Create Neon database user
              const neonUser = await getOrCreateNeonUser(authData.user.id, customerEmail)
              console.log(`[v0] Created Neon user for ${customerEmail}`)

              // Generate password reset link for welcome email
              const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: customerEmail,
                options: {
                  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"}/studio`,
                },
              })

              if (resetError) {
                console.error(`[v0] Error generating reset link:`, resetError)
              }

              // Send welcome email
              const tier = session.metadata.tier || "Subscription"
              const credits = Number.parseInt(session.metadata.credits || "0")

              const emailContent = generateWelcomeEmail({
                email: customerEmail,
                resetLink: resetData?.properties?.action_link || "#",
                creditsGranted: credits,
                subscriptionTier: tier,
              })

              await sendEmail({
                to: customerEmail,
                subject: "Welcome to SSelfie! Set up your account",
                html: emailContent.html,
                text: emailContent.text,
              })

              console.log(`[v0] Welcome email sent to ${customerEmail}`)

              // Store the new user_id in session metadata for subscription.created event
              await stripe.checkout.sessions.update(session.id, {
                metadata: {
                  ...session.metadata,
                  user_id: neonUser.id,
                  auto_created: "true",
                },
              })

              console.log(`[v0] Account created successfully for ${customerEmail}`)
            } catch (error) {
              console.error(`[v0] Error creating account for ${customerEmail}:`, error)
              // Don't fail the webhook - subscription will still be created
            }
          } else {
            console.log("[v0] Subscription checkout completed for existing user")
          }
        }
        break
      }

      // Subscription created - grant initial credits
      case "customer.subscription.created": {
        const subscription = event.data.object
        let userId = subscription.metadata.user_id
        const tier = subscription.metadata.tier
        const credits = Number.parseInt(subscription.metadata.credits)

        if (!userId) {
          const customer = await stripe.customers.retrieve(subscription.customer)
          if (customer && !customer.deleted && customer.email) {
            const users = await sql`
              SELECT id FROM users WHERE email = ${customer.email} LIMIT 1
            `
            if (users.length > 0) {
              userId = users[0].id
              console.log(`[v0] Found user ${userId} for email ${customer.email}`)
            }
          }
        }

        if (!userId) {
          console.error("[v0] No user_id found for subscription - skipping credit grant")
          break
        }

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
