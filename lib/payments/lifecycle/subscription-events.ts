// WEBHOOK-01 — subscription lifecycle handlers (created / deleted / payment_failed /
// updated), extracted VERBATIM from app/api/webhooks/stripe/route.ts (as of commit dca0379a).
// One documented transform per case: `break` -> `return` (the dispatcher breaks right after
// each call — identical control flow).

import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { notifyNorth } from "@/lib/north-notifier"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generatePaymentFailedEmail } from "@/lib/email/templates/payment-failed"
import { logWebhookError, alertWebhookError } from "@/lib/webhook-monitoring"
import { getSubscriptionCoupon } from "@/lib/revenue/subscription-amount"

/**
 * Resolve a subscription's coupon for DB documentation (e.g. lifetime BETA 50%).
 * Webhook payloads on newer Stripe API versions carry `discounts` as ID strings,
 * so when a discount exists but isn't expanded we re-fetch with expansion —
 * never write null over a real discount just because the payload was thin.
 */
async function resolveSubscriptionDiscount(
  sub: any,
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

/**
 * Stripe API 2025-03+ (Basil/Clover) removed subscription.current_period_start/end —
 * the billing period now lives per item at subscription.items.data[].current_period_*.
 * Reading only the old shape nulled every member's period on 2026-06-10/11.
 */
function getSubscriptionPeriod(sub: any): { start: number | null; end: number | null } {
  const item = sub?.items?.data?.[0]
  return {
    start: sub?.current_period_start ?? item?.current_period_start ?? null,
    end: sub?.current_period_end ?? item?.current_period_end ?? null,
  }
}

/** Current documented discount for a subscription row (fallback when Stripe is unreachable). */
async function currentDocumentedDiscount(
  stripeSubscriptionId: string,
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

  const existingSubscription = await sql`
    SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
  `

  // Persist coupon state so the DB documents what each member actually pays
  // (e.g. lifetime BETA 50%).
  const resolvedDiscount =
    (await resolveSubscriptionDiscount(subscription)) ??
    (await currentDocumentedDiscount(subscription.id))
  const discountPercent = resolvedDiscount.percent
  const discountCoupon = resolvedDiscount.coupon

  const createdPeriod = getSubscriptionPeriod(subscription)

  if (existingSubscription.length > 0) {
    console.log(`[v0] Updating existing subscription for user ${userId}`)
    await sql`
      UPDATE subscriptions SET
        product_type = ${productType},
        plan = ${productType},
        status = ${subscription.status},
        stripe_subscription_id = ${subscription.id},
        stripe_customer_id = ${subscription.customer},
        current_period_start = to_timestamp(${createdPeriod.start}),
        current_period_end = to_timestamp(${createdPeriod.end}),
        is_test_mode = ${!event.livemode},
        discount_percent = ${discountPercent},
        discount_coupon = ${discountCoupon},
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
        is_test_mode,
        discount_percent,
        discount_coupon
      )
      VALUES (
        ${userId},
        ${productType},
        ${productType},
        ${subscription.status},
        ${subscription.id},
        ${subscription.customer},
        to_timestamp(${createdPeriod.start}),
        to_timestamp(${createdPeriod.end}),
        ${!event.livemode},
        ${discountPercent},
        ${discountCoupon}
      )
    `
  }

  // Credits for subscription creation are handled above (already checked livemode)
  try {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer && !customer.deleted) {
        const item = subscription.items?.data?.[0]
        const plan = item?.price?.nickname || item?.price?.id
        const unitAmount = item?.price?.unit_amount
        const amount = typeof unitAmount === "number" ? `€${unitAmount / 100}/mo` : undefined

        void notifyNorth({
          path: "stripe-new-member",
          customerId: customer.id,
          email: customer.email ?? undefined,
          firstName: customer.name?.split(" ")[0] ?? undefined,
          plan,
          amount,
        })
      }
    }
  } catch (notifyError) {
    console.error("[v0] Failed to notify North for subscription.created:", notifyError)
  }
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

  try {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer && !customer.deleted) {
        const item = subscription.items?.data?.[0]
        const plan = item?.price?.nickname || item?.price?.id

        void notifyNorth({
          path: "stripe-cancellation",
          customerId: customer.id,
          email: customer.email ?? undefined,
          firstName: customer.name?.split(" ")[0] ?? undefined,
          plan,
        })
      }
    }
  } catch (notifyError) {
    console.error("[v0] Failed to notify North for subscription.deleted:", notifyError)
  }

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
  const rawSubscription =
    invoice.subscription ?? invoice.parent?.subscription_details?.subscription
  if (!rawSubscription) return

  const subscriptionId =
    typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id

  await sql`
    UPDATE subscriptions
    SET status = 'past_due'
    WHERE stripe_subscription_id = ${subscriptionId}
  `

  console.log(
    `[v0] ⚠️ Payment failed for subscription ${subscriptionId} - marked as past_due`
  )

  try {
    const failureMessage = `Stripe payment failed for subscription ${subscriptionId} (invoice: ${invoice.id || "unknown"})`
    const webhookError = {
      eventType: event.type,
      errorMessage: failureMessage,
      errorStack: undefined,
      eventData: invoice,
      timestamp: new Date(),
    }
    await logWebhookError(webhookError)
    await alertWebhookError(webhookError)
  } catch (alertError) {
    console.error("[v0] ⚠️ Failed to log/alert payment failure:", alertError)
  }

  try {
    const [subRecord] = await sql`
      SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscriptionId} LIMIT 1
    `
    if (!subRecord?.user_id) return

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
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://sselfie.ai"
    const manageBillingUrl = `${siteUrl}/studio?tab=account`
    const retryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("en-US", {
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

  try {
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer && !customer.deleted) {
        const amount =
          typeof invoice.amount_due === "number" ? `€${invoice.amount_due / 100}` : undefined

        void notifyNorth({
          path: "stripe-payment-failed",
          customerId: customer.id,
          email: customer.email ?? undefined,
          firstName: customer.name?.split(" ")[0] ?? undefined,
          amount,
        })
      }
    }
  } catch (notifyError) {
    console.error("[v0] Failed to notify North for invoice.payment_failed:", notifyError)
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
  let productType: string | null = (sub.metadata as any)?.product_type || null
  if (!productType && sub.items?.data?.[0]) {
    const priceId =
      typeof sub.items.data[0].price === "string"
        ? sub.items.data[0].price
        : (sub.items.data[0].price as any)?.id
    if (priceId) {
      const priceToProduct: Record<string, string> = {}
      const studioId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
      const brandId = process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID
      const oneTimeId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
      if (studioId) priceToProduct[studioId] = "sselfie_studio_membership"
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
    await sql`
      UPDATE subscriptions
      SET
        product_type = ${productType},
        plan = ${productType},
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
