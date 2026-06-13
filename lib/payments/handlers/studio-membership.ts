// WEBHOOK-01 — Studio membership subscription checkout fulfillment, extracted from
// app/api/webhooks/stripe/route.ts. No behavior change.

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import {
  generateMembershipWelcomeEmail,
  MEMBERSHIP_WELCOME_SUBJECTS,
} from "@/lib/email/templates/membership-welcome"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { getSubscriptionPeriod } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleStudioMembershipSubscriptionCheckout(
  ctx: CheckoutFulfillmentContext,
): Promise<void> {
  const {
    event,
    session,
    isPaymentPaid,
    maybeTrackCheckoutReferralSignup = async () => {},
  } = ctx

  const metadata = session.metadata || {}
  let userId = metadata.user_id
  const customerEmail = session.customer_details?.email || session.customer_email
  const productType = metadata.product_type
  const credits = Number.parseInt(metadata.credits || "250")

  if (!userId && customerEmail) {
    console.log(
      `[v0] New subscription purchase from ${customerEmail} - creating account...`
    )

    try {
      const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
      const supabaseAdmin = createAdminClient()

      console.log(`[v0] Step 1: Checking if user already exists in Supabase auth...`)

      const { data: existingUsers, error: listError } =
        await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        console.error(`[v0] Error listing users:`, listError)
      }

      const existingUser = existingUsers?.users?.find(u => u.email === customerEmail)

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
            `[v0] Subscription checkout completed. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`
          )
        } else if (!event.livemode) {
          console.log(
            `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`
          )
        } else if (!isPaymentPaid) {
          console.log(
            `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`
          )
        }

        if (session.subscription) {
          const subscriptionData = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as any
          const subscriptionPeriod = getSubscriptionPeriod(subscriptionData)

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
                current_period_start = to_timestamp(${subscriptionPeriod.start}),
                current_period_end = to_timestamp(${subscriptionPeriod.end}),
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
                to_timestamp(${subscriptionPeriod.start}),
                to_timestamp(${subscriptionPeriod.end}),
                ${!event.livemode}
              )
            `
          }

          console.log(`[v0] ✅ Subscription record created for existing user ${userId}`)
        }
      } else {
        console.log(`[v0] Step 2: Creating new user in Supabase auth (no email sent)...`)

        const { data: createData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
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

        console.log(
          `[v0] Step 3: Created Supabase auth user ${createData.user.id} for ${customerEmail}`
        )

        console.log(`[v0] Step 4: Generating password reset link...`)
        const { data: resetData, error: resetError } =
          await supabaseAdmin.auth.admin.generateLink({
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
            `[v0] Subscription checkout completed for new user. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`
          )
        } else if (!event.livemode) {
          console.log(
            `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`
          )
        } else if (!isPaymentPaid) {
          console.log(
            `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`
          )
        }

        let passwordSetupLink = resetData.properties.action_link

        if (
          passwordSetupLink.includes("localhost") ||
          passwordSetupLink.includes("supabase.co")
        ) {
          const url = new URL(passwordSetupLink)
          const token = url.searchParams.get("token")
          const type = url.searchParams.get("type") || "recovery"

          if (token) {
            passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
          }
        }

        console.log(`[v0] Step 7: Generated password setup link for ${customerEmail}`)

        const creditsGranted = credits
        const productName =
          productType === "sselfie_studio_membership" ? "STUDIO MEMBERSHIP" : "SUBSCRIPTION"
        const welcomeCustomerName = getFirstNameForEmail({
          fullName: session.customer_details?.name,
          email: customerEmail,
        })

        console.log("[v0] Generating welcome email with params:", {
          customerName: welcomeCustomerName,
          customerEmail: customerEmail,
          creditsGranted: creditsGranted,
          packageName: productName,
          passwordSetupUrl: passwordSetupLink,
        })

        const isMembershipWelcome = productType === "sselfie_studio_membership"
        const emailContent = isMembershipWelcome
          ? generateMembershipWelcomeEmail({
              variant: "new",
              customerName: session.customer_details?.name,
              customerEmail: customerEmail,
              passwordSetupUrl: passwordSetupLink,
            })
          : generateWelcomeEmail({
              customerName: welcomeCustomerName,
              customerEmail: customerEmail,
              creditsGranted: creditsGranted,
              packageName: productName,
              productType: "one_time_session",
              passwordSetupUrl: passwordSetupLink,
            })

        console.log("[v0] Email content generated:", {
          hasHtml: !!emailContent.html,
          hasText: !!emailContent.text,
          htmlLength: emailContent.html?.length || 0,
          textLength: emailContent.text?.length || 0,
        })

        console.log(`[v0] Step 8: Sending welcome email via Resend...`)
        const welcomeEmailLogType = isMembershipWelcome ? "membership_welcome" : "welcome"
        const emailResult = await sendEmail({
          to: customerEmail,
          subject: isMembershipWelcome
            ? MEMBERSHIP_WELCOME_SUBJECTS.new
            : "Welcome to SSelfie! Set up your account",
          html: emailContent.html,
          text: emailContent.text,
          tags: isMembershipWelcome
            ? ["membership-welcome", "account-setup"]
            : ["welcome", "account-setup"],
        })

        if (emailResult.success) {
          console.log(
            `[v0] Step 9: Welcome email sent successfully, message ID: ${emailResult.messageId}`
          )

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
              ${welcomeEmailLogType},
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
              ${welcomeEmailLogType},
              'failed',
              ${emailResult.error},
              NOW()
            )
          `
        }

        await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...metadata,
          user_id: userId,
          auto_created: "true",
        },
        })

        const subscription = (await stripe.subscriptions.retrieve(
          session.subscription as string
        )) as any
        await stripe.subscriptions.update(subscription.id, {
        metadata: {
          ...subscription.metadata,
          user_id: userId,
          product_type: productType,
          credits: metadata.credits,
        },
        })

        console.log(`[v0] Account created successfully for ${customerEmail}`)

        if (userId && session.subscription) {
          const subscriptionData = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as any
          const subscriptionPeriod = getSubscriptionPeriod(subscriptionData)

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
                current_period_start = to_timestamp(${subscriptionPeriod.start}),
                current_period_end = to_timestamp(${subscriptionPeriod.end}),
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
                to_timestamp(${subscriptionPeriod.start}),
                to_timestamp(${subscriptionPeriod.end}),
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
        `[v0] Subscription checkout completed. Credits will be granted when invoice.payment_succeeded fires (after payment confirmation).`
      )

      // BRIDGE-01: existing users who upgrade to membership used to get NO email at all.
      // Send the membership welcome (existing variant), idempotent via email_logs.
      if (event.livemode && isPaymentPaid && customerEmail) {
        try {
          const alreadyWelcomed = await sql`
            SELECT 1 FROM email_logs
            WHERE user_email = ${customerEmail}
              AND email_type = 'membership_welcome'
              AND status IN ('sent', 'delivered')
              AND sent_at > NOW() - INTERVAL '7 days'
            LIMIT 1
          `

          if (alreadyWelcomed.length === 0) {
            const emailContent = generateMembershipWelcomeEmail({
              variant: "existing",
              customerName: session.customer_details?.name,
              customerEmail: customerEmail,
            })

            const emailResult = await sendEmail({
              to: customerEmail,
              subject: MEMBERSHIP_WELCOME_SUBJECTS.existing,
              html: emailContent.html,
              text: emailContent.text,
              emailType: "membership_welcome",
              tags: ["membership-welcome", "upgrade"],
            })

            if (emailResult.success) {
              console.log(
                `[v0] Membership welcome (existing user) sent to ${customerEmail}, message ID: ${emailResult.messageId}`
              )
            } else {
              console.error(
                `[v0] Failed to send membership welcome (existing user) to ${customerEmail}: ${emailResult.error}`
              )
            }
          } else {
            console.log(
              `[v0] Membership welcome already sent to ${customerEmail} in the last 7 days, skipping`
            )
          }
        } catch (welcomeError: any) {
          console.error(
            `[v0] Error sending membership welcome (existing user) to ${customerEmail}:`,
            welcomeError?.message || welcomeError
          )
        }
      }
    } else if (!event.livemode) {
      console.log(
        `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`
      )
    } else if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`
      )

      if (session.subscription) {
        const subscriptionData = (await stripe.subscriptions.retrieve(
          session.subscription as string
        )) as any
        const subscriptionPeriod = getSubscriptionPeriod(subscriptionData)

        console.log(
          `[v0] Creating subscription record in database for existing user ${userId}`
        )

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
              current_period_start = to_timestamp(${subscriptionPeriod.start}),
              current_period_end = to_timestamp(${subscriptionPeriod.end}),
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
              to_timestamp(${subscriptionPeriod.start}),
              to_timestamp(${subscriptionPeriod.end}),
              ${!event.livemode}
            )
          `
        }

        console.log(
          `[v0] Subscription record created successfully for existing user ${userId}`
        )
      }
    }
  }
  try {
    await maybeTrackCheckoutReferralSignup(
      userId,
      session.metadata?.referral_code,
      `checkout.session.completed:subscription:${productType || "unknown"}`
    )
  } catch (referralError: any) {
    console.error(
      `[v0] Failed to track referral signup after subscription checkout for ${customerEmail || userId}:`,
      referralError.message
    )
  }
}
