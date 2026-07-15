import "server-only"

import { campaignDay7Email } from "@/lib/campaign-outcome/emails"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG } from "@/lib/email/config"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"

type Day7Order = {
  id: number
  customer_email: string
  customer_name: string | null
  access_token: string
  stripe_session_id: string
}

export async function sendCampaignDay7Followups(): Promise<{
  found: number
  sent: number
  failed: number
}> {
  await ensureCampaignOutcomeSchema()
  const orders = (await sql`
    SELECT id, customer_email, customer_name, access_token, stripe_session_id
    FROM campaign_orders
    WHERE status = 'delivered'
      AND is_test_mode = FALSE
      AND delivered_at <= NOW() - INTERVAL '7 days'
      AND delivered_at > NOW() - INTERVAL '14 days'
      AND day7_email_sent_at IS NULL
    ORDER BY delivered_at ASC
    LIMIT 50
  `) as Day7Order[]

  const result = { found: orders.length, sent: 0, failed: 0 }
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

  for (const order of orders) {
    const orderUrl = `${origin}/campaign/order/${encodeURIComponent(order.access_token)}`
    const repeatUrl = `${origin}/checkout/campaign?source=campaign_day7&utm_source=email&utm_medium=lifecycle&utm_campaign=campaign_outcome_test&utm_content=repeat&cta_keyword=CAMPAIGN&repeat_order_token=${encodeURIComponent(order.access_token)}`
    const email = campaignDay7Email({
      firstName: getFirstNameForEmail({
        fullName: order.customer_name,
        email: order.customer_email,
      }),
      yesUrl: `${orderUrl}?published=yes`,
      noUrl: `${orderUrl}?published=no`,
      repeatUrl,
    })
    const sent = await sendEmail({
      to: order.customer_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "campaign_outcome_day7",
      tags: ["campaign-outcome", "day7"],
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      marketing: true,
      idempotencyKey: `campaign-outcome-day7:${order.stripe_session_id}`,
    })
    if (sent.success) {
      result.sent += 1
      await sql`
        UPDATE campaign_orders
        SET day7_email_sent_at = COALESCE(day7_email_sent_at, NOW()), updated_at = NOW()
        WHERE id = ${order.id}
      `
    } else {
      result.failed += 1
    }
  }
  return result
}
