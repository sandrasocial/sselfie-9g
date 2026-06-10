// WEBHOOK-01 — Transform starter/top-up checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 1659-1797 as of commit e22be308).
// One documented deviation: the branch's early return NextResponse.json(...) is wrapped so
// the dispatcher forwards it (same contract as paid-blueprint). No behavior change.

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { addCredits } from "@/lib/credits"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { markEventFailed } from "@/lib/events/idempotency"
import type { CheckoutFulfillmentContext } from "../types"

export function isTransformProductType(productType: unknown): productType is "transform_starter" | "transform_topup" {
  return productType === "transform_starter" || productType === "transform_topup"
}

export async function handleTransformCheckout(ctx: CheckoutFulfillmentContext): Promise<Response | void> {
  const { event, session, isPaymentPaid, customerEmail, source } = ctx
  const userId = ctx.userId as string
  const credits = ctx.credits as number
  const productType = (ctx as CheckoutFulfillmentContext & { productType?: string }).productType
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Transform checkout completed but payment is not confirmed yet (status: '${session.payment_status}').`
      )
    } else {
      const isTestMode = !event.livemode
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id
      const paymentIdForTransform = paymentIntentId || session.id

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
          console.error(`[v0] Error retrieving payment intent for Transform:`, piError.message)
        }
      }

      const transformCustomerIdForStorage = customerId || session.id

      if (transformCustomerIdForStorage) {
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
              ${paymentIdForTransform},
              ${transformCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'transform',
              ${productType},
              ${productType === "transform_topup" ? "SSELFIE Transform top-up" : "SSELFIE Transform starter pack"},
              ${JSON.stringify(session.metadata || {})},
              NOW(),
              ${isTestMode},
              NOW(),
              NOW()
            )
            ON CONFLICT (stripe_payment_id) 
            DO UPDATE SET
              status = 'succeeded',
              amount_cents = ${paymentAmountCents},
              product_type = ${productType},
              updated_at = NOW()
          `
        } catch (paymentError: any) {
          console.error(`[v0] Error storing Transform payment:`, paymentError.message)
        }
      }

      const creditResult = await addCredits(
        userId,
        credits,
        "purchase",
        `${productType === "transform_topup" ? "Transform top-up" : "Transform starter pack"} (${credits} credits)`,
        paymentIdForTransform,
        isTestMode,
        { source: `stripe_webhook:${productType}` }
      )

      if (!creditResult.success) {
        console.error(`[v0] ❌ Failed to grant Transform credits: ${creditResult.error}`)
        await markEventFailed("stripe", event.id, new Error(`Failed to grant Transform credits: ${creditResult.error}`)).catch((statusError) => {
          console.error("[v0] Failed to mark Stripe webhook event failed:", statusError)
        })
        return NextResponse.json(
          { error: "Failed to grant Transform credits", details: creditResult.error },
          { status: 500 }
        )
      }

      await sql`
        UPDATE credit_transactions
        SET 
          product_type = ${productType},
          payment_amount_cents = ${paymentAmountCents}
        WHERE user_id = ${userId}
          AND stripe_payment_id = ${paymentIdForTransform}
          AND (product_type IS NULL OR payment_amount_cents IS NULL)
      `

      try {
        await logAnalyticsEvent({
          eventName: "purchase",
          userId: String(userId),
          properties: {
            source: "stripe_webhook",
            payment_type: "transform",
            product_type: productType,
            value: paymentAmountCents / 100,
            currency: "usd",
            credits,
            stripe_payment_id: paymentIdForTransform,
            stripe_session_id: session.id,
            offer_slug: "transform",
            buyer_stage: session.metadata?.buyer_stage || "aesthetic_editing",
            attribution_source: session.metadata?.source || null,
            is_test_mode: isTestMode,
          },
        })
      } catch {
        // ignore analytics failures
      }

      console.log(
        `[v0] ✅ Granted Transform credits (${credits}) for ${productType} with payment ID: ${paymentIdForTransform}`
      )
    }
}
