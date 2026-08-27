// WEBHOOK-01 — One-time session (legacy) checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 1656-1851 as of commit 7da2568b).
// No behavior change.

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { grantOneTimeSessionCredits, shouldFulfillStripePurchaseCredits } from "@/lib/credits"
import { hasStudioMembership } from "@/lib/subscription"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { addContactToSegment } from "@/lib/resend/manage-contact"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleOneTimeSessionCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, source } = ctx
  const userId = ctx.userId as string
  const credits = ctx.credits as number
  console.log(`[v0] One-time session purchase for user ${userId} (test mode: ${!event.livemode})`)

  // Get payment intent ID from session
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id

  if (!paymentIntentId) {
    console.error("[v0] ⚠️ No payment intent ID found for one-time session")
  }

  const isTestMode = !event.livemode

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
            'one_time_session',
            'one_time_session',
            ${`One-time session purchase`},
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
          idempotencyKey: `purchase:${paymentIntentId || session.id}`,
          userId: String(userId),
          properties: {
            source: "stripe_webhook",
            payment_type: "one_time_session",
            product_type: "one_time_session",
            value: paymentAmountCents / 100,
            currency: "usd",
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
    console.log("[v0] ⏭️ Recorded test-mode one-time session without mutating production credits")
    return
  }

  const paymentIdForSessionCredits = paymentIntentId || session.id

  const creditResult = await grantOneTimeSessionCredits(
    userId,
    paymentIdForSessionCredits,
    isTestMode,
    {
      source: "stripe_webhook:one_time_session",
    }
  )
  if (!creditResult.success) {
    throw new Error(
      creditResult.error ||
        `Failed to grant one-time session credits for ${paymentIdForSessionCredits}`
    )
  }
  console.log(
    creditResult.granted
      ? `[v0] ✅ Granted one-time session credits with payment ID: ${paymentIdForSessionCredits}`
      : `[v0] ⏭️ One-time session credits already granted for payment ID: ${paymentIdForSessionCredits}`
  )

  // Update the credit_transaction record to store product_type and payment amount
  if (paymentIdForSessionCredits) {
    await sql`
        UPDATE credit_transactions
        SET 
          product_type = 'one_time_session',
          payment_amount_cents = ${paymentAmountCents}
        WHERE user_id = ${userId}
          AND stripe_payment_id = ${paymentIdForSessionCredits}
          AND reference_id = 'one_time_session'
          AND (product_type IS NULL OR payment_amount_cents IS NULL)
      `
  }

  // 🎯 AUTOMATION: Add to "Instagram Photoshoot Buyers" segment if not a Studio member
  // This segment is for one-time buyers who haven't upgraded to membership
  if (process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID && customerEmail) {
    try {
      console.log(`[v0] Checking if user ${userId} has Studio membership for segment automation...`)
      const hasActiveMembership = await hasStudioMembership(userId)

      if (!hasActiveMembership) {
        console.log(
          `[v0] ✅ User ${userId} does NOT have Studio membership - adding to Instagram Photoshoot Buyers segment`
        )
        const segmentResult = await addContactToSegment(
          customerEmail,
          process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID
        )

        if (segmentResult.success) {
          console.log(`[v0] ✅ Added ${customerEmail} to Instagram Photoshoot Buyers segment`)
        } else {
          console.error(
            `[v0] ⚠️ Failed to add to Photoshoot Buyers segment: ${segmentResult.error}`
          )
        }
      } else {
        console.log(
          `[v0] ⏭️ User ${userId} has active Studio membership - skipping Photoshoot Buyers segment (excluded)`
        )
      }
    } catch (segmentError) {
      console.error(`[v0] ⚠️ Error in Photoshoot Buyers segment automation:`, segmentError)
      // Don't fail the webhook if segment addition fails
    }
  } else if (!process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID) {
    console.log(
      `[v0] ℹ️ RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID not configured - skipping segment automation`
    )
  }
}
