import "server-only"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { EMAIL_CONFIG } from "@/lib/email/config"
import { sendEmail } from "@/lib/email/send-email"
import { sql } from "@/lib/db/client"
import { campaignDeliveryEmail } from "@/lib/campaign-outcome/emails"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import type { CampaignOrder } from "@/lib/campaign-outcome/types"

function campaignOrderUrl(token: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
  return `${origin}/campaign/order/${encodeURIComponent(token)}`
}

export async function deliverCampaignOrder(
  orderId: number,
  options?: { forceEmail?: boolean }
): Promise<{ delivered: boolean; reason?: string }> {
  await ensureCampaignOutcomeSchema()
  const rows = await sql`
    UPDATE campaign_orders
    SET
      status = 'delivered',
      qa_approved_at = COALESCE(qa_approved_at, NOW()),
      delivered_at = COALESCE(delivered_at, NOW()),
      updated_at = NOW()
    WHERE id = ${orderId} AND status IN ('needs_qa', 'delivered')
    RETURNING *
  `
  const order = rows[0] as CampaignOrder | undefined
  if (!order) return { delivered: false, reason: "not_ready_for_delivery" }

  if (!order.is_test_mode && (!order.delivery_email_sent_at || options?.forceEmail)) {
    const email = campaignDeliveryEmail({
      firstName: getFirstNameForEmail({
        fullName: order.customer_name,
        email: order.customer_email,
      }),
      deliveryUrl: campaignOrderUrl(order.access_token),
    })
    const result = await sendEmail({
      to: order.customer_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "campaign_outcome_delivery",
      tags: ["campaign-outcome", "delivery"],
      from: EMAIL_CONFIG.transactional.from,
      replyTo: EMAIL_CONFIG.transactional.replyTo,
      idempotencyKey: options?.forceEmail
        ? `campaign-outcome-delivery:${order.stripe_session_id}:${Date.now()}`
        : `campaign-outcome-delivery:${order.stripe_session_id}`,
    })
    if (!result.success)
      return { delivered: false, reason: result.error || "delivery_email_failed" }
    await sql`
      UPDATE campaign_orders
      SET delivery_email_sent_at = COALESCE(delivery_email_sent_at, NOW()), updated_at = NOW()
      WHERE id = ${order.id}
    `
  }

  await logAnalyticsEvent({
    eventName: "campaign_delivered",
    userId: order.user_id,
    path: `/campaign/order/${order.access_token}`,
    properties: { order_id: order.id, is_test_mode: order.is_test_mode },
  })
  return { delivered: true }
}
