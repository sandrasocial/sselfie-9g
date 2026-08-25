// WEBHOOK-01 — Masterclass checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 2485-2691 as of commit f12bca5a).
// No behavior change.

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateMasterclassDay0DeliveryEmail } from "@/lib/email/templates/masterclass-day0-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { schedulePurchaseObservation } from "./purchase-analytics"
import { updateContactTags as updateTags } from "@/lib/resend/manage-contact"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleMasterclassCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, source } = ctx
  const userId = ctx.userId as string
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Masterclass checkout completed but payment not confirmed (status: '${session.payment_status}').`
      )
    } else {
      console.log(`[v0] 🎓 Masterclass purchase from ${customerEmail} - Payment confirmed`)

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
            `[v0] Error retrieving payment intent for masterclass:`,
            piError.message
          )
        }
      }

      const masterclassCustomerIdForStorage = customerId || session.id
      let paymentRecorded = false

      if (masterclassCustomerIdForStorage) {
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
              ${masterclassCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'masterclass',
              'masterclass',
              'Selfie Masterclass',
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
          console.error(`[v0] Error storing masterclass payment:`, paymentError.message)
        }
      }

      if (paymentRecorded) {
        schedulePurchaseObservation({
          eventName: "masterclass_checkout_success",
          userId: userId ? String(userId) : null,
          source,
          productType: "masterclass",
          amountCents: paymentAmountCents,
          currency: "usd",
          sessionId: session.id,
          paymentId: paymentIdForStorage,
          isTestMode,
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
          'masterclass',
          'masterclass',
          'active',
          ${customerId},
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'masterclass'
            AND status = 'active'
        )
      `

      await sql`
        INSERT INTO user_tags (user_id, tag, source, metadata)
        VALUES (
          ${userId},
          'bought_masterclass',
          'masterclass_purchase',
          ${JSON.stringify({
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
          })}
        )
        ON CONFLICT (user_id, tag) DO NOTHING
      `

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "masterclass",
        sourceRef: paymentIdForStorage,
        metadata: {
          source: "stripe_webhook:masterclass",
          stripe_session_id: session.id,
        },
      })

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "brand_strategy_pack",
        sourceRef: `${paymentIdForStorage}:masterclass_bundle`,
        metadata: {
          source: "stripe_webhook:masterclass_bundle",
          bundled_with: "masterclass",
          stripe_session_id: session.id,
        },
      })

      try {
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
        const courseAccessUrl = `${productionUrl}/academy/access/masterclass`
        const brandStrategyAccessUrl = `${productionUrl}/academy/access/brand-strategy`
        const passwordSetupLink = await generatePasswordSetupLinkForPurchase(
          userId,
          customerEmail!,
          "/academy/access/masterclass"
        )
        const firstName = getFirstNameForEmail({
          fullName: session.customer_details?.name,
          email: customerEmail!,
        })
        const email = generateMasterclassDay0DeliveryEmail({
          firstName,
          courseUrl: courseAccessUrl,
          brandStrategyUrl: brandStrategyAccessUrl,
          passwordSetupUrl: passwordSetupLink,
        })

        const emailResult = await sendEmail({
          to: customerEmail!,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "masterclass_delivery",
          tags: ["masterclass", "delivery"],
        })

        if (!emailResult.success) {
          console.error(
            `[v0] ❌ Failed to send Masterclass delivery email: ${emailResult.error}`
          )
        }
      } catch (emailError: any) {
        console.error(`[v0] Error sending Masterclass delivery email:`, emailError.message)
      }

      await updateTags(customerEmail!, {
        product: "masterclass",
        journey: "masterclass",
        bought_masterclass: "true",
      }).catch((tagError) => {
        console.error("[v0] Failed to update Masterclass tags:", tagError)
      })

    }
}
