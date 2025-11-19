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
import { addOrUpdateResendContact, updateContactTags as updateTags, addContactToSegment } from "@/lib/resend/manage-contact"

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
  console.log("[v0] Event livemode:", event.livemode ? "PRODUCTION" : "TEST MODE")

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object

        console.log("[v0] 🎉 Checkout session completed!")
        console.log("[v0] Session ID:", session.id)
        console.log("[v0] Mode:", session.mode)
        console.log("[v0] Customer email:", session.customer_details?.email || session.customer_email)
        console.log("[v0] Metadata:", session.metadata)
        console.log("[v0] Test mode:", !event.livemode ? "YES (TEST)" : "NO (PRODUCTION)")

        const customerEmail = session.customer_details?.email || session.customer_email
        if (customerEmail) {
          try {
            const customerName = session.customer_details?.name || customerEmail.split("@")[0]
            const firstName = customerName.split(" ")[0] || customerName
            
            const productType = session.metadata.product_type
            let productTag = "unknown"

            if (productType === "one_time_session") {
              productTag = "one-time-session"
            } else if (productType === "sselfie_studio_membership") {
              productTag = "studio-membership"
            } else if (productType === "credit_topup") {
              productTag = "credit-topup"
            }

            const resendResult = await addOrUpdateResendContact(customerEmail, firstName, {
              source: "stripe-checkout",
              status: "customer",
              product: productTag,
              journey: "onboarding",
              converted: "true",
              purchase_date: new Date().toISOString().split("T")[0],
            })

            if (resendResult.success) {
              console.log(`[v0] Added paying customer ${customerEmail} to Resend audience with ID: ${resendResult.contactId}`)
              
              if (process.env.RESEND_BETA_SEGMENT_ID) {
                const segmentResult = await addContactToSegment(
                  customerEmail,
                  process.env.RESEND_BETA_SEGMENT_ID
                )
                
                if (segmentResult.success) {
                  console.log(`[v0] Added ${customerEmail} to Beta Customers segment`)
                } else {
                  console.error(`[v0] Failed to add to Beta segment: ${segmentResult.error}`)
                }
              }
            } else {
              console.error(`[v0] Failed to add paying customer to Resend: ${resendResult.error}`)
            }

            await sql`
              UPDATE freebie_subscribers 
              SET 
                email_tags = CASE 
                  WHEN email_tags IS NULL THEN ARRAY['purchased', 'customer']
                  WHEN NOT ('purchased' = ANY(email_tags)) THEN array_append(email_tags, 'purchased')
                  ELSE email_tags
                END,
                converted_to_user = TRUE,
                converted_at = NOW(),
                updated_at = NOW()
              WHERE email = ${customerEmail}
            `
            console.log(`[v0] Tagged ${customerEmail} as purchased in freebie_subscribers`)

            await updateTags(customerEmail, {
              status: "customer",
              journey: "onboarding",
              converted: "true",
              product: productTag,
              conversion_date: new Date().toISOString().split("T")[0],
            })

            console.log(`[v0] Updated Resend tags for ${customerEmail} to customer status`)
          } catch (tagError) {
            console.error(`[v0] Failed to tag subscriber as purchased:`, tagError)
          }
        }

        if (session.mode === "payment") {
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

              if (source === "app" && productType === "credit_topup") {
                console.log(`[v0] Sending credit top-up confirmation email to ${customerEmail}`)

                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
                const productName = "CREDIT PURCHASE"

                const emailContent = generateWelcomeEmail({
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  creditsGranted: credits,
                  packageName: productName,
                  productType: "credit_topup",
                })

                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: `Your ${credits} credits have been added!`,
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["credit-topup", "purchase-confirmation"],
                })

                if (emailResult.success) {
                  console.log(`[v0] Credit top-up confirmation email sent, message ID: ${emailResult.messageId}`)

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
                      'credit_topup_confirmation',
                      ${emailResult.messageId},
                      'sent',
                      NOW()
                    )
                  `
                } else {
                  console.error(`[v0] Failed to send credit top-up confirmation email: ${emailResult.error}`)
                }
              } else if (source === "landing_page") {
                console.log(`[v0] Sending purchase confirmation email to existing user ${customerEmail}`)

                const productName = productType === "one_time_session" ? "ONE-TIME SESSION" : "CREDIT PACKAGE"
                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

                const emailContent = generateWelcomeEmail({
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  creditsGranted: credits,
                  packageName: productName,
                  productType: productType as "one_time_session" | "credit_topup",
                })

                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: `Your ${productName} purchase is confirmed!`,
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["purchase-confirmation", "existing-user"],
                })

                if (emailResult.success) {
                  console.log(`[v0] Purchase confirmation email sent, message ID: ${emailResult.messageId}`)

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
                      'purchase_confirmation',
                      ${emailResult.messageId},
                      'sent',
                      NOW()
                    )
                  `
                } else {
                  console.error(`[v0] Failed to send purchase confirmation email: ${emailResult.error}`)
                }
              }
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

                  const neonUser = await getOrCreateNeonUser(existingUser.id, customerEmail, null)
                  userId = neonUser.id
                  console.log(`[v0] Linked existing Supabase user to Neon user ${userId}`)
                } else {
                  console.log(`[v0] Step 2: Creating new user in Supabase auth (no email sent)...`)

                  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: customerEmail,
                    email_confirm: true,
                    user_metadata: {
                      created_via: "stripe_one_time_purchase",
                      stripe_customer_id: session.customer,
                      product_type: productType,
                    },
                  })

                  if (createError) {
                    console.error(`[v0] Supabase create user error details:`, {
                      message: createError.message,
                      status: createError.status,
                      name: createError.name,
                      code: (createError as any).code,
                    })
                    throw createError
                  }

                  if (!createData.user) {
                    console.error(`[v0] No user data returned from create`)
                    throw new Error("No user data returned from Supabase create")
                  }

                  console.log(`[v0] Step 3: Created Supabase auth user ${createData.user.id} for ${customerEmail}`)

                  console.log(`[v0] Step 4: Generating password reset link...`)
                  const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                    type: "recovery",
                    email: customerEmail,
                    options: {
                      redirectTo: `${productionUrl}/auth/setup-password`,
                    },
                  })

                  if (resetError) {
                    console.error(`[v0] Error generating password reset link:`, resetError)
                    throw resetError
                  }

                  console.log(`[v0] Step 5: Creating Neon user record...`)
                  const neonUser = await getOrCreateNeonUser(createData.user.id, customerEmail, null)
                  userId = neonUser.id
                  console.log(`[v0] Step 6: Created Neon user ${userId} for ${customerEmail}`)

                  await sql`
                    UPDATE users 
                    SET password_setup_complete = FALSE
                    WHERE id = ${userId}
                  `
                  console.log(`[v0] Set password_setup_complete to FALSE for new user ${userId}`)

                  let passwordSetupLink = resetData.properties.action_link

                  if (passwordSetupLink.includes("localhost") || passwordSetupLink.includes("supabase.co")) {
                    const url = new URL(passwordSetupLink)
                    const token = url.searchParams.get("token")
                    const type = url.searchParams.get("type") || "recovery"

                    if (token) {
                      passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
                    }
                  }

                  console.log(`[v0] Step 7: Generated password setup link`)

                  const productName = productType === "one_time_session" ? "ONE-TIME SESSION" : "CREDIT PACKAGE"

                  console.log(`[v0] Step 8: Generating welcome email...`)
                  const emailContent = generateWelcomeEmail({
                    customerName: customerEmail.split("@")[0],
                    customerEmail: customerEmail,
                    creditsGranted: credits,
                    packageName: productName,
                    productType: productType as "one_time_session" | "credit_topup",
                    passwordSetupUrl: passwordSetupLink,
                  })

                  console.log("[v0] Email content generated:", {
                    hasHtml: !!emailContent.html,
                    hasText: !!emailContent.text,
                    htmlLength: emailContent.html?.length || 0,
                    textLength: emailContent.text?.length || 0,
                  })

                  console.log(`[v0] Step 9: Sending welcome email via Resend...`)
                  const emailResult = await sendEmail({
                    to: customerEmail,
                    subject: "Welcome to SSelfie! Set up your account",
                    html: emailContent.html,
                    text: emailContent.text,
                    tags: ["welcome", "account-setup", "one-time-purchase"],
                  })

                  if (emailResult.success) {
                    console.log(`[v0] Step 10: Welcome email sent successfully, message ID: ${emailResult.messageId}`)

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
            console.log(`[v0] One-time session credits granted for user ${userId}`)
          } else if (productType === "credit_topup") {
            console.log(`[v0] Credit top-up: ${credits} credits for user ${userId}`)
            await addCredits(userId, credits, "purchase", `Credit top-up purchase`, undefined, !event.livemode)
            console.log(`[v0] Successfully added ${credits} credits to user ${userId}`)
          }
        } else if (session.mode === "subscription") {
          let userId = session.metadata.user_id
          const customerEmail = session.customer_details?.email || session.customer_email
          const productType = session.metadata.product_type
          const credits = Number.parseInt(session.metadata.credits || "250")

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

                const neonUser = await getOrCreateNeonUser(existingUser.id, customerEmail, null)
                userId = neonUser.id
                console.log(`[v0] Linked existing Supabase user to Neon user ${userId}`)

                if (productType === "sselfie_studio_membership") {
                  console.log(`[v0] Granting ${credits} monthly credits to existing user ${userId}`)
                  await grantMonthlyCredits(userId, "sselfie_studio_membership", !event.livemode)
                }

                if (session.subscription) {
                  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string)

                  console.log(`[v0] Creating subscription record for existing user ${userId}`)

                  const existingSubscription = await sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
                  `

                  if (existingSubscription.length > 0) {
                    console.log(`[v0] Updating existing subscription for user ${userId}`)
                    await sql`
                      UPDATE subscriptions SET
                        product_type = ${productType},
                        plan = ${productType},
                        status = ${subscriptionData.status},
                        stripe_subscription_id = ${subscriptionData.id},
                        stripe_customer_id = ${subscriptionData.customer},
                        current_period_start = to_timestamp(${subscriptionData.current_period_start}),
                        current_period_end = to_timestamp(${subscriptionData.current_period_end}),
                        is_test_mode = ${!event.livemode},
                        updated_at = NOW()
                      WHERE user_id = ${userId}
                    `
                  } else {
                    console.log(`[v0] Inserting new subscription for user ${userId}`)
                    await sql`
                      INSERT INTO subscriptions (
                        user_id, 
                        product_type,
                        plan,
                        status, 
                        stripe_subscription_id,
                        stripe_customer_id,
                        current_period_start,
                        current_period_end,
                        is_test_mode
                      )
                      VALUES (
                        ${userId},
                        ${productType},
                        ${productType},
                        ${subscriptionData.status},
                        ${subscriptionData.id},
                        ${subscriptionData.customer},
                        to_timestamp(${subscriptionData.current_period_start}),
                        to_timestamp(${subscriptionData.current_period_end}),
                        ${!event.livemode}
                      )
                    `
                  }

                  console.log(`[v0] ✅ Subscription record created for existing user ${userId}`)
                }
              } else {
                console.log(`[v0] Step 2: Creating new user in Supabase auth (no email sent)...`)

                const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                  email: customerEmail,
                  email_confirm: true,
                  user_metadata: {
                    created_via: "stripe_subscription",
                    stripe_customer_id: session.customer,
                  },
                })

                if (createError) {
                  console.error(`[v0] Supabase create user error details:`, {
                    message: createError.message,
                    status: createError.status,
                    name: createError.name,
                    code: (createError as any).code,
                  })
                  throw createError
                }

                if (!createData.user) {
                  console.error(`[v0] No user data returned from create`)
                  throw new Error("No user data returned from Supabase create")
                }

                console.log(`[v0] Step 3: Created Supabase auth user ${createData.user.id} for ${customerEmail}`)

                console.log(`[v0] Step 4: Generating password reset link...`)
                const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                  type: "recovery",
                  email: customerEmail,
                  options: {
                    redirectTo: `${productionUrl}/auth/setup-password`,
                  },
                })

                if (resetError) {
                  console.error(`[v0] Error generating password reset link:`, resetError)
                  throw resetError
                }

                console.log(`[v0] Step 5: Creating Neon user record...`)
                const neonUser = await getOrCreateNeonUser(createData.user.id, customerEmail, null)
                userId = neonUser.id
                console.log(`[v0] Step 6: Created Neon user ${userId} for ${customerEmail}`)

                await sql`
                  UPDATE users 
                  SET password_setup_complete = FALSE
                  WHERE id = ${userId}
                `
                console.log(`[v0] Set password_setup_complete to FALSE for new user ${userId}`)

                if (productType === "sselfie_studio_membership") {
                  console.log(`[v0] Step 6.5: Granting ${credits} monthly credits to new user ${userId}`)
                  await grantMonthlyCredits(userId, "sselfie_studio_membership", !event.livemode)
                  console.log(`[v0] Successfully granted ${credits} credits to user ${userId}`)
                }

                let passwordSetupLink = resetData.properties.action_link

                if (passwordSetupLink.includes("localhost") || passwordSetupLink.includes("supabase.co")) {
                  const url = new URL(passwordSetupLink)
                  const token = url.searchParams.get("token")
                  const type = url.searchParams.get("type") || "recovery"

                  if (token) {
                    passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
                  }
                }

                console.log(`[v0] Step 7: Generated password setup link for ${customerEmail}`)

                const creditsGranted = credits
                const productName = productType === "sselfie_studio_membership" ? "STUDIO MEMBERSHIP" : "SUBSCRIPTION"

                console.log("[v0] Generating welcome email with params:", {
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  creditsGranted: creditsGranted,
                  packageName: productName,
                  passwordSetupUrl: passwordSetupLink,
                })

                const emailContent = generateWelcomeEmail({
                  customerName: customerEmail.split("@")[0],
                  customerEmail: customerEmail,
                  creditsGranted: creditsGranted,
                  packageName: productName,
                  productType:
                    productType === "sselfie_studio_membership" ? "sselfie_studio_membership" : "one_time_session",
                  passwordSetupUrl: passwordSetupLink,
                })

                console.log("[v0] Email content generated:", {
                  hasHtml: !!emailContent.html,
                  hasText: !!emailContent.text,
                  htmlLength: emailContent.html?.length || 0,
                  textLength: emailContent.text?.length || 0,
                })

                console.log(`[v0] Step 8: Sending welcome email via Resend...`)
                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: "Welcome to SSelfie! Set up your account",
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["welcome", "account-setup"],
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

                if (userId && session.subscription) {
                  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string)

                  console.log(`[v0] Creating subscription record in database for user ${userId}`)

                  const existingSubscription = await sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
                  `

                  if (existingSubscription.length > 0) {
                    console.log(`[v0] Updating existing subscription for user ${userId}`)
                    await sql`
                      UPDATE subscriptions SET
                        product_type = ${productType},
                        plan = ${productType},
                        status = ${subscriptionData.status},
                        stripe_subscription_id = ${subscriptionData.id},
                        stripe_customer_id = ${subscriptionData.customer},
                        current_period_start = to_timestamp(${subscriptionData.current_period_start}),
                        current_period_end = to_timestamp(${subscriptionData.current_period_end}),
                        is_test_mode = ${!event.livemode},
                        updated_at = NOW()
                      WHERE user_id = ${userId}
                    `
                  } else {
                    console.log(`[v0] Inserting new subscription for user ${userId}`)
                    await sql`
                      INSERT INTO subscriptions (
                        user_id, 
                        product_type,
                        plan,
                        status, 
                        stripe_subscription_id,
                        stripe_customer_id,
                        current_period_start,
                        current_period_end,
                        is_test_mode
                      )
                      VALUES (
                        ${userId},
                        ${productType},
                        ${productType},
                        ${subscriptionData.status},
                        ${subscriptionData.id},
                        ${subscriptionData.customer},
                        to_timestamp(${subscriptionData.current_period_start}),
                        to_timestamp(${subscriptionData.current_period_end}),
                        ${!event.livemode}
                      )
                    `
                  }

                  console.log(`[v0] Subscription record created successfully for user ${userId}`)
                }
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

            if (userId && productType === "sselfie_studio_membership") {
              console.log(`[v0] Granting ${credits} credits for subscription creation`)
              await grantMonthlyCredits(userId, "sselfie_studio_membership", !event.livemode)

              if (session.subscription) {
                const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string)

                console.log(`[v0] Creating subscription record in database for existing user ${userId}`)

                const existingSubscription = await sql`
                  SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
                `

                if (existingSubscription.length > 0) {
                  console.log(`[v0] Updating existing subscription for user ${userId}`)
                  await sql`
                    UPDATE subscriptions SET
                      product_type = ${productType},
                      plan = ${productType},
                      status = ${subscriptionData.status},
                      stripe_subscription_id = ${subscriptionData.id},
                      stripe_customer_id = ${subscriptionData.customer},
                      current_period_start = to_timestamp(${subscriptionData.current_period_start}),
                      current_period_end = to_timestamp(${subscriptionData.current_period_end}),
                      is_test_mode = ${!event.livemode},
                      updated_at = NOW()
                    WHERE user_id = ${userId}
                  `
                } else {
                  console.log(`[v0] Inserting new subscription for user ${userId}`)
                  await sql`
                    INSERT INTO subscriptions (
                      user_id, 
                      product_type,
                      plan,
                      status, 
                      stripe_subscription_id,
                      stripe_customer_id,
                      current_period_start,
                      current_period_end,
                      is_test_mode
                    )
                    VALUES (
                      ${userId},
                      ${productType},
                      ${productType},
                      ${subscriptionData.status},
                      ${subscriptionData.id},
                      ${subscriptionData.customer},
                      to_timestamp(${subscriptionData.current_period_start}),
                      to_timestamp(${subscriptionData.current_period_end}),
                      ${!event.livemode}
                    )
                  `
                }

                console.log(`[v0] Subscription record created successfully for existing user ${userId}`)
              }
            }
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

        console.log(`[v0] Subscription created: ${productType} for user ${userId}`)

        const existingSubscription = await sql`
          SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
        `

        if (existingSubscription.length > 0) {
          console.log(`[v0] Updating existing subscription for user ${userId}`)
          await sql`
            UPDATE subscriptions SET
              product_type = ${productType},
              plan = ${productType},
              status = ${subscription.status},
              stripe_subscription_id = ${subscription.id},
              stripe_customer_id = ${subscription.customer},
              current_period_start = to_timestamp(${subscription.current_period_start}),
              current_period_end = to_timestamp(${subscription.current_period_end}),
              is_test_mode = ${!event.livemode},
              updated_at = NOW()
            WHERE user_id = ${userId}
          `
        } else {
          console.log(`[v0] Inserting new subscription for user ${userId}`)
          await sql`
            INSERT INTO subscriptions (
              user_id, 
              product_type,
              plan,
              status, 
              stripe_subscription_id,
              stripe_customer_id,
              current_period_start,
              current_period_end,
              is_test_mode
            )
            VALUES (
              ${userId},
              ${productType},
              ${productType},
              ${subscription.status},
              ${subscription.id},
              ${subscription.customer},
              to_timestamp(${subscription.current_period_start}),
              to_timestamp(${subscription.current_period_end}),
              ${!event.livemode}
            )
          `
        }

        if (productType === "sselfie_studio_membership") {
          console.log(`[v0] Granting ${credits} credits for subscription creation`)
          await grantMonthlyCredits(userId, "sselfie_studio_membership", !event.livemode)
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

          await sql`
            UPDATE subscriptions
            SET 
              status = ${subscription.status},
              current_period_start = to_timestamp(${subscription.current_period_start}),
              current_period_end = to_timestamp(${subscription.current_period_end}),
              is_test_mode = ${!event.livemode},
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
