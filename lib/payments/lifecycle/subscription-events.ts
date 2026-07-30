// WEBHOOK-01 — subscription lifecycle handlers (created / deleted / payment_failed /
// updated), extracted VERBATIM from app/api/webhooks/stripe/route.ts (as of commit dca0379a).
// One documented transform per case: `break` -> `return` (the dispatcher breaks right after
// each call — identical control flow).

import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generatePaymentFailedEmail } from "@/lib/email/templates/payment-failed"
import { getSubscriptionCoupon } from "@/lib/revenue/subscription-amount"
import { getSubscriptionPeriod } from "@/lib/payments/shared"
import { getSubscriptionPlanFromMetadata } from "@/lib/launch/cash-launch-pricing"
import { upsertStudioMembershipSubscription } from "@/lib/payments/lifecycle/upsert-studio-membership"
import { signBillingRecoveryToken } from "@/lib/payments/billing-recovery-token"

/**
 * Resolve a subscription's coupon for DB documentation (e.g. lifetime BETA 50%).
 * Webhook payloads on newer Stripe API versions carry `discounts` as ID strings,
 * so when a discount exists but isn't expanded we re-fetch with expansion —
 * never write null over a real discount just because the payload was thin.
 */
async function resolveSubscriptionDiscount(
  sub: any
): Promise<{ percent: number | null; coupon: string | null } | null> {
  const toResult = (coupon: any) =>
    coupon
      ? {
          percent: coupon.percent_off ?? null,
          coupon: coupon.name || coupon.id || null,
        }
      : null

  const direct = toResult(getSubscriptionCoupon(sub))
  if (direct) return direct

  // Webhook payloads carry discounts as IDs (or with unexpanded coupon IDs);
  // when any discount exists but no coupon object is readable, re-fetch expanded.
  const hasUnreadableDiscount =
    (Array.isArray(sub?.discounts) && sub.discounts.length > 0) ||
    (sub?.discount && !sub.discount.coupon)
  if (hasUnreadableDiscount && sub?.id) {
    try {
      const fresh = await stripe.subscriptions.retrieve(sub.id, {
        expand: ["discounts.source.coupon"],
      })
      const resolved = toResult(getSubscriptionCoupon(fresh))
      if (resolved) return resolved
    } catch (error: any) {
      console.error("[v0] Failed to expand subscription discount:", error?.message)
      // Unknown — caller must preserve whatever the DB already documents.
      return null
    }
  }

  return { percent: null, coupon: null }
}

/** Current documented discount for a subscription row (fallback when Stripe is unreachable). */
async function currentDocumentedDiscount(
  stripeSubscriptionId: string
): Promise<{ percent: number | null; coupon: string | null }> {
  const [row] = await sql`
    SELECT discount_percent, discount_coupon
    FROM subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `
  return {
    percent: row?.discount_percent != null ? Number(row.discount_percent) : null,
    coupon: row?.discount_coupon || null,
  }
}

export async function handleSubscriptionCreated(rawEvent: Stripe.Event): Promise<void> {
  const event = rawEvent as Stripe.Event & { data: { object: any } }
  const subscription = event.data.object
  let userId = subscription.metadata.user_id
  const rawProductType = subscription.metadata.product_type || "sselfie_studio_membership"
  const productType =
    rawProductType === "sselfie_studio_membership_annual"
      ? "sselfie_studio_membership"
      : rawProductType
  const subscriptionPlan = getSubscriptionPlanFromMetadata(subscription.metadata, productType)
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
    return
  }

  console.log(`[v0] Subscription created: ${productType} for user ${userId}`)
  console.log(`[v0] Event livemode: ${event.livemode ? "PRODUCTION" : "TEST MODE"}`)

  // ⚠️ IMPORTANT: Do NOT grant credits here!
  // subscription.created fires BEFORE payment is confirmed.
  // Credits should ONLY be granted when:
  // 1. invoice.payment_succeeded (for monthly renewals and first payment)
  // 2. checkout.session.completed with payment_status === 'paid' (for initial subscription)
  console.log(
    `[v0] Subscription record created. Credits will be granted when payment is confirmed via invoice.payment_succeeded`
  )

  // Persist coupon state so the DB documents what each member actually pays
  // (e.g. lifetime BETA 50%).
  const resolvedDiscount =
    (await resolveSubscriptionDiscount(subscription)) ??
    (await currentDocumentedDiscount(subscription.id))
  const discountPercent = resolvedDiscount.percent
  const discountCoupon = resolvedDiscount.coupon

  const createdPeriod = getSubscriptionPeriod(subscription)
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
  if (!stripeCustomerId) {
    throw new Error(`Subscription ${subscription.id} has no Stripe customer`)
  }

  await upsertStudioMembershipSubscription({
    userId,
    productType: productType === "vault_maya" ? "vault_maya" : "sselfie_studio_membership",
    plan: subscriptionPlan,
    status: subscription.status,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
    periodStart: createdPeriod.start,
    periodEnd: createdPeriod.end,
    isTestMode: !event.livemode,
    discount: {
      percent: discountPercent,
      coupon: discountCoupon,
    },
  })

  return
}

