// WEBHOOK-01 — Starter Kit checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 2894-3109 as of commit 9417eb65).
// No behavior change.

import { randomUUID } from "crypto"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateStarterKitDay0DeliveryEmail } from "@/lib/email/templates/starter-kit-day0-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { updateContactTags as updateTags } from "@/lib/resend/manage-contact"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function upsertStarterKitSubscriber(email: string, name?: string | null) {
  const resolvedName = (name || email.split("@")[0] || "Starter Kit buyer").trim()
  const existingSubscriber = await sql`
    SELECT id, access_token, email_tags
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  const existing = existingSubscriber[0] as
    | { id: number; access_token?: string | null; email_tags?: string[] | null }
    | undefined
  const accessToken = existing?.access_token?.trim() || randomUUID()
  const tags = new Set(Array.isArray(existing?.email_tags) ? existing.email_tags : [])
  tags.add("purchased")
  tags.add("customer")
  tags.add("starter-kit-paid")
  const normalizedTags = Array.from(tags)

  if (existing) {
    await sql`
      UPDATE freebie_subscribers
      SET
        name = COALESCE(NULLIF(${resolvedName}, ''), name),
        source = 'starter-kit-paid',
        access_token = ${accessToken},
        email_tags = ${normalizedTags}::text[],
        converted_to_user = TRUE,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `

    return { subscriberId: existing.id, accessToken }
  }

  const inserted = await sql`
    INSERT INTO freebie_subscribers (
      email,
      name,
      source,
      access_token,
      email_tags,
      converted_to_user,
      converted_at,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${resolvedName},
      'starter-kit-paid',
      ${accessToken},
      ${normalizedTags}::text[],
      TRUE,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id
  `

  return { subscriberId: inserted[0].id as number, accessToken }
}

export async function handleStarterKitCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, source } = ctx
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Starter Kit checkout completed but payment not confirmed (status: '${session.payment_status}').`
      )
    } else {
      console.log(`[v0] 📦 Starter Kit purchase from ${customerEmail} - Payment confirmed`)

      const isTestMode = !event.livemode
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id
      const paymentIdForStorage = paymentIntentId || session.id
      let customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null
      let paymentAmountCents = session.amount_total || 0

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          paymentAmountCents = paymentIntent.amount || paymentAmountCents
          customerId =
            typeof paymentIntent.customer === "string"
              ? paymentIntent.customer
              : paymentIntent.customer?.id || customerId
        } catch (piError: any) {
          console.error(
            `[v0] Error retrieving payment intent for starter kit:`,
            piError.message
          )
        }
      }

      const starterKitCustomerIdForStorage = customerId || session.id
      let paymentRecorded = false

      if (starterKitCustomerIdForStorage) {
        try {
          await sql`
            INSERT INTO stripe_payments (
              stripe_payment_id,
              stripe_customer_id,
              user_id,
              amount_cents,
              currency,
              status,
              payment_type,
              product_type,
              description,
              metadata,
              payment_date,
              is_test_mode,
              created_at,
              updated_at
            )
            VALUES (
              ${paymentIdForStorage},
              ${starterKitCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'starter_kit',
              'starter_kit',
              'Selfie Starter Kit',
              ${JSON.stringify(session.metadata || {})},
              NOW(),
              ${isTestMode},
              NOW(),
              NOW()
            )
            ON CONFLICT (stripe_payment_id)
            DO UPDATE SET
              status = 'succeeded',
              updated_at = NOW()
          `
          paymentRecorded = true
        } catch (paymentError: any) {
          console.error(`[v0] Error storing starter kit payment:`, paymentError.message)
        }
      }

      if (paymentRecorded) {
        await logAnalyticsEvent({
          eventName: "starter_kit_checkout_success",
          userId: userId ? String(userId) : null,
          properties: {
            source: source || "landing_page",
            product_type: "starter_kit",
            value: paymentAmountCents / 100,
            currency: "usd",
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
            is_test_mode: isTestMode,
          },
        })
      }

      await sql`
        INSERT INTO subscriptions (
          user_id,
          product_type,
          plan,
          status,
          stripe_customer_id,
          created_at,
          updated_at
        )
        SELECT
          ${userId},
          'starter_kit',
          'starter_kit',
          'active',
          ${customerId},
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'starter_kit'
            AND status = 'active'
        )
      `

      await sql`
        INSERT INTO user_tags (user_id, tag, source, metadata)
        VALUES (
          ${userId},
          'bought_starter_kit',
          'starter_kit_purchase',
          ${JSON.stringify({
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
          })}
        )
        ON CONFLICT (user_id, tag) DO NOTHING
      `

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "starter_kit",
        sourceRef: paymentIdForStorage,
        metadata: {
          source: "stripe_webhook:starter_kit",
          stripe_session_id: session.id,
        },
      })

      try {
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
        const presetPackUrl = process.env.STARTER_KIT_PRESET_DOWNLOAD_URL || undefined
        const subscriberRecord = await upsertStarterKitSubscriber(
          customerEmail!,
          session.customer_details?.name
        )
        const fallbackAccessUrl = `${productionUrl}/access/starter-kit/${subscriberRecord.accessToken}`
        const libraryAccessUrl = `${productionUrl}/academy/access/starter-kit`
        const passwordSetupLink = await generatePasswordSetupLinkForPurchase(
          userId,
          customerEmail!,
          "/academy/access/starter-kit"
        )
        const firstName = getFirstNameForEmail({
          fullName: session.customer_details?.name,
          email: customerEmail!,
        })
        const email = generateStarterKitDay0DeliveryEmail({
          firstName,
          recipientEmail: customerEmail!,
          accessUrl: libraryAccessUrl,
          fallbackUrl: fallbackAccessUrl,
          passwordSetupUrl: passwordSetupLink,
          presetDownloadUrl: presetPackUrl,
        })

        const emailResult = await sendEmail({
          to: customerEmail!,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "starter_kit_delivery",
          tags: ["starter-kit", "delivery"],
        })

        if (emailResult.success) {
          console.log(
            `[v0] ✅ Starter Kit delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`
          )
          await sql`
            UPDATE freebie_subscribers
            SET guide_access_email_sent = TRUE,
                guide_access_email_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${subscriberRecord.subscriberId}
          `
        } else {
          console.error(
            `[v0] ❌ Failed to send Starter Kit delivery email: ${emailResult.error}`
          )
        }
      } catch (emailError: any) {
        console.error(`[v0] Error sending Starter Kit delivery email:`, emailError.message)
      }

      await updateTags(customerEmail!, {
        product: "starter-kit",
        journey: "starter_kit",
        bought_starter_kit: "true",
      }).catch((tagError) => {
        console.error("[v0] Failed to update Starter Kit tags:", tagError)
      })

    }
}
