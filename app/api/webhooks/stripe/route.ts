import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits, grantOneTimeSessionCredits, grantMonthlyCredits } from "@/lib/credits"
import { neon } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import { checkWebhookRateLimit } from "@/lib/rate-limit"
import { logWebhookError, alertWebhookError, isCriticalError } from "@/lib/webhook-monitoring"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  console.log("=".repeat(80))
  console.log("[v0] 🔔 WEBHOOK RECEIVED at:", new Date().toISOString())
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request method:", request.method)
  console.log("=".repeat(80))

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  console.log("[v0] Signature present:", !!signature)
  console.log("[v0] Signature length:", signature?.length || 0)
  console.log("[v0] Body length:", body.length)
  console.log("[v0] Webhook secret configured:", !!process.env.STRIPE_WEBHOOK_SECRET)
  console.log("[v0] Webhook secret length:", process.env.STRIPE_WEBHOOK_SECRET?.length || 0)
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    console.log("[v0] Webhook secret preview:", `${secret.substring(0, 10)}...${secret.substring(secret.length - 4)}`)
  }

  if (!signature) {
    console.error("[v0] ❌ ERROR: No Stripe signature in request headers")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[v0] ❌ ERROR: STRIPE_WEBHOOK_SECRET environment variable not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    console.log("[v0] ✅ Webhook signature verified successfully")
  } catch (err: any) {
    console.error("[v0] ❌ Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const customerId = event.data.object.customer || event.data.object.id
  const rateLimit = await checkWebhookRateLimit(customerId)

  if (!rateLimit.success) {
    console.log(`[v0] Webhook rate limit exceeded for customer ${customerId}`)
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  console.log("[v0] Stripe webhook event:", event.type)
  console.log("[v0] Event ID:", event.id)
  console.log("[v0] Event data object type:", event.data.object.object)

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
          const source = session.metadata.source

          console.log(`[v0] Payment completed - Product type: ${productType}, Credits: ${credits}, Source: ${source}`)

          if (!userId && customerEmail) {
            console.log(`[v0] No user_id in metadata, looking up user by email: ${customerEmail}`)

            const users = await sql`
              SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
            `

            if (users.length > 0) {
              userId = users[0].id
              console.log(`[v0] Found existing user ${userId} for email ${customerEmail}`)
            } else if (source === "landing_page") {
              console.log(`[v0] Creating new account for landing page purchase: ${customerEmail}`)

              try {
                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
                const supabaseAdmin = createAdminClient()

                console.log(`[v0] Step 1: Checking if user already exists in Supabase auth...`)

                const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

                if (listError) {
                  console.error(`[v0] Error listing users:`, listError)
                }

                const existingUser = existingUsers?.users?.find((u) => u.email === customerEmail)

                if (existingUser) {
                  console.log(`[v0] User already exists in Supabase auth: ${existingUser.id}`)

                  const neonUser = await getOrCreateNeonUser(existingUser.id, customerEmail)
                  userId = neonUser.id
                  console.log(`[v0] Linked existing Supabase user to Neon user ${userId}`)
                } else {
                  console.log(`[v0] Step 2: Inviting new user to Supabase auth...`)

                  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                    customerEmail,
                    {
                      redirectTo: `${productionUrl}/auth/setup-password`,
                      data: {
                        created_via: "stripe_one_time_purchase",
                        stripe_customer_id: session.customer,
                        product_type: productType,
                      },
                    },
                  )

                  if (inviteError) {
                    console.error(`[v0] Supabase invite error details:`, {
                      message: inviteError.message,
                      status: inviteError.status,
                      name: inviteError.name,
                      code: (inviteError as any).code,
                    })
                    throw inviteError
                  }

                  if (!inviteData.user) {
                    console.error(`[v0] No user data returned from invite`)
                    throw new Error("No user data returned from Supabase invite")
                  }

                  console.log(`[v0] Step 3: Invited Supabase auth user ${inviteData.user.id} for ${customerEmail}`)

                  console.log(`[v0] Step 4: Creating Neon user record...`)
                  const neonUser = await getOrCreateNeonUser(inviteData.user.id, customerEmail)
                  userId = neonUser.id
                  console.log(`[v0] Step 5: Created Neon user ${userId} for ${customerEmail}`)

                  let passwordSetupLink = inviteData.properties?.action_link || `${productionUrl}/auth/setup-password`

                  if (passwordSetupLink.includes("localhost") || passwordSetupLink.includes("supabase.co")) {
                    const url = new URL(passwordSetupLink)
                    const token = url.searchParams.get("token")
                    const type = url.searchParams.get("type") || "invite"

                    if (token) {
                      passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
                    }
                  }

                  console.log(`[v0] Step 6: Generated password setup link`)

                  const productName = productType === "one_time_session" ? "ONE-TIME SESSION" : "CREDIT PACKAGE"

                  console.log(`[v0] Step 7: Generating welcome email...`)
                  const emailContent = generateWelcomeEmail({
                    customerName: customerEmail.split("@")[0],
                    customerEmail: customerEmail,
                    passwordSetupUrl: passwordSetupLink,
                    creditsGranted: credits,
                    packageName: productName,
                  })

                  console.log("[v0] Email content generated:", {
                    hasHtml: !!emailContent.html,
                    hasText: !!emailContent.text,
                    htmlLength: emailContent.html?.length || 0,
                    textLength: emailContent.text?.length || 0,
                  })

                  console.log(`[v0] Step 8: Sending welcome email...`)
                  const emailResult = await sendEmail({
                    to: customerEmail,
                    subject: "Welcome to SSelfie! Set up your account",
                    html: emailContent.html,
                    text: emailContent.text,
                    tags: ["welcome", "account-setup", "one-time-purchase"],
                  })

                  if (emailResult.success) {
                    console.log(`[v0] Step 9: Welcome email sent successfully, message ID: ${emailResult.messageId}`)

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
                    console.error(`[v0] Failed to send welcome email: ${emailResult.error}`)

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
                }

                console.log(`[v0] ✅ Account creation completed successfully for ${customerEmail}`)
              } catch (error: any) {
                console.error(`[v0] ❌ DETAILED ERROR creating account for ${customerEmail}:`)
                console.error(`[v0] Error type: ${error.constructor.name}`)
                console.error(`[v0] Error message: ${error.message}`)
                console.error(`[v0] Error stack:`, error.stack)
                console.error(`[v0] Full error object:`, JSON.stringify(error, null, 2))

                return NextResponse.json(
                  {
                    error: "Failed to create user account",
                    details: error.message,
                  },
                  { status: 500 },
                )
              }
            } else {
              console.error(
                `[v0] No user found for email ${customerEmail} and not from landing page - cannot process payment`,
              )
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

          if (productType === "one_time_session") {
            console.log(`[v0] One-time session purchase for user ${userId}`)

            await grantOneTimeSessionCredits(userId)

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
          let userId = session.metadata.user_id
          const customerEmail = session.customer_details?.email || session.customer_email
          const productType = session.metadata.product_type

          if (!userId && customerEmail) {
            console.log(`[v0] New subscription purchase from ${customerEmail} - creating account...`)

            try {
              const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
              const supabaseAdmin = createAdminClient()

              console.log(`[v0] Step 1: Checking if user already exists in Supabase auth...`)

              const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

              if (listError) {
                console.error(`[v0] Error listing users:`, listError)
              }

              const existingUser = existingUsers?.users?.find((u) => u.email === customerEmail)

              if (existingUser) {
                console.log(`[v0] User already exists in Supabase auth: ${existingUser.id}`)

                const neonUser = await getOrCreateNeonUser(existingUser.id, customerEmail)
                userId = neonUser.id
                console.log(`[v0] Linked existing Supabase user to Neon user ${userId}`)
              } else {
                console.log(`[v0] Step 2: Inviting new user to Supabase auth...`)

                const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                  customerEmail,
                  {
                    redirectTo: `${productionUrl}/auth/setup-password`,
                    data: {
                      created_via: "stripe_subscription",
                      stripe_customer_id: session.customer,
                    },
                  },
                )

                if (inviteError) {
                  console.error(`[v0] Supabase invite error details:`, {
                    message: inviteError.message,
                    status: inviteError.status,
                    name: inviteError.name,
                    code: (inviteError as any).code,
                  })
                  throw inviteError
                }

                if (!inviteData.user) {
                  console.error(`[v0] No user data returned from invite`)
                  throw new Error("No user data returned from Supabase invite")
                }

                console.log(`[v0] Step 3: Invited Supabase auth user ${inviteData.user.id} for ${customerEmail}`)

                console.log(`[v0] Step 4: Creating Neon user record...`)
                const neonUser = await getOrCreateNeonUser(inviteData.user.id, customerEmail)
                userId = neonUser.id
                console.log(`[v0] Step 5: Created Neon user ${userId} for ${customerEmail}`)

                let passwordSetupLink = inviteData.properties?.action_link || `${productionUrl}/auth/setup-password`

                if (passwordSetupLink.includes("localhost") || passwordSetupLink.includes("supabase.co")) {
                  const url = new URL(passwordSetupLink)
                  const token = url.searchParams.get("token")
                  const type = url.searchParams.get("type") || "invite"

                  if (token) {
                    passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
                  }
                }

                console.log(`[v0] Step 6: Generated password setup link for ${customerEmail}`)

                const creditsGranted = Number.parseInt(session.metadata.credits || "0")
                const productName = productType === "sselfie_studio_membership" ? "STUDIO MEMBERSHIP" : "SUBSCRIPTION"

                console.log("[v0] Generating welcome email with params:", {
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  passwordSetupUrl: passwordSetupLink,
                  creditsGranted: creditsGranted,
                  packageName: productName,
                })

                const emailContent = generateWelcomeEmail({
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  passwordSetupUrl: passwordSetupLink,
                  creditsGranted: creditsGranted,
                  packageName: productName,
                })

                console.log("[v0] Email content generated:", {
                  hasHtml: !!emailContent.html,
                  hasText: !!emailContent.text,
                  htmlLength: emailContent.html?.length || 0,
                  textLength: emailContent.text?.length || 0,
                })

                console.log(`[v0] Step 7: Sending welcome email...`)
                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: "Welcome to SSelfie! Set up your account",
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["welcome", "account-setup"],
                })

                if (emailResult.success) {
                  console.log(`[v0] Step 8: Welcome email sent successfully, message ID: ${emailResult.messageId}`)

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
                  console.error(`[v0] Failed to send welcome email: ${emailResult.error}`)

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
                    user_id: userId,
                    auto_created: "true",
                  },
                })

                const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
                await stripe.subscriptions.update(subscription.id, {
                  metadata: {
                    ...subscription.metadata,
                    user_id: userId,
                    product_type: productType,
                    credits: session.metadata.credits,
                  },
                })

                console.log(`[v0] Account created successfully for ${customerEmail}`)
              }
            } catch (error: any) {
              console.error(`[v0] ❌ DETAILED ERROR creating account for ${customerEmail}:`)
              console.error(`[v0] Error type: ${error.constructor.name}`)
              console.error(`[v0] Error message: ${error.message}`)
              console.error(`[v0] Error stack:`, error.stack)
              console.error(`[v0] Full error object:`, JSON.stringify(error, null, 2))
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

        if (productType === "sselfie_studio_membership") {
          await grantMonthlyCredits(userId, "sselfie_studio_membership")

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

          const existingGrant = await sql`
            SELECT id FROM subscription_credit_grants
            WHERE user_id = ${userId}
            AND grant_period_start = to_timestamp(${subscription.current_period_start})
            AND grant_period_end = to_timestamp(${subscription.current_period_end})
          `

          if (existingGrant.length === 0 && productType === "sselfie_studio_membership") {
            await grantMonthlyCredits(userId, "sselfie_studio_membership")

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
        console.log(`[v0] ⚠️ UNHANDLED EVENT TYPE: ${event.type}`)
        console.log(`[v0] This event was received but not processed. If this is expected, you can ignore this message.`)
        console.log(`[v0] Event data:`, JSON.stringify(event.data.object, null, 2))
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] Webhook handler error:", error)

    const webhookError = {
      eventType: event.type,
      errorMessage: error.message || "Unknown error",
      errorStack: error.stack,
      eventData: event.data.object,
      timestamp: new Date(),
    }

    await logWebhookError(webhookError)

    if (isCriticalError(event.type, error.message)) {
      await alertWebhookError(webhookError)
    }

    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