export async function handleSubscriptionDeleted(rawEvent: Stripe.Event): Promise<void> {
  const event = rawEvent as Stripe.Event & { data: { object: any } }
  const subscription = event.data.object

  console.log(`[v0] Subscription cancelled: ${subscription.id}`)

  await sql`
    UPDATE subscriptions
    SET status = 'canceled', updated_at = NOW()
    WHERE stripe_subscription_id = ${subscription.id}
  `

  console.log(`[v0] ✅ Subscription ${subscription.id} marked as canceled`)

  // WIN-BACK SEQUENCE: Handled automatically by the daily cron at
  // /api/cron/win-back-sequence (runs 10 AM UTC, see vercel.json).
  // The cron uses subscriptions.updated_at as the cancellation date proxy and
  // checks email_logs to determine which touch to send next:
  //   Day 3  → win-back-day3  ("Something I want to say")
  //   Day 7  → win-back-day7  ("This is different now")
  //   Day 14 → win-back-day14 ("Leaving the door open")
  // No action needed here — the DB status update above is sufficient.

  return
}

export async function handleInvoicePaymentFailed(rawEvent: Stripe.Event): Promise<void> {
  const event = rawEvent as Stripe.Event & { data: { object: any } }
  const invoice = event.data.object

  // Stripe API 2025-03+ removed invoice.subscription — read both shapes (see invoice-paid.ts).
  const rawSubscription = invoice.subscription ?? invoice.parent?.subscription_details?.subscription
  if (!rawSubscription) return

  const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id

  if (!subscriptionId || !invoice.id) return

  // Webhooks can be delayed or delivered out of order. Re-read the exact invoice and
  // subscription before changing access so a stale failure can never overwrite a later
  // successful payment.
  const currentInvoice = (await stripe.invoices.retrieve(invoice.id)) as any
  const currentSubscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any
  const currentRawSubscription =
    currentInvoice.subscription ?? currentInvoice.parent?.subscription_details?.subscription
  const currentInvoiceSubscriptionId =
    typeof currentRawSubscription === "string" ? currentRawSubscription : currentRawSubscription?.id
  if (currentInvoiceSubscriptionId !== subscriptionId) {
    throw new Error(`Invoice ${invoice.id} does not belong to subscription ${subscriptionId}`)
  }

  await sql`
    UPDATE subscriptions
    SET status = ${currentSubscription.status}, updated_at = NOW()
    WHERE stripe_subscription_id = ${subscriptionId}
  `

  if (currentInvoice.status === "paid") {
    console.log(`[v0] ⏭️ Ignoring stale payment failure for recovered invoice ${invoice.id}`)
    return
  }

  if (!["past_due", "unpaid", "incomplete"].includes(currentSubscription.status)) {
    console.log(
      `[v0] ⏭️ Ignoring payment failure for subscription ${subscriptionId} with current Stripe status ${currentSubscription.status}`
    )
    return
  }

  console.log(
    `[v0] ⚠️ Payment failed for subscription ${subscriptionId} - current Stripe status ${currentSubscription.status}`
  )

  try {
    const [subRecord] = await sql`
      SELECT user_id, product_type, stripe_customer_id
      FROM subscriptions
      WHERE stripe_subscription_id = ${subscriptionId}
      LIMIT 1
    `
    if (!subRecord?.user_id) return

    const stripeCustomerId =
      typeof currentInvoice.customer === "string"
        ? currentInvoice.customer
        : currentInvoice.customer?.id || subRecord.stripe_customer_id || null
    const failedAt = new Date(
      Number(currentInvoice.created || invoice.created || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString()
    const recoveryMetadata = {
      ...(currentInvoice.metadata || invoice.metadata || {}),
      payment_recovery: {
        first_failed_at: failedAt,
        last_failed_at: failedAt,
        attempt_count: Number(currentInvoice.attempt_count || invoice.attempt_count || 1),
        failure_event_id: event.id,
      },
    }

    // This is behavior/measurement, not revenue. The row becomes money only when the exact
    // same Stripe invoice later succeeds and invoice-paid.ts changes its status to paid.
    if (invoice.id && stripeCustomerId) {
      try {
        await sql`
          INSERT INTO stripe_payments (
            stripe_payment_id,
            stripe_invoice_id,
            stripe_subscription_id,
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
            ${invoice.id},
            ${invoice.id},
            ${subscriptionId},
            ${stripeCustomerId},
            ${subRecord.user_id},
            ${Number(currentInvoice.amount_due || invoice.amount_due || 0)},
            ${currentInvoice.currency || invoice.currency || "usd"},
            'failed',
            'subscription',
            ${subRecord.product_type || "sselfie_studio_membership"},
            ${currentInvoice.description || invoice.description || "Subscription renewal payment failed"},
            ${JSON.stringify(recoveryMetadata)},
            to_timestamp(${Number(currentInvoice.created || invoice.created || Math.floor(Date.now() / 1000))}),
            ${!event.livemode},
            NOW(),
            NOW()
          )
          ON CONFLICT (stripe_payment_id)
          DO UPDATE SET
            status = CASE
              WHEN stripe_payments.status IN ('paid', 'succeeded') THEN stripe_payments.status
              ELSE 'failed'
            END,
            amount_cents = EXCLUDED.amount_cents,
            metadata = CASE
              WHEN stripe_payments.status IN ('paid', 'succeeded') THEN stripe_payments.metadata
              ELSE jsonb_set(
                COALESCE(stripe_payments.metadata, '{}'::jsonb)
                  || (EXCLUDED.metadata - 'payment_recovery'),
                '{payment_recovery}',
                COALESCE(stripe_payments.metadata -> 'payment_recovery', '{}'::jsonb)
                  || jsonb_build_object(
                    'first_failed_at', COALESCE(
                      stripe_payments.metadata #>> '{payment_recovery,first_failed_at}',
                      EXCLUDED.metadata #>> '{payment_recovery,first_failed_at}'
                    ),
                    'last_failed_at', EXCLUDED.metadata #>> '{payment_recovery,last_failed_at}',
                    'attempt_count', COALESCE(
                      (EXCLUDED.metadata #>> '{payment_recovery,attempt_count}')::int,
                      1
                    ),
                    'failure_event_id', EXCLUDED.metadata #>> '{payment_recovery,failure_event_id}'
                  ),
                TRUE
              )
            END,
            updated_at = NOW()
        `
      } catch (measurementError) {
        console.error("[v0] Failed to record payment recovery marker:", measurementError)
      }
    }

    const [userRecord] = await sql`
      SELECT email, display_name FROM users WHERE id = ${subRecord.user_id} LIMIT 1
    `
    if (!userRecord?.email) return

    const recentSend = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${userRecord.email}
        AND email_type = 'payment-failed'
        AND sent_at >= NOW() - INTERVAL '3 days'
      LIMIT 1
    `
    if (recentSend.length > 0) return

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
    let manageBillingUrl = currentInvoice.hosted_invoice_url || `${siteUrl}/app`
    try {
      const token = signBillingRecoveryToken({
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoice.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      manageBillingUrl = `${siteUrl}/api/stripe/recover-payment?token=${encodeURIComponent(token)}`
    } catch (tokenError) {
      console.error("[v0] Failed to create secure billing recovery link:", tokenError)
    }
    const retryDate = currentInvoice.next_payment_attempt
      ? new Date(currentInvoice.next_payment_attempt * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined

    const emailContent = generatePaymentFailedEmail({
      firstName: userRecord.display_name?.split(" ")[0] || undefined,
      recipientEmail: userRecord.email,
      retryDate,
      manageBillingUrl,
    })

    await sendEmail({
      to: userRecord.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      emailType: "payment-failed",
      tags: ["billing", "payment-failed"],
    })
  } catch (emailError) {
    console.error("[v0] ⚠️ Failed to send payment failed email:", emailError)
  }

  return
}

export async function handleSubscriptionUpdated(rawEvent: Stripe.Event): Promise<void> {
  const event = rawEvent as Stripe.Event & { data: { object: any } }
  const sub = event.data.object

  const stripeStatus = sub.status // active, trialing, past_due, unpaid, canceled
  const updatedPeriod = getSubscriptionPeriod(sub)
  const currentPeriodEnd = updatedPeriod.end ? new Date(updatedPeriod.end * 1000) : null
  const currentPeriodStart = updatedPeriod.start ? new Date(updatedPeriod.start * 1000) : null

  // Derive product_type so upgrades (e.g. old product → membership) are reflected in our DB.
  // Only include price IDs that are actually set in env (empty string key would corrupt lookups).
  // When price cannot be mapped, do NOT overwrite product_type/plan — update only status/period.
  const rawProductType = (sub.metadata as any)?.product_type || null
  let productType: string | null =
    rawProductType === "sselfie_studio_membership_annual"
      ? "sselfie_studio_membership"
      : rawProductType
  if (!productType && sub.items?.data?.[0]) {
    const priceId =
      typeof sub.items.data[0].price === "string"
        ? sub.items.data[0].price
        : (sub.items.data[0].price as any)?.id
    if (priceId) {
      const priceToProduct: Record<string, string> = {}
      const studioId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
      const brandId = process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID
      const annualId = process.env.STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID
      const foundingAnnualId = process.env.STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID
      const oneTimeId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
      if (studioId) priceToProduct[studioId] = "sselfie_studio_membership"
      if (annualId) priceToProduct[annualId] = "sselfie_studio_membership"
      if (foundingAnnualId) priceToProduct[foundingAnnualId] = "sselfie_studio_membership"
      if (brandId) priceToProduct[brandId] = "brand_studio_membership"
      if (oneTimeId) priceToProduct[oneTimeId] = "one_time_session"
      productType = priceToProduct[priceId] || null
    }
  }

  // Keep discount documentation in sync (lifetime BETA 50% etc.).
  const updatedResolvedDiscount =
    (await resolveSubscriptionDiscount(sub)) ?? (await currentDocumentedDiscount(sub.id))
  const updatedDiscountPercent = updatedResolvedDiscount.percent
  const updatedDiscountCoupon = updatedResolvedDiscount.coupon

  if (productType) {
    const subscriptionPlan = getSubscriptionPlanFromMetadata(sub.metadata, productType)
    await sql`
      UPDATE subscriptions
      SET
        product_type = ${productType},
        plan = ${subscriptionPlan},
        status = ${stripeStatus},
        current_period_start = ${currentPeriodStart},
        current_period_end = ${currentPeriodEnd},
        discount_percent = ${updatedDiscountPercent},
        discount_coupon = ${updatedDiscountCoupon},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${sub.id}
    `
    console.log(
      `[v0] 📝 Subscription ${sub.id} updated to status: ${stripeStatus}, product_type: ${productType}`
    )
  } else {
    await sql`
      UPDATE subscriptions
      SET
        status = ${stripeStatus},
        current_period_start = ${currentPeriodStart},
        current_period_end = ${currentPeriodEnd},
        discount_percent = ${updatedDiscountPercent},
        discount_coupon = ${updatedDiscountCoupon},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${sub.id}
    `
    console.log(
      `[v0] 📝 Subscription ${sub.id} updated to status: ${stripeStatus} (product_type/plan unchanged — price not in env mapping)`
    )
  }

  return
}
