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
import {
  addOrUpdateResendContact,
  updateContactTags as updateTags,
  addContactToSegment,
} from "@/lib/resend/manage-contact"
import { syncContactToFlodesk, tagFlodeskContact } from '@/lib/flodesk'

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

  try {
    // Ensure webhook_events table exists
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id TEXT UNIQUE,
        processed_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Check if event has already been processed
    const eventId = event.id
    const existing = await sql`
      SELECT id FROM webhook_events WHERE stripe_event_id = ${eventId}
    `

    if (existing.length > 0) {
      console.log(`[v0] ⚠️ Duplicate event detected: ${eventId} - skipping processing`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record event as processed
    await sql`
      INSERT INTO webhook_events (stripe_event_id, processed_at)
      VALUES (${eventId}, NOW())
    `
    console.log(`[v0] Event ${eventId} recorded in idempotency table`)
  } catch (idempotencyError: any) {
    console.error("[v0] Idempotency check error:", idempotencyError.message)
    // Continue processing if idempotency check fails (better to risk duplicate than miss event)
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
        console.log("[v0] Payment status:", session.payment_status)
        console.log("[v0] Customer email:", session.customer_details?.email || session.customer_email)
        console.log("[v0] Metadata:", session.metadata)
        console.log("[v0] Test mode:", !event.livemode ? "YES (TEST)" : "NO (PRODUCTION)")

        // ⚠️ IMPORTANT: Only grant credits if payment was successful
        // For subscriptions, credits should be granted via invoice.payment_succeeded instead
        // to ensure payment is confirmed before granting credits
        const isPaymentPaid = session.payment_status === "paid"
        
        if (!isPaymentPaid && session.mode === "subscription") {
          console.log(`[v0] ⚠️ Subscription checkout completed but payment status is '${session.payment_status}'. Credits will be granted when invoice.payment_succeeded fires.`)
        } else if (!isPaymentPaid) {
          console.log(`[v0] ⚠️ Payment not confirmed (status: '${session.payment_status}'). Skipping credit grant.`)
        }

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
              productTag = "content-creator-studio"
            } else if (productType === "brand_studio_membership") {
              productTag = "brand-studio"
            } else if (productType === "credit_topup") {
              productTag = "credit-topup"
            }

            // Track conversion attribution if campaign_id is present
            const campaignId = session.metadata.campaign_id
            if (campaignId) {
              try {
                const campaignIdNum = parseInt(campaignId, 10)
                if (!isNaN(campaignIdNum)) {
                  // Update campaign conversion metrics
                  await sql`
                    UPDATE admin_email_campaigns
                    SET 
                      total_converted = COALESCE(total_converted, 0) + 1,
                      updated_at = NOW()
                    WHERE id = ${campaignIdNum}
                  `
                  
                  // Log conversion in email_logs
                  await sql`
                    INSERT INTO email_logs (
                      user_email, email_type, resend_message_id, status, sent_at
                    ) VALUES (
                      ${customerEmail}, 'campaign_conversion', NULL, 'converted', NOW()
                    )
                  `
                  
                  console.log(`[v0] ✅ Attributed conversion to campaign ${campaignIdNum} for ${customerEmail}`)
                }
              } catch (convError) {
                console.error(`[v0] Error tracking conversion attribution:`, convError)
                // Don't fail the webhook if attribution fails
              }
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
              console.log(
                `[v0] Added paying customer ${customerEmail} to Resend audience with ID: ${resendResult.contactId}`,
              )

              if (process.env.RESEND_BETA_SEGMENT_ID) {
                const segmentResult = await addContactToSegment(customerEmail, process.env.RESEND_BETA_SEGMENT_ID)

                if (segmentResult.success) {
                  console.log(`[v0] Added ${customerEmail} to Beta Customers segment`)
                  
                  // Create scheduled beta testimonial campaign (10 days after purchase)
                  try {
                    const { createBetaTestimonialCampaign } = await import("@/lib/email/create-beta-testimonial-campaign")
                    const campaignResult = await createBetaTestimonialCampaign({
                      userEmail: customerEmail,
                      firstName: firstName,
                      purchaseDate: new Date(),
                    })
                    
                    if (campaignResult.success) {
                      console.log(`[v0] Created beta testimonial campaign ${campaignResult.campaignId} for ${customerEmail}`)
                    } else {
                      console.warn(`[v0] Failed to create beta testimonial campaign: ${campaignResult.error}`)
                    }
                  } catch (campaignError) {
                    console.error(`[v0] Error creating beta testimonial campaign:`, campaignError)
                    // Don't fail the webhook if campaign creation fails
                  }
                } else {
                  console.error(`[v0] Failed to add to Beta segment: ${segmentResult.error}`)
                }
              }
            } else {
              console.error(`[v0] Failed to add paying customer to Resend: ${resendResult.error}`)
            }

            // NEW: Add paying customer to Loops
            try {
              console.log(`[v0] Adding paying customer to Loops: ${customerEmail}`)
              
              // Build tags - include beta-customer if beta segment exists
              const loopsTags = ['customer', 'paid', productTag]
              if (process.env.RESEND_BETA_SEGMENT_ID) {
                loopsTags.push('beta-customer')
              }
              
              const loopsResult = await syncContactToLoops({
                email: customerEmail,
                name: firstName,
                source: 'stripe-checkout',
                tags: loopsTags,
                userGroup: 'paid',
                customFields: {
                  status: 'customer',
                  product: productTag,
                  journey: 'onboarding',
                  converted: 'true',
                  purchaseDate: new Date().toISOString().split('T')[0],
                  ...(process.env.RESEND_BETA_SEGMENT_ID && { betaCustomer: 'true' })
                }
              })
              
              if (loopsResult.success) {
                console.log(`[v0] ✅ Added paying customer to Loops: ${customerEmail}`)
                
                // Update freebie_subscribers with Loops contact ID
                await sql`
                  UPDATE freebie_subscribers 
                  SET loops_contact_id = ${loopsResult.contactId || customerEmail},
                      synced_to_loops = true,
                      loops_synced_at = NOW(),
                      updated_at = NOW()
                  WHERE email = ${customerEmail}
                `
                console.log(`[v0] ✅ Updated freebie_subscribers with Loops contact ID`)
                
                // Update blueprint_subscribers with Loops contact ID (if exists)
                await sql`
                  UPDATE blueprint_subscribers 
                  SET loops_contact_id = ${loopsResult.contactId || customerEmail},
                      synced_to_loops = true,
                      loops_synced_at = NOW(),
                      updated_at = NOW()
                  WHERE email = ${customerEmail}
                `
                console.log(`[v0] ✅ Updated blueprint_subscribers with Loops contact ID`)
              } else {
                console.warn(`[v0] ⚠️ Loops sync failed for paying customer: ${loopsResult.error}`)
              }
            } catch (loopsError: any) {
              console.warn(`[v0] ⚠️ Loops sync error (non-critical):`, loopsError)
              // Don't fail webhook if Loops sync fails
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

            // Mark conversions in email automation sequences
            // Mark in blueprint_subscribers
            await sql`
              UPDATE blueprint_subscribers
              SET converted_to_user = true, converted_at = NOW(), updated_at = NOW()
              WHERE email = ${customerEmail}
              AND converted_to_user = false
            `

            // Mark in welcome_back_sequence
            await sql`
              UPDATE welcome_back_sequence
              SET converted = true, converted_at = NOW(), updated_at = NOW()
              WHERE user_email = ${customerEmail}
              AND converted = false
            `

            // Mark in email_logs for tracking
            await sql`
              UPDATE email_logs
              SET converted = true, converted_at = NOW()
              WHERE user_email = ${customerEmail}
              AND converted = false
            `

            console.log(`[v0] Marked ${customerEmail} as converted in all email sequences`)

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

          // Save Stripe customer ID to users table for one-time purchases
          // This allows users to access the Stripe customer portal to view invoices
          if (session.customer && typeof session.customer === "string") {
            console.log(`[v0] Saving Stripe customer ID ${session.customer} to users table for user ${userId}`)
            try {
              // Check if user already has a customer ID
              const existingCustomer = await sql`
                SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
              `
              
              if (existingCustomer.length > 0 && existingCustomer[0].stripe_customer_id) {
                console.log(`[v0] User ${userId} already has customer ID ${existingCustomer[0].stripe_customer_id}, updating to ${session.customer}`)
              }
              
              await sql`
                UPDATE users 
                SET stripe_customer_id = ${session.customer}
                WHERE id = ${userId}
              `
              console.log(`[v0] Successfully saved Stripe customer ID ${session.customer} for user ${userId}`)
            } catch (error: any) {
              console.error(`[v0] Error saving Stripe customer ID to users table:`, error.message)
              // Don't fail the webhook if this fails - non-critical
            }
          } else {
            console.log(`[v0] No customer ID in session for payment mode - session.customer:`, session.customer)
          }

          // ⚠️ IMPORTANT: For subscriptions, do NOT grant credits here!
          // Subscription credits should ONLY be granted via invoice.payment_succeeded
          // to ensure payment is confirmed before granting credits
          if (productType === "sselfie_studio_membership" && session.mode === "subscription") {
            console.log(
              `[v0] ⚠️ Subscription checkout completed. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`,
            )
          } else if (!isPaymentPaid) {
            console.log(
              `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`,
            )
          } else if (productType === "one_time_session") {
            console.log(`[v0] One-time session purchase for user ${userId} (test mode: ${!event.livemode})`)
            
            // Get payment intent ID from session
            const paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id
            
            if (!paymentIntentId) {
              console.error('[v0] ⚠️ No payment intent ID found for one-time session')
            }
            
            const isTestMode = !event.livemode
            
            // Pass payment ID to track the purchase
            await grantOneTimeSessionCredits(userId, paymentIntentId, isTestMode)
            console.log(`[v0] ✅ Granted one-time session credits with payment ID: ${paymentIntentId}`)
            
            // Update the credit_transaction record to store product_type
            if (paymentIntentId) {
              await sql`
                UPDATE credit_transactions
                SET product_type = 'one_time_session'
                WHERE user_id = ${userId}
                  AND stripe_payment_id = ${paymentIntentId}
                  AND product_type IS NULL
              `
            }
          } else if (productType === "credit_topup") {
            const isTestMode = !event.livemode
            console.log(`[v0] Credit top-up: ${credits} credits for user ${userId} (test mode: ${isTestMode})`)
            
            // Get payment intent ID
            const paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id
            
            if (!paymentIntentId) {
              console.error('[v0] ⚠️ No payment intent ID found for credit top-up')
            }
            
            // Pass payment ID to track the purchase
            await addCredits(
              userId,
              credits,
              "purchase",
              `Credit top-up purchase (${credits} credits)`,
              paymentIntentId,
              isTestMode
            )
            console.log(`[v0] ✅ Granted top-up credits with payment ID: ${paymentIntentId}`)
            
            // Update to store product_type
            if (paymentIntentId) {
              await sql`
                UPDATE credit_transactions
                SET product_type = 'credit_topup'
                WHERE user_id = ${userId}
                  AND stripe_payment_id = ${paymentIntentId}
                  AND product_type IS NULL
              `
            }
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

                // ⚠️ IMPORTANT: Do NOT grant subscription credits here!
                // Subscription credits should ONLY be granted via invoice.payment_succeeded
                // to ensure payment is confirmed before granting credits
                if (productType === "sselfie_studio_membership") {
                  console.log(
                    `[v0] Subscription checkout completed. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`,
                  )
                } else if (!event.livemode) {
                  console.log(
                    `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`,
                  )
                } else if (!isPaymentPaid) {
                  console.log(
                    `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`,
                  )
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

                // ⚠️ IMPORTANT: Do NOT grant subscription credits here!
                // Subscription credits should ONLY be granted via invoice.payment_succeeded
                // to ensure payment is confirmed before granting credits
                if (productType === "sselfie_studio_membership") {
                  console.log(
                    `[v0] Subscription checkout completed for new user. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`,
                  )
                } else if (!event.livemode) {
                  console.log(
                    `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`,
                  )
                } else if (!isPaymentPaid) {
                  console.log(
                    `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`,
                  )
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
                  
                  // Create scheduled beta testimonial campaign if user is in beta segment
                  if (process.env.RESEND_BETA_SEGMENT_ID) {
                    try {
                      const { createBetaTestimonialCampaign } = await import("@/lib/email/create-beta-testimonial-campaign")
                      const campaignResult = await createBetaTestimonialCampaign({
                        userEmail: customerEmail,
                        firstName: customerEmail.split("@")[0],
                        userId: userId,
                        purchaseDate: new Date(),
                      })
                      
                      if (campaignResult.success) {
                        console.log(`[v0] Created beta testimonial campaign ${campaignResult.campaignId} for ${customerEmail}`)
                      }
                    } catch (campaignError) {
                      console.error(`[v0] Error creating beta testimonial campaign:`, campaignError)
                    }
                  }
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

            // ⚠️ IMPORTANT: Do NOT grant subscription credits here!
            // Subscription credits should ONLY be granted via invoice.payment_succeeded
            // to ensure payment is confirmed before granting credits
            if (userId && productType === "sselfie_studio_membership") {
              console.log(
                `[v0] Subscription checkout completed. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`,
              )
            } else if (!event.livemode) {
              console.log(
                `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`,
              )
            } else if (!isPaymentPaid) {
              console.log(
                `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`,
              )

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
        console.log(`[v0] Event livemode: ${event.livemode ? "PRODUCTION" : "TEST MODE"}`)
        
        // ⚠️ IMPORTANT: Do NOT grant credits here!
        // subscription.created fires BEFORE payment is confirmed.
        // Credits should ONLY be granted when:
        // 1. invoice.payment_succeeded (for monthly renewals and first payment)
        // 2. checkout.session.completed with payment_status === 'paid' (for initial subscription)
        console.log(`[v0] Subscription record created. Credits will be granted when payment is confirmed via invoice.payment_succeeded`)

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

        // Credits for subscription creation are handled above (already checked livemode)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object

        if (!invoice.subscription) {
          console.log("[v0] Invoice payment succeeded but no subscription - skipping")
          break
        }

        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id

        if (!subscriptionId) {
          console.log("[v0] Invoice has no subscription ID - skipping")
          break
        }

        console.log(`[v0] Processing invoice payment for subscription: ${subscriptionId}`)
        console.log(`[v0] Invoice billing_reason: ${invoice.billing_reason || "N/A"}`)

        // Try to find subscription in database
        let [sub] = await sql`
          SELECT user_id, product_type, current_period_start
          FROM subscriptions
          WHERE stripe_subscription_id = ${subscriptionId}
        `

        // If subscription not found, try to create it from Stripe data
        if (!sub && invoice.subscription) {
          console.log(`[v0] ⚠️ Subscription not found in database, retrieving from Stripe...`)
          try {
            const subscription = typeof invoice.subscription === "string" 
              ? await stripe.subscriptions.retrieve(invoice.subscription)
              : invoice.subscription

            // Look up user by customer email or ID
            const customerId = typeof subscription.customer === "string" 
              ? subscription.customer 
              : subscription.customer?.id
            const customer = await stripe.customers.retrieve(customerId)
            
            if (customer && !customer.deleted && customer.email) {
              const users = await sql`
                SELECT id FROM users WHERE email = ${customer.email} LIMIT 1
              `
              
              if (users.length > 0) {
                const userId = users[0].id
                const productType = subscription.metadata.product_type || "sselfie_studio_membership"
                
                // Create subscription record
                await sql`
                  INSERT INTO subscriptions (
                    user_id, product_type, plan, status, 
                    stripe_subscription_id, stripe_customer_id,
                    current_period_start, current_period_end,
                    is_test_mode
                  )
                  VALUES (
                    ${userId}, ${productType}, ${productType}, ${subscription.status},
                    ${subscription.id}, ${customerId},
                    to_timestamp(${subscription.current_period_start}),
                    to_timestamp(${subscription.current_period_end}),
                    ${!event.livemode}
                  )
                  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                    status = ${subscription.status},
                    current_period_start = to_timestamp(${subscription.current_period_start}),
                    current_period_end = to_timestamp(${subscription.current_period_end}),
                    updated_at = NOW()
                `
                
                // Re-fetch subscription
                const result = await sql`
                  SELECT user_id, product_type, current_period_start
                  FROM subscriptions
                  WHERE stripe_subscription_id = ${subscriptionId}
                `
                sub = result[0] || null
                console.log(`[v0] ✅ Created subscription record from Stripe data for user ${userId}`)
              }
            }
          } catch (error: any) {
            console.error(`[v0] ❌ Error creating subscription from Stripe:`, error.message)
          }
        }

        if (!sub) {
          console.log(`[v0] ⚠️ No subscription found in database for ${subscriptionId} and could not create it. Skipping credit grant.`)
          break
        }

        console.log(`[v0] Invoice payment succeeded for user ${sub.user_id}, product: ${sub.product_type}`)
        console.log(`[v0] Invoice ID: ${invoice.id}`)
        console.log(`[v0] Invoice amount: ${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase()}`)
        console.log(`[v0] Payment status: ${invoice.status}`)
        console.log(`[v0] Event livemode: ${event.livemode ? "PRODUCTION" : "TEST MODE"}`)
        
        // ⚠️ CRITICAL: Only grant credits if invoice payment was actually successful
        if (invoice.status !== "paid") {
          console.log(
            `[v0] ⚠️ Invoice status is '${invoice.status}', not 'paid'. Skipping credit grant.`,
          )
          break
        }
        
        // Verify payment was actually received (not just invoiced)
        if (!invoice.status_transitions?.paid_at) {
          console.log(`[v0] ⚠️ Invoice has no paid_at timestamp. Skipping credit grant.`)
          break
        }
        
        const paidAt = new Date(invoice.status_transitions.paid_at * 1000)
        console.log(`[v0] Payment confirmed at: ${paidAt.toISOString()}`)

        // Skip granting credits for test mode payments
        if (!event.livemode) {
          console.log(
            `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`,
          )
        } else {
          // Grant credits for studio membership subscriptions (Content Creator Studio or Brand Studio)
          if (
            sub.product_type === "sselfie_studio_membership" ||
            sub.product_type === "brand_studio_membership"
          ) {
            // Check if we've already granted credits for this invoice period (idempotency)
            // Use invoice.period_start to check for duplicates, not subscription period
            const invoicePeriodStart = invoice.period_start
              ? new Date(invoice.period_start * 1000)
              : null

            let shouldGrant = true
            if (invoicePeriodStart) {
              // Check if we've already granted credits for this specific invoice period
              // This prevents duplicates while allowing credits for upgrades/new subscriptions
              const recentGrants = await sql`
                SELECT COUNT(*) as count
                FROM credit_transactions
                WHERE user_id = ${sub.user_id}
                AND transaction_type = 'subscription_grant'
                AND created_at >= ${invoicePeriodStart}
                AND created_at <= NOW()
              `

              if (recentGrants[0]?.count > 0) {
                console.log(
                  `[v0] ⚠️ Credits already granted for this invoice period (${recentGrants[0].count} grant(s) found). Skipping to prevent duplicates.`,
                )
                shouldGrant = false
              }
            }

            if (shouldGrant) {
              try {
                console.log(`[v0] Granting monthly credits for ${sub.product_type} to user ${sub.user_id}`)
                console.log(`[v0] Invoice billing_reason: ${invoice.billing_reason || "N/A"}`)
                console.log(`[v0] Invoice period_start: ${invoicePeriodStart?.toISOString() || "N/A"}`)
                
                const result = await grantMonthlyCredits(
                  sub.user_id,
                  sub.product_type as "sselfie_studio_membership" | "brand_studio_membership",
                  false, // Always false for production payments
                )
                if (result.success) {
                  console.log(
                    `[v0] ✅ Monthly credits granted to user ${sub.user_id}. New balance: ${result.newBalance}`,
                  )
                } else {
                  console.error(
                    `[v0] ❌ Failed to grant monthly credits to user ${sub.user_id}: ${result.error}`,
                  )
                }
              } catch (creditError: any) {
                console.error(
                  `[v0] ❌ Error granting monthly credits to user ${sub.user_id}:`,
                  creditError.message,
                )
                console.error(`[v0] Error stack:`, creditError.stack)
                // Don't break the webhook - continue to update subscription period
              }
            }
          } else {
            console.log(`[v0] Skipping credit grant - product type is ${sub.product_type}, not studio membership`)
          }
        }

        // Update subscription period
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
        await sql`
          UPDATE subscriptions
          SET 
            status = ${subscription.status},
            current_period_start = to_timestamp(${subscription.current_period_start}),
            current_period_end = to_timestamp(${subscription.current_period_end}),
            is_test_mode = ${!event.livemode},
            updated_at = NOW()
          WHERE stripe_subscription_id = ${subscriptionId}
        `
        console.log(`[v0] Subscription period updated for ${subscriptionId}`)

        // Mark conversions in email automation sequences (for subscription renewals too)
        if (sub && sub.user_id) {
          try {
            const user = await sql`
              SELECT email FROM users WHERE id = ${sub.user_id} LIMIT 1
            `
            
            if (user && user.length > 0 && user[0].email) {
              const customerEmail = user[0].email
              
              // Mark in blueprint_subscribers
              await sql`
                UPDATE blueprint_subscribers
                SET converted_to_user = true, converted_at = NOW(), updated_at = NOW()
                WHERE email = ${customerEmail}
                AND converted_to_user = false
              `

              // Mark in welcome_back_sequence
              await sql`
                UPDATE welcome_back_sequence
                SET converted = true, converted_at = NOW(), updated_at = NOW()
                WHERE user_email = ${customerEmail}
                AND converted = false
              `

              // Mark in email_logs for tracking
              await sql`
                UPDATE email_logs
                SET converted = true, converted_at = NOW()
                WHERE user_email = ${customerEmail}
                AND converted = false
              `

              console.log(`[v0] Marked ${customerEmail} as converted in all email sequences (subscription renewal)`)
            }
          } catch (convError) {
            console.error(`[v0] Error marking conversion in sequences:`, convError)
            // Don't fail the webhook if conversion tracking fails
          }
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object

        console.log(`[v0] Subscription cancelled: ${subscription.id}`)

        // Get customer email for Flodesk sync
        let customerEmail: string | null = null
        try {
          const subRecord = await sql`
            SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id}
          `
          if (subRecord.length > 0) {
            const userRecord = await sql`
              SELECT email FROM users WHERE id = ${subRecord[0].user_id}
            `
            if (userRecord.length > 0) {
              customerEmail = userRecord[0].email
            }
          }
        } catch (emailError) {
          console.warn(`[v0] Could not get customer email for subscription cancellation:`, emailError)
        }

        await sql`
          UPDATE subscriptions
          SET status = 'cancelled', updated_at = NOW()
          WHERE stripe_subscription_id = ${subscription.id}
        `

        console.log(`[v0] ✅ Subscription ${subscription.id} marked as cancelled`)

        // Tag customer as cancelled in Flodesk
        if (customerEmail) {
          try {
            await tagFlodeskContact(customerEmail, ['cancelled'])
            console.log(`[v0] ✅ Tagged cancelled customer in Flodesk: ${customerEmail}`)
          } catch (flodeskError) {
            console.warn(`[v0] ⚠️ Flodesk sync error (non-critical):`, flodeskError)
          }
        }

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object

        if (!invoice.subscription) break

        const subscriptionId = invoice.subscription

        await sql`
          UPDATE subscriptions
          SET status = 'past_due'
          WHERE stripe_subscription_id = ${subscriptionId}
        `

        console.log(`[v0] ⚠️ Payment failed for subscription ${subscriptionId} - marked as past_due`)
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object

        const stripeStatus = sub.status // active, trialing, past_due, unpaid, canceled
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        // Get customer email for Flodesk sync
        let customerEmail: string | null = null
        try {
          const subRecord = await sql`
            SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${sub.id}
          `
          if (subRecord.length > 0) {
            const userRecord = await sql`
              SELECT email FROM users WHERE id = ${subRecord[0].user_id}
            `
            if (userRecord.length > 0) {
              customerEmail = userRecord[0].email
            }
          }
        } catch (emailError) {
          console.warn(`[v0] Could not get customer email for subscription update:`, emailError)
        }

        await sql`
          UPDATE subscriptions
          SET 
            status = ${stripeStatus},
            current_period_end = ${currentPeriodEnd}
          WHERE stripe_subscription_id = ${sub.id}
        `

        console.log(`[v0] 📝 Subscription ${sub.id} updated to status: ${stripeStatus}`)

        // Update subscription status in Flodesk custom fields
        if (customerEmail) {
          try {
            await syncContactToFlodesk({
              email: customerEmail,
              name: '', // Name not needed for update
              source: 'stripe-webhook',
              tags: [],
              customFields: {
                subscription_status: stripeStatus
              }
            })
            console.log(`[v0] ✅ Updated subscription status in Flodesk: ${customerEmail} -> ${stripeStatus}`)
          } catch (flodeskError) {
            console.warn(`[v0] ⚠️ Flodesk sync error (non-critical):`, flodeskError)
          }
        }

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
