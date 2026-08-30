import "server-only"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { campaignIntakeEmail } from "@/lib/campaign-outcome/emails"
import { createCampaignAccessToken, resolveRepeatSourceOrder } from "@/lib/campaign-outcome/orders"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG } from "@/lib/email/config"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { updateContactTags } from "@/lib/resend/manage-contact"
import type { CheckoutFulfillmentContext } from "@/lib/payments/types"

export const CAMPAIGN_OUTCOME_PRODUCT_TYPE = "campaign_outcome"

function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string" && value) return value
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === "string" && id ? id : null
  }
  return null
}

export async function handleCampaignOutcomeCheckout(
  ctx: CheckoutFulfillmentContext
): Promise<void> {
  if (!ctx.isPaymentPaid) {
    console.warn(`[campaign-outcome] Session ${ctx.session.id} is not paid; fulfillment skipped.`)
    return
  }

  const customerEmail = ctx.customerEmail?.trim().toLowerCase()
  if (!customerEmail) throw new Error("Missing customer email for campaign outcome fulfillment")
  const currency = String(ctx.session.currency || "").toLowerCase()
  if (ctx.session.amount_total !== 9700 || currency !== "usd") {
    throw new Error(
      `Campaign outcome expected USD 9700; received ${currency || "missing currency"} ${ctx.session.amount_total ?? "missing amount"}`
    )
  }

  await ensureCampaignOutcomeSchema()
  const sourceOrderId = await resolveRepeatSourceOrder({
    token: ctx.session.metadata?.repeat_order_token,
    customerEmail,
    isTestMode: !ctx.event.livemode,
  })
  const accessToken = createCampaignAccessToken()
  const inserted = await sql`
    INSERT INTO campaign_orders (
      user_id,
      customer_email,
      customer_name,
      access_token,
      stripe_session_id,
      stripe_payment_id,
      stripe_customer_id,
      source_order_id,
      is_test_mode
    ) VALUES (
      ${ctx.userId ? String(ctx.userId) : null},
      ${customerEmail},
      ${ctx.session.customer_details?.name || null},
      ${accessToken},
      ${ctx.session.id},
      ${stripeObjectId(ctx.session.payment_intent) || ctx.session.id},
      ${stripeObjectId(ctx.session.customer)},
      ${sourceOrderId},
      ${!ctx.event.livemode}
    )
    ON CONFLICT (stripe_session_id) DO NOTHING
    RETURNING id, access_token, source_order_id, intake_email_sent_at, repeat_attribution_recorded_at
  `
  const created = Boolean(inserted[0])
  const existing = created
    ? inserted[0]
    : (
        await sql`
          SELECT id, access_token, source_order_id, intake_email_sent_at, repeat_attribution_recorded_at
          FROM campaign_orders
          WHERE stripe_session_id = ${ctx.session.id}
          LIMIT 1
        `
      )[0]
  if (!existing) throw new Error(`Campaign order missing after fulfillment for ${ctx.session.id}`)

  const orderId = Number(existing.id)
  const resolvedSourceOrderId = existing.source_order_id
    ? Number(existing.source_order_id)
    : sourceOrderId
  if (resolvedSourceOrderId) {
    await sql`
      UPDATE campaign_orders
      SET repeat_purchased_at = COALESCE(repeat_purchased_at, NOW()), updated_at = NOW()
      WHERE id = ${resolvedSourceOrderId}
    `
  }

  await logAnalyticsEvent({
    eventName: "campaign_purchase",
    userId: ctx.userId ? String(ctx.userId) : null,
    path: "/checkout/campaign",
    idempotencyKey: `purchase:${stripeObjectId(ctx.session.payment_intent) || ctx.session.id}`,
    utm: {
      source: ctx.session.metadata?.utm_source || null,
      medium: ctx.session.metadata?.utm_medium || null,
      campaign: ctx.session.metadata?.utm_campaign || null,
      content: ctx.session.metadata?.utm_content || null,
      term: ctx.session.metadata?.utm_term || null,
    },
    properties: {
      source: ctx.source || "campaign_outcome_paid",
      order_id: orderId,
      stripe_session_id: ctx.session.id,
      amount_cents: ctx.session.amount_total || 9700,
      is_test_mode: !ctx.event.livemode,
    },
  })
  if (resolvedSourceOrderId && !existing.repeat_attribution_recorded_at) {
    const repeatEvent = await logAnalyticsEvent({
      eventName: "campaign_repeat_purchase",
      userId: ctx.userId ? String(ctx.userId) : null,
      path: "/checkout/campaign",
      properties: { order_id: orderId, source_order_id: resolvedSourceOrderId },
    })
    if (!repeatEvent.ok) throw new Error(`Campaign repeat attribution failed for order ${orderId}`)
    await sql`
      UPDATE campaign_orders
      SET repeat_attribution_recorded_at = COALESCE(repeat_attribution_recorded_at, NOW()), updated_at = NOW()
      WHERE id = ${orderId}
    `
  }

  // Stripe test events share the production database. Keep the test order for a safe
  // end-to-end dry run, but never email a real address or change a live contact.
  if (!ctx.event.livemode) return
  if (existing.intake_email_sent_at) return

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  const intakeUrl = `${origin}/campaign/order/${encodeURIComponent(String(existing.access_token))}`
  const email = campaignIntakeEmail({
    firstName: getFirstNameForEmail({
      fullName: ctx.session.customer_details?.name,
      email: customerEmail,
    }),
    intakeUrl,
  })
  const result = await sendEmail({
    to: customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: "campaign_outcome_intake",
    tags: ["campaign-outcome", "intake"],
    from: EMAIL_CONFIG.transactional.from,
    replyTo: EMAIL_CONFIG.transactional.replyTo,
    idempotencyKey: `campaign-outcome-intake:${ctx.session.id}`,
  })
  if (!result.success) throw new Error(result.error || "Campaign intake email failed")
  await sql`
    UPDATE campaign_orders
    SET intake_email_sent_at = COALESCE(intake_email_sent_at, NOW()), updated_at = NOW()
    WHERE id = ${orderId}
  `

  await updateContactTags(customerEmail, {
    status: "customer",
    product: "campaign-outcome",
    journey: "campaign-intake",
  }).catch(error => {
    console.warn("[campaign-outcome] Contact tag update failed:", error)
  })
}
