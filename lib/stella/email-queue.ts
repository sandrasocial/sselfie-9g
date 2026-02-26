/**
 * Agent-driven email queue for north-email via Stella bridge.
 */

import { neon } from "@neondatabase/serverless"
import { stripe } from "@/lib/stripe"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailQueueItem {
  userId: string
  email: string
  firstName: string | null
  emailType: string
  params?: Record<string, unknown>
}

export async function getEmailQueue(limitPerType = 100): Promise<EmailQueueItem[]> {
  const queue: EmailQueueItem[] = []
  const day3 = await sql`
    SELECT u.id::text AS user_id, u.email, u.display_name
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.status = 'canceled'
      AND s.updated_at <= NOW() - INTERVAL '3 days'
      AND u.email IS NOT NULL AND u.email != ''
      AND NOT EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'win-back-day3' AND el.status IN ('sent', 'delivered'))
      AND NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id AND s2.status = 'active')
    ORDER BY s.updated_at ASC
    LIMIT ${limitPerType}
  `
  for (const r of day3 as { user_id: string; email: string; display_name: string | null }[]) {
    queue.push({ userId: r.user_id, email: r.email, firstName: r.display_name?.split(" ")[0] ?? null, emailType: "win-back-day3" })
  }

  const day7 = await sql`
    SELECT u.id::text AS user_id, u.email, u.display_name
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.status = 'canceled' AND s.updated_at <= NOW() - INTERVAL '7 days'
      AND u.email IS NOT NULL AND u.email != ''
      AND EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'win-back-day3' AND el.status IN ('sent', 'delivered'))
      AND NOT EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'win-back-day7' AND el.status IN ('sent', 'delivered'))
      AND NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id AND s2.status = 'active')
    ORDER BY s.updated_at ASC
    LIMIT ${limitPerType}
  `
  for (const r of day7 as { user_id: string; email: string; display_name: string | null }[]) {
    queue.push({ userId: r.user_id, email: r.email, firstName: r.display_name?.split(" ")[0] ?? null, emailType: "win-back-day7" })
  }

  const day14 = await sql`
    SELECT u.id::text AS user_id, u.email, u.display_name
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.status = 'canceled' AND s.updated_at <= NOW() - INTERVAL '14 days'
      AND u.email IS NOT NULL AND u.email != ''
      AND EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'win-back-day7' AND el.status IN ('sent', 'delivered'))
      AND NOT EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'win-back-day14' AND el.status IN ('sent', 'delivered'))
      AND NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id AND s2.status = 'active')
    ORDER BY s.updated_at ASC
    LIMIT ${limitPerType}
  `
  for (const r of day14 as { user_id: string; email: string; display_name: string | null }[]) {
    queue.push({ userId: r.user_id, email: r.email, firstName: r.display_name?.split(" ")[0] ?? null, emailType: "win-back-day14" })
  }

  const w0 = await sql`
    SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name
    FROM users u
    INNER JOIN subscriptions s ON u.id::varchar = s.user_id
    LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-0' AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours'))
    WHERE u.created_at > NOW() - INTERVAL '2 hours' AND u.created_at <= NOW()
      AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL)
      AND el.id IS NULL
    LIMIT ${limitPerType}
  `
  for (const r of w0 as { user_id: string; email: string; display_name: string | null }[]) {
    queue.push({ userId: r.user_id, email: r.email, firstName: r.display_name?.split(" ")[0] ?? null, emailType: "welcome-day-0" })
  }

  const welcomeDays: [number, string][] = [[3, "welcome-day-3"], [7, "welcome-day-7"], [14, "welcome-day-14"], [21, "welcome-day-21"], [28, "welcome-day-28"]]
  for (const [day, emailType] of welcomeDays) {
    const w = await (day === 3
      ? sql`SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name FROM users u INNER JOIN subscriptions s ON u.id::varchar = s.user_id LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = ${emailType} AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')) WHERE u.created_at <= NOW() - INTERVAL '3 days' AND u.created_at > NOW() - INTERVAL '13 days' AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND el.id IS NULL LIMIT ${limitPerType}`
      : day === 7
        ? sql`SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name FROM users u INNER JOIN subscriptions s ON u.id::varchar = s.user_id LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = ${emailType} AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')) WHERE u.created_at <= NOW() - INTERVAL '7 days' AND u.created_at > NOW() - INTERVAL '17 days' AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND el.id IS NULL LIMIT ${limitPerType}`
        : day === 14
          ? sql`SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name FROM users u INNER JOIN subscriptions s ON u.id::varchar = s.user_id LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = ${emailType} AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')) WHERE u.created_at <= NOW() - INTERVAL '14 days' AND u.created_at > NOW() - INTERVAL '24 days' AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND el.id IS NULL LIMIT ${limitPerType}`
          : day === 21
            ? sql`SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name FROM users u INNER JOIN subscriptions s ON u.id::varchar = s.user_id LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = ${emailType} AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')) WHERE u.created_at <= NOW() - INTERVAL '21 days' AND u.created_at > NOW() - INTERVAL '31 days' AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND el.id IS NULL LIMIT ${limitPerType}`
            : sql`SELECT DISTINCT u.id::text AS user_id, u.email, u.display_name FROM users u INNER JOIN subscriptions s ON u.id::varchar = s.user_id LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = ${emailType} AND (el.status IN ('sent', 'delivered') OR (el.status = 'queued' AND el.sent_at > NOW() - INTERVAL '2 hours')) WHERE u.created_at <= NOW() - INTERVAL '28 days' AND u.created_at > NOW() - INTERVAL '38 days' AND s.status = 'active' AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership') AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND el.id IS NULL LIMIT ${limitPerType}`)
    for (const r of w as { user_id: string; email: string; display_name: string | null }[]) {
      queue.push({ userId: r.user_id, email: r.email, firstName: r.display_name?.split(" ")[0] ?? null, emailType })
    }
  }

  if (stripe) {
    const now = Math.floor(Date.now() / 1000)
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60
    let startingAfter: string | undefined
    let hasMore = true
    const endingSoon: Array<{ id: string; current_period_end: number }> = []
    while (hasMore) {
      const list = await stripe.subscriptions.list({ status: "all", limit: 100, ...(startingAfter && { starting_after: startingAfter }) })
      for (const sub of list.data) {
        if (!sub.livemode || !sub.cancel_at_period_end || !sub.current_period_end) continue
        if (sub.current_period_end < now || sub.current_period_end > sevenDaysFromNow) continue
        if (sub.status !== "active" && sub.status !== "trialing") continue
        endingSoon.push({ id: sub.id, current_period_end: sub.current_period_end })
      }
      hasMore = list.has_more
      if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    for (const sub of endingSoon) {
      const [subRecord] = await sql`SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${sub.id} LIMIT 1`
      const rec = subRecord as { user_id?: string } | undefined
      if (!rec?.user_id) continue
      const [userRecord] = await sql`SELECT id, email, display_name FROM users WHERE id = ${rec.user_id} LIMIT 1`
      const u = userRecord as { id: string; email?: string; display_name?: string } | undefined
      if (!u?.email) continue
      const daysLeft = Math.ceil((sub.current_period_end - now) / (24 * 60 * 60))
      const emailType = daysLeft <= 1 ? "subscription-ending-soon-1" : daysLeft <= 3 ? "subscription-ending-soon-3" : "subscription-ending-soon-7"
      let recent: { id: number }[] = []
      if (daysLeft <= 1) {
        recent = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${u.email} AND email_type = ${emailType} AND status IN ('sent', 'delivered') AND sent_at >= NOW() - INTERVAL '1 day'
          LIMIT 1
        `
      } else if (daysLeft <= 3) {
        recent = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${u.email} AND email_type = ${emailType} AND status IN ('sent', 'delivered') AND sent_at >= NOW() - INTERVAL '3 days'
          LIMIT 1
        `
      } else {
        recent = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${u.email} AND email_type = ${emailType} AND status IN ('sent', 'delivered') AND sent_at >= NOW() - INTERVAL '7 days'
          LIMIT 1
        `
      }
      if (recent.length > 0) continue
      const periodEndDate = new Date(sub.current_period_end * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      queue.push({
        userId: u.id,
        email: u.email,
        firstName: u.display_name?.split(" ")[0] ?? null,
        emailType,
        params: { periodEndDate, manageBillingUrl: siteUrl + "/studio?tab=account" },
      })
    }
  }

  const recapLimit = Math.min(limitPerType, Number(process.env.MONTHLY_USAGE_RECAP_MAX_RECIPIENTS || 200))
  const recap = await sql`
    SELECT u.id::text AS user_id, u.email, COALESCE(NULLIF(TRIM(u.display_name), ''), 'friend') AS first_name,
      COALESCE(uc.balance, 0)::int AS credits_remaining,
      COALESCE((SELECT COALESCE(SUM(ABS(ct.amount)), 0)::int FROM credit_transactions ct WHERE ct.user_id = u.id AND ct.transaction_type = 'usage' AND ct.created_at >= NOW() - INTERVAL '28 days'), 0) AS credits_used,
      COALESCE((SELECT COUNT(*)::int FROM generated_images gi WHERE gi.user_id = u.id AND gi.created_at >= NOW() - INTERVAL '28 days'), 0) AS photos_generated
    FROM users u
    LEFT JOIN user_credits uc ON uc.user_id = u.id
    WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id::varchar = u.id AND s.status = 'active' AND (s.is_test_mode = false OR s.is_test_mode IS NULL) AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership'))
      AND u.created_at <= NOW() - INTERVAL '28 days'
      AND NOT EXISTS (SELECT 1 FROM email_logs el WHERE el.user_email = u.email AND el.email_type = 'monthly-usage-recap' AND el.status IN ('sent', 'delivered') AND el.sent_at > NOW() - INTERVAL '28 days')
    ORDER BY u.created_at ASC
    LIMIT ${recapLimit}
  `
  for (const r of recap as { user_id: string; email: string; first_name: string; credits_remaining: number; credits_used: number; photos_generated: number }[]) {
    queue.push({
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name,
      emailType: "monthly-usage-recap",
      params: { creditsRemaining: r.credits_remaining, creditsUsed: r.credits_used, photosGenerated: r.photos_generated },
    })
  }

  return queue
}
