import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"

import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { sendEmail } from "@/lib/email/send-email"
import { generateMonthlyUsageRecapEmail } from "@/lib/email/templates/monthly-usage-recap"


const MAX_RECIPIENTS = Number(process.env.MONTHLY_USAGE_RECAP_MAX_RECIPIENTS || 200)
const SEND_DELAY_MS = Number(process.env.MONTHLY_USAGE_RECAP_SEND_DELAY_MS || 550)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Monthly Usage Recap
 *
 * Runs daily and only sends to active members who have not received
 * `monthly-usage-recap` in the last 28 days.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("monthly-usage-recap")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recipients = await sql`
      SELECT
        u.id,
        u.email,
        COALESCE(NULLIF(TRIM(u.display_name), ''), 'friend') AS first_name,
        COALESCE(uc.balance, 0)::int AS credits_remaining,
        COALESCE(usage_last28.credits_used, 0)::int AS credits_used,
        COALESCE(images_last28.photos_generated, 0)::int AS photos_generated
      FROM users u
      LEFT JOIN user_credits uc ON uc.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS photos_generated
        FROM generated_images gi
        WHERE gi.user_id = u.id
          AND gi.created_at >= NOW() - INTERVAL '28 days'
      ) AS images_last28 ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(ABS(ct.amount)), 0)::int AS credits_used
        FROM credit_transactions ct
        WHERE ct.user_id = u.id
          AND ct.transaction_type = 'usage'
          AND ct.created_at >= NOW() - INTERVAL '28 days'
      ) AS usage_last28 ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(el.sent_at) AS last_sent_at
        FROM email_logs el
        WHERE el.user_email = u.email
          AND el.email_type = 'monthly-usage-recap'
          AND (
            el.status IN ('sent', 'delivered')
            OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')
          )
          AND el.sent_at > NOW() - INTERVAL '28 days'
      ) AS el_recent ON TRUE
      WHERE EXISTS (
        SELECT 1
        FROM subscriptions s
        WHERE s.user_id::varchar = u.id
          AND s.status = 'active'
          AND s.is_test_mode = false
          AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      )
        AND u.created_at <= NOW() - INTERVAL '28 days'
        AND el_recent.last_sent_at IS NULL
      ORDER BY u.created_at ASC
      LIMIT ${MAX_RECIPIENTS}
    `

    if (recipients.length === 0) {
      await cronLogger.success({ sent: 0, failed: 0, reason: "no_eligible_recipients" })
      return NextResponse.json({ success: true, sent: 0, failed: 0, reason: "no_eligible_recipients" })
    }

    const getCampaignId = async () => {
      const existing = await sql`
        SELECT id
        FROM admin_email_campaigns
        WHERE campaign_type = 'monthly-usage-recap'
        ORDER BY id DESC
        LIMIT 1
      `
      if (existing.length > 0) {
        return Number(existing[0].id)
      }

      const created = await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name,
          campaign_type,
          subject_line,
          body_html,
          body_text,
          status
        )
        VALUES (
          'monthly-usage-recap',
          'monthly-usage-recap',
          'Your month in SSELFIE',
          '',
          '',
          'active'
        )
        RETURNING id
      `
      return Number(created[0].id)
    }

    const campaignId = await getCampaignId()

    let sent = 0
    let failed = 0

    for (const recipient of recipients as any[]) {
      const content = generateMonthlyUsageRecapEmail({
        firstName: recipient.first_name,
        creditsUsed: recipient.credits_used,
        creditsRemaining: recipient.credits_remaining,
        photosGenerated: recipient.photos_generated,
      })

      const result = await sendEmail({
        to: recipient.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        emailType: "monthly-usage-recap",
        campaignId,
      })

      if (result.success) {
        sent += 1
      } else {
        failed += 1
      }

      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS)
      }
    }

    await cronLogger.success({
      eligible: recipients.length,
      sent,
      failed,
    })

    return NextResponse.json({
      success: true,
      eligible: recipients.length,
      sent,
      failed,
    })
  } catch (error) {
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:monthly-usage-recap",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run monthly-usage-recap",
      },
      { status: 500 },
    )
  }
}
