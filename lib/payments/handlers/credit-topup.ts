// WEBHOOK-01 — Credit top-up checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 1986-2142 as of commit 84727cd9).
// No behavior change.

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { grantReferencedPurchaseCredits, shouldFulfillStripePurchaseCredits } from "@/lib/credits"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleCreditTopupCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid } = ctx
  // The dispatcher returns early (flagForReview) when userId is missing, so it is guaranteed
  // here — mirrors the monolith's control-flow narrowing. credits is parsed by the dispatcher.
  const userId = ctx.userId as string
  const credits = ctx.credits as number
  const isTestMode = !event.livemode
  console.log(
    `[v0] Credit top-up: ${credits} credits for user ${userId} (test mode: ${isTestMode})`
  )

  // Get payment intent ID
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id

  if (!paymentIntentId) {
    console.error("[v0] ⚠️ No payment intent ID found for credit top-up")
  }

  // Get actual payment amount from Stripe (for revenue tracking)
  let paymentAmountCents: number | null = null
  let customerId: string | null = null
  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      paymentAmountCents = paymentIntent.amount
      customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id || null
      console.log(`[v0] Retrieved payment amount: $${(paymentAmountCents / 100).toFixed(2)}`)
    } catch (piError: any) {
      console.error(`[v0] Error retrieving payment intent for amount:`, piError.message)
      // Fallback to session amount if available
      if (session.amount_total) {
        paymentAmountCents = session.amount_total
      }
      customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id || null
    }
  } else if (session.amount_total) {
    paymentAmountCents = session.amount_total
    customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null
  }

  // Store payment in stripe_payments table (comprehensive revenue tracking)
  if (paymentIntentId && paymentAmountCents && customerId) {
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
            ${paymentIntentId},
            ${customerId},
            ${userId},
            ${paymentAmountCents},
            'usd',
            ${isPaymentPaid ? "succeeded" : "pending"},
            'credit_topup',
            'credit_topup',
            ${`Credit top-up purchase (${credits} credits)`},
            ${JSON.stringify(session.metadata || {})},
            NOW(),
            ${isTestMode},
            NOW(),
            NOW()
          )
          ON CONFLICT (stripe_payment_id) 
          DO UPDATE SET
            status = ${isPaymentPaid ? "succeeded" : "pending"},
            updated_at = NOW()
        `
      console.log(`[v0] ✅ Stored payment in stripe_payments table`)

      // Internal funnel analytics (best-effort; never fail webhook).
      try {
        await logAnalyticsEvent({
          eventName: "purchase",
          userId: String(userId),
          properties: {
            source: "stripe_webhook",
            payment_type: "credit_topup",
            product_type: "credit_topup",
            value: paymentAmountCents / 100,
            currency: "usd",
            credits: credits ?? null,
            stripe_payment_id: paymentIntentId,
            stripe_session_id: session.id,
            offer_slug: session.metadata?.offer_slug || null,
            funnel_stage: session.metadata?.funnel_stage || null,
            attribution_source: session.metadata?.source || null,
            utm_source: session.metadata?.utm_source || null,
            utm_medium: session.metadata?.utm_medium || null,
            utm_campaign: session.metadata?.utm_campaign || null,
            campaign_id: session.metadata?.campaign_id || null,
            referral_code: session.metadata?.referral_code || null,
            is_test_mode: isTestMode,
          },
        })
      } catch {
        // ignore
      }
    } catch (paymentError: any) {
      console.error(`[v0] Error storing payment in stripe_payments:`, paymentError.message)
      // Don't fail webhook if payment storage fails
    }
  }

  if (!shouldFulfillStripePurchaseCredits(event.livemode)) {
    console.log("[v0] ⏭️ Recorded test-mode credit top-up without mutating production credits")
    return
  }

  const paymentIdForTopupCredits = paymentIntentId || session.id

  const creditResult = await grantReferencedPurchaseCredits({
    userId,
    amount: credits,
    description: `Credit top-up purchase (${credits} credits)`,
    paymentReference: paymentIdForTopupCredits,
    grantPurpose: "credit_topup",
    isTestMode,
  })
  if (!creditResult.success) {
    throw new Error(
      creditResult.error || `Failed to grant credit top-up for ${paymentIdForTopupCredits}`
    )
  }
  console.log(
    creditResult.granted
      ? `[v0] ✅ Granted top-up credits with payment ID: ${paymentIdForTopupCredits}`
      : `[v0] ⏭️ Top-up credits already granted for payment ID: ${paymentIdForTopupCredits}`
  )

  // Update to store product_type and payment amount
  if (paymentIdForTopupCredits) {
    await sql`
        UPDATE credit_transactions
        SET 
          product_type = 'credit_topup',
          payment_amount_cents = ${paymentAmountCents}
        WHERE user_id = ${userId}
          AND stripe_payment_id = ${paymentIdForTopupCredits}
          AND reference_id = 'credit_topup'
          AND (product_type IS NULL OR payment_amount_cents IS NULL)
      `
  }
}
