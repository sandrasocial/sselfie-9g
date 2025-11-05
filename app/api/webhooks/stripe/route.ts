import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits, grantOneTimeSessionCredits, grantMonthlyCredits } from "@/lib/credits"
import { neon } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import crypto from "crypto"

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
      case "checkout.session.completed": {
        const session = event.data.object

        if (session.mode === "payment") {
          // One-time purchase (credit top-up or one-time session)
          let userId = session.metadata.user_id
          const credits = Number.parseInt(session.metadata.credits || "0")
          const productType = session.metadata.product_type
          const customerEmail = session.customer_details?.email || session.customer_email

          console.log(`[v0] Payment completed - Product type: ${productType}, Credits: ${credits}`)

          if (!userId && customerEmail) {
            console.log(`[v0] No user_id in metadata, looking up user by email: ${customerEmail}`)

            const users = await sql`
              SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
            `

            if (users.length > 0) {
              userId = users[0].id
              console.log(`[v0] Found user ${userId} for email ${customerEmail}`)
            } else {
              console.error(`[v0] No user found for email ${customerEmail} - cannot process payment`)
              return NextResponse.json(
                {
                  error: "User not found for payment",
                },
                { status: 400 },
              )
            }
          }

          if (!userId) {
            console.error("[v0] No user_id found for payment - skipping")
            return NextResponse.json(
              {
                error: "Missing user_id for payment",
              },
              { status: 400 },
            )
          }

          // Handle different product types
          if (productType === "one_time_session") {
            console.log(`[v0] One-time session purchase for user ${userId}`)

            // Grant session credits
            await grantOneTimeSessionCredits(userId)

            // Create subscription record for tracking
            await sql`
              INSERT INTO subscriptions (
                user_id, 
                product_type,
                status, 
                stripe_customer_id,
                current_period_start,
                current_period_end
              )
              VALUES (
                ${userId},
                'one_time_session',
                'active',
                ${session.customer},
                NOW(),
                NOW() + INTERVAL '30 days'
              )
            `

            console.log(`[v0] One-time session activated for user ${userId}`)
          } else if (productType === "credit_topup") {
            console.log(`[v0] Credit top-up: ${credits} credits for user ${userId}`)
            await addCredits(userId, credits, "purchase", `Credit top-up purchase`)
            console.log(`[v0] Successfully added ${credits} credits to user ${userId}`)
          }
        } else if (session.mode === "subscription") {
          // Studio membership subscription
          const userId = session.metadata.user_id
          const customerEmail = session.customer_details?.email || session.customer_email
          const productType = session.metadata.product_type

          if (!userId && customerEmail) {
            console.log(`[v0] New subscription purchase from ${customerEmail} - creating account...`)

            try {
              const tempPassword = crypto.randomBytes(32).toString("hex")
              const supabaseAdmin = createAdminClient()

              const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                password: tempPassword,
                email_confirm: false,
                user_metadata: {
                  created_via: "stripe_subscription",
                  stripe_customer_id: session.customer,
                },
              })

              if (authError || !authData.user) {
                console.error(`[v0] Error creating auth user for ${customerEmail}:`, authError)
                throw authError || new Error("No user data returned")
              }

              console.log(`[v0] Created Supabase auth user for ${customerEmail}`)

              const neonUser = await getOrCreateNeonUser(authData.user.id, customerEmail)
              console.log(`[v0] Created Neon user for ${customerEmail}`)

              const baseUrl =
                process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

              const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: customerEmail,
                options: {
                  redirectTo: `${baseUrl}/studio`,
                },
              })

              if (resetError) {
                console.error(`[v0] Error generating reset link:`, resetError)
              }

              const passwordSetupLink = resetData?.properties?.action_link || `${baseUrl}/auth/reset-password`

              const creditsGranted = Number.parseInt(session.metadata.credits || "0")
              const productName = productType === "sselfie_studio_membership" ? "Studio Membership" : "Subscription"

              const emailContent = generateWelcomeEmail({
                customerName: customerEmail.split("@")[0], // Use email prefix as name
                customerEmail: customerEmail,
                passwordSetupUrl: passwordSetupLink,
                creditsGranted: creditsGranted,
                packageName: productName,
              })

              const emailResult = await sendEmail({
                to: customerEmail,
                subject: "Welcome to SSelfie! Set up your account",
                html: emailContent.html,
                text: emailContent.text,
                tags: ["welcome", "account-setup"],
              })

              if (emailResult.success) {
                console.log(`[v0] Welcome email sent to ${customerEmail}, message ID: ${emailResult.messageId}`)

                // Store email delivery record
                await sql`
                  INSERT INTO email_logs (
                    user_email,
                    email_type,
                    resend_message_id,
                    status,
                    sent_at
                  )
                  VALUES (
                    ${customerEmail},
                    'welcome',
                    ${emailResult.messageId},
                    'sent',
                    NOW()
                  )
                `
              } else {
                console.error(`[v0] Failed to send welcome email to ${customerEmail}: ${emailResult.error}`)

                // Store failed email record
                await sql`
                  INSERT INTO email_logs (
                    user_email,
                    email_type,
                    status,
                    error_message,
                    sent_at
                  )
                  VALUES (
                    ${customerEmail},
                    'welcome',
                    'failed',
                    ${emailResult.error},
                    NOW()
                  )
                `
              }

              await stripe.checkout.sessions.update(session.id, {
                metadata: {
                  ...session.metadata,
                  user_id: neonUser.id,
                  auto_created: "true",
                },
              })

              const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
              await stripe.subscriptions.update(subscription.id, {
                metadata: {
                  ...subscription.metadata,
                  user_id: neonUser.id,
                  product_type: productType,
                  credits: session.metadata.credits,
                },
              })

              console.log(`[v0] Account created successfully for ${customerEmail}`)
            } catch (error) {
              console.error(`[v0] Error creating account for ${customerEmail}:`, error)
            }
          } else {
            console.log("[v0] Subscription checkout completed for existing user")
          }
        }
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object
        let userId = subscription.metadata.user_id
        const productType = subscription.metadata.product_type || "sselfie_studio_membership"
        const credits = Number.parseInt(subscription.metadata.credits || "250")

        if (!userId) {
          console.log("[v0] No user_id in subscription metadata, looking up by customer...")
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          if (customer && !customer.deleted && customer.email) {
            console.log(`[v0] Looking up user by email: ${customer.email}`)
            const users = await sql`
              SELECT id FROM users WHERE email = ${customer.email} LIMIT 1
            `
            if (users.length > 0) {
              userId = users[0].id
              console.log(`[v0] Found user ${userId} for email ${customer.email}`)

              await stripe.subscriptions.update(subscription.id, {
                metadata: {
                  ...subscription.metadata,
                  user_id: userId,
                },
              })
            }
          }
        }

        if (!userId) {
          console.error("[v0] No user_id found for subscription - skipping credit grant")
          break
        }

        console.log(`[v0] Subscription created: ${productType} for user ${userId}, granting ${credits} credits`)

        // Create or update subscription record
        await sql`
          INSERT INTO subscriptions (
            user_id, 
            product_type,
            status, 
            stripe_subscription_id,
            stripe_customer_id,
            current_period_start,
            current_period_end
          )
          VALUES (
            ${userId},
            ${productType},
            ${subscription.status},
            ${subscription.id},
            ${subscription.customer},
            to_timestamp(${subscription.current_period_start}),
            to_timestamp(${subscription.current_period_end})
          )
          ON CONFLICT (user_id) 
          DO UPDATE SET
            product_type = ${productType},
            status = ${subscription.status},
            stripe_subscription_id = ${subscription.id},
            stripe_customer_id = ${subscription.customer},
            current_period_start = to_timestamp(${subscription.current_period_start}),
            current_period_end = to_timestamp(${subscription.current_period_end}),
            updated_at = NOW()
        `

        // Grant initial credits for studio membership
        if (productType === "sselfie_studio_membership") {
          await grantMonthlyCredits(userId, "sselfie_studio_membership")

          // Record the grant
          await sql`
            INSERT INTO subscription_credit_grants (
              user_id,
              product_type,
              credits_granted,
              grant_period_start,
              grant_period_end
            )
            VALUES (
              ${userId},
              ${productType},
              ${credits},
              to_timestamp(${subscription.current_period_start}),
              to_timestamp(${subscription.current_period_end})
            )
          `
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const userId = subscription.metadata.user_id
          const productType = subscription.metadata.product_type || "sselfie_studio_membership"
          const credits = Number.parseInt(subscription.metadata.credits || "250")

          console.log(`[v0] Subscription renewed: ${productType} for user ${userId}`)

          // Check if we already granted credits for this period
          const existingGrant = await sql`
            SELECT id FROM subscription_credit_grants
            WHERE user_id = ${userId}
            AND grant_period_start = to_timestamp(${subscription.current_period_start})
            AND grant_period_end = to_timestamp(${subscription.current_period_end})
          `

          if (existingGrant.length === 0 && productType === "sselfie_studio_membership") {
            // Grant monthly credits
            await grantMonthlyCredits(userId, "sselfie_studio_membership")

            // Record the grant
            await sql`
              INSERT INTO subscription_credit_grants (
                user_id,
                product_type,
                credits_granted,
                grant_period_start,
                grant_period_end
              )
              VALUES (
                ${userId},
                ${productType},
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

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const userId = subscription.metadata.user_id

        console.log(`[v0] Subscription cancelled for user ${userId}`)

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
