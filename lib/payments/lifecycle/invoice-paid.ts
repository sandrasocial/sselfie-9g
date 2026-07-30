// WEBHOOK-01 — invoice.paid / invoice.payment_succeeded lifecycle handler (the membership
// credit-granting money path), extracted VERBATIM from app/api/webhooks/stripe/route.ts
// (case body lines 2198-2728 as of commit ac1a70b6). One documented transform: the case's
// `break` statements became `return` (the dispatcher breaks right after the call — identical
// control flow, post-switch code still runs).

import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { addCredits, grantMonthlyCredits, SUBSCRIPTION_CREDITS } from "@/lib/credits"
import { sendEmail } from "@/lib/email/send-email"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { completeReferralForPurchase, isReferralPurchaseEligible } from "@/lib/referrals/service"
import { markRevenueEnginePurchase } from "../shared"
import { getSubscriptionPlanFromMetadata } from "@/lib/launch/cash-launch-pricing"

type SubscriptionCheckoutAttribution = {
  session_id: string | null
  user_email: string | null
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  checkout_source: string | null
  cta_keyword: string | null
  prompt_number: string | null
  entry_post_slug: string | null
  buyer_stage: string | null
}

export async function handleInvoicePaid(rawEvent: Stripe.Event): Promise<void> {
  // The dispatcher only routes invoice.paid / invoice.payment_succeeded here, so data.object
  // is an Invoice — restores the switch-case narrowing the monolith had.
  const event = rawEvent as Stripe.Event & { data: { object: any } }
  const invoice = event.data.object

  // Stripe API 2025-03+ (Basil/Clover) removed invoice.subscription — it now lives at
  // invoice.parent.subscription_details.subscription. Read both shapes or every renewal
  // gets skipped (this silently dropped all subscription revenue rows from 2026-05-20
  // until the 2026-06-12 fix).
  const rawSubscription = invoice.subscription ?? invoice.parent?.subscription_details?.subscription

  if (!rawSubscription) {
    console.log("[v0] Invoice payment succeeded but no subscription - skipping")
    return
  }

  const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id

  if (!subscriptionId) {
    console.log("[v0] Invoice has no subscription ID - skipping")
    return
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
  if (!sub) {
    console.log(`[v0] ⚠️ Subscription not found in database, retrieving from Stripe...`)
    try {
      const subscription =
        typeof rawSubscription === "string"
          ? await stripe.subscriptions.retrieve(rawSubscription)
          : rawSubscription

      // Look up user by customer email or ID
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id
      const customer = await stripe.customers.retrieve(customerId)

      if (customer && !customer.deleted && customer.email) {
        const users = await sql`
          SELECT id FROM users WHERE email = ${customer.email} LIMIT 1
        `

        if (users.length > 0) {
          const userId = users[0].id
          const rawProductType = subscription.metadata.product_type || "sselfie_studio_membership"
          const productType =
            rawProductType === "sselfie_studio_membership_annual"
              ? "sselfie_studio_membership"
              : rawProductType
          const subscriptionPlan = getSubscriptionPlanFromMetadata(
            subscription.metadata,
            productType
          )

          // Billing period on Stripe API 2025-03+ lives at items.data[].current_period_*.
          const periodStart =
            subscription.current_period_start ??
            subscription.items?.data?.[0]?.current_period_start ??
            null
          const periodEnd =
            subscription.current_period_end ??
            subscription.items?.data?.[0]?.current_period_end ??
            null

          // Create subscription record
          await sql`
            INSERT INTO subscriptions (
              user_id, product_type, plan, status,
              stripe_subscription_id, stripe_customer_id,
              current_period_start, current_period_end,
              is_test_mode
            )
            VALUES (
              ${userId}, ${productType}, ${subscriptionPlan}, ${subscription.status},
              ${subscription.id}, ${customerId},
              to_timestamp(${periodStart}),
              to_timestamp(${periodEnd}),
              ${!event.livemode}
            )
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
              status = ${subscription.status},
              current_period_start = to_timestamp(${periodStart}),
              current_period_end = to_timestamp(${periodEnd}),
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
    // Brand-new buyers race this event: checkout.session.completed creates the user and
    // subscription rows a few seconds AFTER the first invoice's payment event arrives, so the
    // lookups above find nothing. Throw so the webhook returns 500 and Stripe redelivers once
    // fulfillment has created those rows (failed events are re-claimable in lib/events).
    // Silently skipping here dropped the 2026-07-02 697 EUR founding-annual payment from
    // stripe_payments and left the buyer without webhook-granted credits.
    const invoiceAgeMs = Date.now() - (invoice.created || 0) * 1000
    const isFreshFirstPayment =
      invoice.billing_reason === "subscription_create" && invoiceAgeMs < 48 * 60 * 60 * 1000
    if (isFreshFirstPayment) {
      throw new Error(
        `Subscription ${subscriptionId} not in database yet for fresh subscription_create invoice ${invoice.id} - failing so Stripe retries after checkout fulfillment`
      )
    }
    console.log(
      `[v0] ⚠️ No subscription found in database for ${subscriptionId} and could not create it. Skipping credit grant.`
    )
    return
  }

  console.log(
    `[v0] Invoice payment succeeded for user ${sub.user_id}, product: ${sub.product_type}`
  )
  console.log(`[v0] Invoice ID: ${invoice.id}`)
  console.log(
    `[v0] Invoice amount: ${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase()}`
  )
  console.log(`[v0] Payment status: ${invoice.status}`)
  console.log(`[v0] Event livemode: ${event.livemode ? "PRODUCTION" : "TEST MODE"}`)

  // Store subscription payment in stripe_payments table (comprehensive revenue tracking)
  const isTestMode = !event.livemode
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null
  // Key invoice-based revenue rows on the invoice id, always. On the pinned Clover API
  // version invoices no longer carry top-level charge/payment_intent fields, so the old
  // `chargeId || paymentIntentId || invoice.id` fallback already resolved to invoice.id
  // on every live event — but if Stripe ever reintroduces those fields, a key flip
  // (ch_/pi_ vs in_) would record the same charge twice under different ids. That exact
  // duplication existed in stripe_payments (23 rows cleaned 2026-07-06) via backfills.
  // One invoice = one row, keyed in_..., enforced by idx_stripe_payments_invoice_unique.
  const paymentId = invoice.id

  let checkoutAttribution: SubscriptionCheckoutAttribution | null = null
  try {
    const rows = (await sql`
      SELECT
        session_id,
        user_email,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        checkout_source,
        cta_keyword,
        prompt_number,
        entry_post_slug,
        buyer_stage
      FROM checkout_attribution
      WHERE stripe_subscription_id = ${subscriptionId}
      ORDER BY created_at ASC
      LIMIT 1
    `) as SubscriptionCheckoutAttribution[]
    checkoutAttribution = rows[0] || null
  } catch (attributionLookupError: unknown) {
    const message =
      attributionLookupError instanceof Error
        ? attributionLookupError.message
        : String(attributionLookupError)
    console.warn(
      `[v0] Could not resolve original checkout attribution for ${subscriptionId}:`,
      message
    )
  }

  const revenueMetadata = {
    ...(invoice.metadata || {}),
    billing_reason: invoice.billing_reason || null,
  }

  if (paymentId && customerId && invoice.amount_paid > 0) {
    try {
      await sql`
        INSERT INTO stripe_payments (
          stripe_payment_id,
          stripe_invoice_id,
          stripe_subscription_id,
          stripe_customer_id,
          user_id,
          customer_email,
          checkout_session_id,
          source,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          checkout_source,
          cta_keyword,
          prompt_number,
          entry_post_slug,
          buyer_stage,
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
          ${paymentId},
          ${invoice.id},
          ${subscriptionId},
          ${customerId},
          ${sub.user_id},
          ${checkoutAttribution?.user_email || null},
          ${checkoutAttribution?.session_id || null},
          ${checkoutAttribution?.source || null},
          ${checkoutAttribution?.utm_source || null},
          ${checkoutAttribution?.utm_medium || null},
          ${checkoutAttribution?.utm_campaign || null},
          ${checkoutAttribution?.utm_content || null},
          ${checkoutAttribution?.checkout_source || null},
          ${checkoutAttribution?.cta_keyword || null},
          ${checkoutAttribution?.prompt_number || null},
          ${checkoutAttribution?.entry_post_slug || null},
          ${checkoutAttribution?.buyer_stage || null},
          ${invoice.amount_paid},
          ${invoice.currency || "usd"},
          ${invoice.status || "succeeded"},
          'subscription',
          ${sub.product_type},
          ${invoice.description || `Subscription payment - ${sub.product_type}`},
          ${JSON.stringify(revenueMetadata)},
          to_timestamp(${invoice.created}),
          ${isTestMode},
          NOW(),
          NOW()
        )
        ON CONFLICT (stripe_payment_id) 
        DO UPDATE SET
          status = ${invoice.status || "succeeded"},
          amount_cents = ${invoice.amount_paid},
          customer_email = COALESCE(stripe_payments.customer_email, EXCLUDED.customer_email),
          checkout_session_id = COALESCE(stripe_payments.checkout_session_id, EXCLUDED.checkout_session_id),
          source = COALESCE(stripe_payments.source, EXCLUDED.source),
          utm_source = COALESCE(stripe_payments.utm_source, EXCLUDED.utm_source),
          utm_medium = COALESCE(stripe_payments.utm_medium, EXCLUDED.utm_medium),
          utm_campaign = COALESCE(stripe_payments.utm_campaign, EXCLUDED.utm_campaign),
          utm_content = COALESCE(stripe_payments.utm_content, EXCLUDED.utm_content),
          checkout_source = COALESCE(stripe_payments.checkout_source, EXCLUDED.checkout_source),
          cta_keyword = COALESCE(stripe_payments.cta_keyword, EXCLUDED.cta_keyword),
          prompt_number = COALESCE(stripe_payments.prompt_number, EXCLUDED.prompt_number),
          entry_post_slug = COALESCE(stripe_payments.entry_post_slug, EXCLUDED.entry_post_slug),
          buyer_stage = COALESCE(stripe_payments.buyer_stage, EXCLUDED.buyer_stage),
          metadata = CASE
            WHEN COALESCE(stripe_payments.metadata, '{}'::jsonb) ? 'payment_recovery'
              THEN jsonb_set(
                COALESCE(stripe_payments.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                '{payment_recovery,recovered_at}',
                COALESCE(
                  stripe_payments.metadata #> '{payment_recovery,recovered_at}',
                  to_jsonb(NOW())
                ),
                TRUE
              )
            ELSE COALESCE(stripe_payments.metadata, '{}'::jsonb) || EXCLUDED.metadata
          END,
          updated_at = NOW()
      `
      console.log(
        `[v0] ✅ Stored subscription payment in stripe_payments table: $${(invoice.amount_paid / 100).toFixed(2)}`
      )

      // Internal funnel analytics (best-effort; never fail webhook).
      try {
        await logAnalyticsEvent({
          eventName: "purchase",
          userId: sub?.user_id ? String(sub.user_id) : null,
          properties: {
            source: "stripe_webhook",
            payment_type: "subscription",
            product_type: sub?.product_type || null,
            value: invoice.amount_paid / 100,
            currency: (invoice.currency || "usd").toLowerCase(),
            stripe_payment_id: paymentId,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            offer_slug:
              sub?.product_type === "sselfie_studio_membership"
                ? "sselfie-studio-membership"
                : null,
            funnel_stage: "studio_membership",
            is_test_mode: isTestMode,
          },
        })
      } catch {
        // ignore
      }
    } catch (paymentError: any) {
      console.error(
        `[v0] Error storing subscription payment in stripe_payments:`,
        paymentError.message
      )
      // Don't fail webhook if payment storage fails
    }
  }

  // ⚠️ CRITICAL: Only grant credits if invoice payment was actually successful
  if (invoice.status !== "paid") {
    console.log(`[v0] ⚠️ Invoice status is '${invoice.status}', not 'paid'. Skipping credit grant.`)
    return
  }

  // Verify payment was actually received (not just invoiced)
  if (!invoice.status_transitions?.paid_at) {
    console.log(`[v0] ⚠️ Invoice has no paid_at timestamp. Skipping credit grant.`)
    return
  }

  const paidAt = new Date(invoice.status_transitions.paid_at * 1000)
  console.log(`[v0] Payment confirmed at: ${paidAt.toISOString()}`)

  try {
    await markRevenueEnginePurchase({
      stripeSubscriptionId: subscriptionId,
      userId: sub?.user_id ? String(sub.user_id) : null,
      userEmail: sub?.email || null,
      stripeCustomerId:
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null,
      stripePaymentId: paymentId,
      stripeInvoiceId: invoice.id,
      purchaseValueCents: invoice.amount_paid ?? null,
      purchaseCurrency: typeof invoice.currency === "string" ? invoice.currency : null,
      purchasedAt: paidAt,
    })
  } catch (attributionError: any) {
    console.error(
      `[v0] Failed to persist revenue engine attribution after subscription payment:`,
      attributionError.message
    )
  }

  if (isReferralPurchaseEligible(invoice.amount_paid)) {
    try {
      const referralResult = await completeReferralForPurchase({
        referredUserId: String(sub.user_id),
        paymentSource: "stripe_webhook:subscription",
        isTestMode,
      })
      console.log(
        `[v0] Referral completion result after subscription payment:`,
        referralResult.status
      )
    } catch (referralError: any) {
      console.error(
        `[v0] Failed to complete referral after subscription payment:`,
        referralError.message
      )
    }
  } else {
    console.log(
      `[v0] Skipping referral completion for invoice ${invoice.id}: amount_paid=${invoice.amount_paid}`
    )
  }

  // Skip granting credits for test mode payments
  if (!event.livemode) {
    console.log(
      `[v0] ⚠️ Skipping credit grant - this is a TEST MODE payment. Credits are only granted for real (production) payments.`
    )
  } else {
    // Grant credits for recurring tiers with a monthly credit allowance
    if (sub.product_type === "sselfie_studio_membership" || sub.product_type === "vault_maya") {
      // FIX B5: Payment-level idempotency using invoice ID
      // Check if we've already granted credits for THIS SPECIFIC INVOICE
      const invoiceId = invoice.id
      const invoicePeriodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : null
      const invoicePeriodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : null

      let shouldGrant = true

      // Check 1: Have we already processed THIS invoice ID?
      const existingGrant = await sql`
        SELECT id, amount, created_at
        FROM credit_transactions
        WHERE user_id = ${sub.user_id}
        AND transaction_type = 'subscription_grant'
        AND stripe_payment_id = ${invoiceId}
        LIMIT 1
      `

      if (existingGrant.length > 0) {
        console.log(
          `[v0] ⏭️ Credits already granted for invoice ${invoiceId} on ${existingGrant[0].created_at}. Skipping (invoice-level idempotency).`
        )
        shouldGrant = false
      } else if (invoicePeriodStart) {
        // Check 2: Have we already granted credits for this billing period?
        // This is a fallback check for invoices that may not have the stripe_payment_id set
        const periodGrants = await sql`
          SELECT COUNT(*) as count
          FROM credit_transactions
          WHERE user_id = ${sub.user_id}
          AND transaction_type = 'subscription_grant'
          AND created_at >= ${invoicePeriodStart}
          AND created_at <= NOW()
        `

        if (periodGrants[0]?.count > 0) {
          console.log(
            `[v0] ⚠️ Credits already granted for billing period starting ${invoicePeriodStart.toISOString()} (${periodGrants[0].count} grant(s) found). Skipping to prevent duplicates.`
          )
          shouldGrant = false
        }
      }

      if (shouldGrant) {
        try {
          console.log(
            `[v0] Granting monthly credits for ${sub.product_type} to user ${sub.user_id}`
          )
          console.log(`[v0] Invoice billing_reason: ${invoice.billing_reason || "N/A"}`)
          console.log(`[v0] Invoice period_start: ${invoicePeriodStart?.toISOString() || "N/A"}`)

          const result = await grantMonthlyCredits(
            sub.user_id,
            sub.product_type === "vault_maya" ? "vault_maya" : "sselfie_studio_membership",
            false, // Always false for production payments
            invoiceId
          )
          if (result.success) {
            console.log(
              `[v0] ✅ Monthly credits granted to user ${sub.user_id}. New balance: ${result.newBalance}`
            )

            // Optional one-time welcome bonus from checkout metadata (e.g. ?bonus=4credits).
            // Only grant on the first paid invoice for a new subscription.
            if (invoice.billing_reason === "subscription_create") {
              try {
                const stripeSubscription = (await stripe.subscriptions.retrieve(
                  subscriptionId
                )) as any
                const bonusCredits = Number.parseInt(
                  String(stripeSubscription?.metadata?.bonus_credits || "0"),
                  10
                )

                if (bonusCredits > 0) {
                  const existingBonusGrant = await sql`
                    SELECT id
                    FROM credit_transactions
                    WHERE user_id = ${sub.user_id}
                      AND transaction_type = 'bonus'
                      AND stripe_payment_id = ${invoiceId}
                    LIMIT 1
                  `

                  if (existingBonusGrant.length === 0) {
                    const bonusResult = await addCredits(
                      sub.user_id,
                      bonusCredits,
                      "bonus",
                      `Selfie Guide membership bonus (${bonusCredits} credits)`,
                      invoiceId,
                      false,
                      { source: "stripe_webhook:selfie_guide_bonus" }
                    )

                    if (bonusResult.success) {
                      console.log(
                        `[v0] ✅ Granted one-time checkout bonus (${bonusCredits} credits) for invoice ${invoiceId}`
                      )
                    } else {
                      console.error(
                        `[v0] ❌ Failed to grant one-time checkout bonus for invoice ${invoiceId}: ${bonusResult.error}`
                      )
                    }
                  } else {
                    console.log(
                      `[v0] ⏭️ Bonus credits already granted for invoice ${invoiceId}; skipping duplicate bonus grant.`
                    )
                  }
                }
              } catch (bonusError: any) {
                console.error(
                  `[v0] ⚠️ Failed applying optional checkout bonus credits for invoice ${invoiceId}:`,
                  bonusError.message
                )
              }
            }

            // Send credit renewal notification email
            try {
              const userRecord = await sql`
                SELECT email, display_name FROM users WHERE id = ${sub.user_id} LIMIT 1
              `
              if (userRecord.length > 0 && userRecord[0].email) {
                const { generateCreditRenewalEmail } =
                  await import("@/lib/email/templates/credit-renewal")
                const emailContent = generateCreditRenewalEmail({
                  firstName: userRecord[0].display_name?.split(" ")[0] || undefined,
                  creditsGranted:
                    sub.product_type === "vault_maya"
                      ? SUBSCRIPTION_CREDITS.vault_maya
                      : SUBSCRIPTION_CREDITS.sselfie_studio_membership,
                })

                const emailResult = await sendEmail({
                  to: userRecord[0].email,
                  subject: emailContent.subject,
                  html: emailContent.html,
                  text: emailContent.text,
                  from: "Sandra from SSELFIE <hello@sselfie.ai>",
                  emailType: "credit-renewal",
                })

                if (emailResult.success) {
                  console.log(`[v0] ✅ Credit renewal email sent to ${userRecord[0].email}`)
                } else {
                  console.error(`[v0] ⚠️ Failed to send credit renewal email: ${emailResult.error}`)
                }
              }
            } catch (emailError: any) {
              console.error(
                `[v0] ⚠️ Error sending credit renewal email (non-critical):`,
                emailError.message
              )
              // Don't fail webhook if email send fails
            }
          } else {
            throw new Error(
              result.error ||
                `Failed to grant monthly credits to user ${sub.user_id} for invoice ${invoiceId}`
            )
          }
        } catch (creditError: any) {
          console.error(
            `[v0] ❌ Error granting monthly credits to user ${sub.user_id}:`,
            creditError.message
          )
          console.error(`[v0] Error stack:`, creditError.stack)
          // Revenue storage and the credit reset are invoice-idempotent. Fail the webhook so
          // Stripe retries instead of acknowledging a paid invoice without customer credits.
          throw creditError
        }
      }
    } else {
      console.log(
        `[v0] Skipping credit grant - product type is ${sub.product_type}, not studio membership`
      )
    }
  }

  // Update subscription period. On Stripe API 2025-03+ the billing period lives at
  // subscription.items.data[].current_period_* (top-level fields are gone).
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any
  const renewedPeriodStart =
    subscription.current_period_start ?? subscription.items?.data?.[0]?.current_period_start ?? null
  const renewedPeriodEnd =
    subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? null
  await sql`
    UPDATE subscriptions
    SET
      status = ${subscription.status},
      current_period_start = to_timestamp(${renewedPeriodStart}),
      current_period_end = to_timestamp(${renewedPeriodEnd}),
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

        console.log(
          `[v0] Marked ${customerEmail} as converted in all email sequences (subscription renewal)`
        )
      }
    } catch (convError) {
      console.error(`[v0] Error marking conversion in sequences:`, convError)
      // Don't fail the webhook if conversion tracking fails
    }
  }

  return
}
