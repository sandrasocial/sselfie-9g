// WEBHOOK-01 — Brand Strategy Pack checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 1990-2188 as of commit a5278d24).
// No behavior change.

import { randomUUID } from "crypto"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateBrandStrategySetupNotificationEmail } from "@/lib/email/templates/brand-strategy-setup-notification"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { schedulePurchaseObservation } from "./purchase-analytics"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleBrandStrategyPackCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, source } = ctx
  const userId = ctx.userId as string
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Brand strategy pack checkout completed but payment not confirmed (status: '${session.payment_status}').`
      )
    } else {
      const isTestMode = !event.livemode
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id
      const paymentIdForStorage = paymentIntentId || session.id

      let paymentAmountCents = session.amount_total || 0
      let customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null

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
            `[v0] Error retrieving payment intent for brand strategy pack:`,
            piError.message
          )
        }
      }

      const customerIdForStorage = customerId || session.id
      let paymentRecorded = false

      if (customerIdForStorage) {
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
              ${customerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'brand_strategy_pack',
              'brand_strategy_pack',
              ${"Strategy Foundation"},
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
          console.error(
            `[v0] Error storing brand strategy pack payment:`,
            paymentError.message
          )
        }
      }

      if (paymentRecorded) {
        schedulePurchaseObservation({
          eventName: "brand_strategy_pack_checkout_success",
          userId: userId ? String(userId) : null,
          source: source || "brand_strategy_paid",
          productType: "brand_strategy_pack",
          amountCents: paymentAmountCents,
          currency: "usd",
          sessionId: session.id,
          paymentId: paymentIdForStorage,
          isTestMode,
          checkoutMetadata: session.metadata,
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
          'brand_strategy_pack',
          'brand_strategy_pack',
          'active',
          ${customerId},
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'brand_strategy_pack'
            AND status = 'active'
        )
      `

      await sql`
        INSERT INTO user_tags (user_id, tag, source, metadata)
        VALUES (
          ${userId},
          'bought_brand_strategy_pack',
          ${source || "brand_strategy_paid"},
          ${JSON.stringify({
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
          })}
        )
        ON CONFLICT (user_id, tag) DO NOTHING
      `

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "brand_strategy_pack",
        sourceRef: paymentIdForStorage,
        metadata: {
          source: "stripe_webhook:brand_strategy_pack",
          stripe_session_id: session.id,
        },
      })

      // Generate setup token for the post-payment questionnaire
      const brandStrategySetupToken = randomUUID()
      try {
        await sql`
          UPDATE subscriptions
          SET setup_token = ${brandStrategySetupToken}::uuid,
              updated_at = NOW()
          WHERE user_id = ${userId}
            AND product_type = 'brand_strategy_pack'
            AND status = 'active'
        `

        if (customerEmail) {
          const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
          const setupUrl = `${productionUrl}/brand-strategy/setup/${brandStrategySetupToken}`
          const bspFirstName = getFirstNameForEmail({
            fullName: session.customer_details?.name,
            email: customerEmail,
          })
          const setupEmailContent = generateBrandStrategySetupNotificationEmail({
            firstName: bspFirstName,
            recipientEmail: customerEmail,
            setupUrl,
          })
          await sendEmail({
            from: "Maya at SSELFIE <hello@sselfie.ai>",
            to: customerEmail,
            replyTo: "hello@sselfie.ai",
            subject: setupEmailContent.subject,
            html: setupEmailContent.html,
            text: setupEmailContent.text,
            tags: ["brand-strategy-setup"],
            emailType: "brand-strategy-setup",
          })
          console.log(
            `[v0] ✅ Brand Strategy setup email sent to ${customerEmail}, setup token: ${brandStrategySetupToken}`
          )
        }
      } catch (setupErr: any) {
        console.error(
          `[v0] Error generating brand strategy setup token/email:`,
          setupErr.message
        )
      }

    }
}
