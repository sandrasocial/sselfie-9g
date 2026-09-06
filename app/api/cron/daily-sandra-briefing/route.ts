import { type NextRequest, NextResponse } from "next/server"
import {
  buildDailySandraBriefing,
  generateDailySandraBriefingEmail,
} from "@/lib/admin/daily-sandra-briefing"
import { getGrowthIntelligenceReport } from "@/lib/admin/growth-intelligence"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { syncApprovalActions } from "@/lib/admin/sync-approval-actions"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = process.env.DAILY_SANDRA_BRIEFING_EMAIL || process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  const logger = createCronLogger("daily-sandra-briefing")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logger.error(new Error("Unauthorized"), { reason: "invalid_cron_secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!envFlag("DAILY_SANDRA_BRIEFING_ENABLED")) {
      await logger.success({ sent: false, skipped: "disabled" })
      return NextResponse.json({ success: true, sent: false, skipped: "disabled" })
    }

    const report = await getGrowthIntelligenceReport(7)

    // Money header from stripe_payments, the only allowed money source.
    const [moneyRows, approvalActions] = await Promise.all([
      sql`
        SELECT
          UPPER(COALESCE(NULLIF(currency, ''), 'unknown')) AS currency,
          COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '1 day')::int AS yesterday_payments,
          COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '1 day'), 0)::bigint AS yesterday_cents,
          COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days')::int AS month_payments,
          COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days'), 0)::bigint AS month_cents
        FROM stripe_payments
        WHERE status IN ('succeeded', 'paid')
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND payment_date > NOW() - INTERVAL '30 days'
        GROUP BY 1
      ` as unknown as Promise<any[]>,
      syncApprovalActions().catch((error) => {
        console.error("[daily-sandra-briefing] approval sync failed:", error)
        return []
      }),
    ])

    const moneyInput = {
      yesterdayPayments: moneyRows.reduce((sum, row) => sum + Number(row.yesterday_payments || 0), 0),
      yesterdayRevenueByCurrency: Object.fromEntries(moneyRows.map(row => [row.currency, Number(row.yesterday_cents || 0) / 100])),
      monthPayments: moneyRows.reduce((sum, row) => sum + Number(row.month_payments || 0), 0),
      monthRevenueByCurrency: Object.fromEntries(moneyRows.map(row => [row.currency, Number(row.month_cents || 0) / 100])),
    }
    const briefing = buildDailySandraBriefing(report, {
      money: moneyInput,
      approvalActions,
    })

    const email = generateDailySandraBriefingEmail(briefing)
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Intelligence <hello@sselfie.ai>",
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "daily_sandra_briefing",
      tags: ["growth-intelligence", "daily-briefing"],
    })

    await logger.success({
      sent: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      topLeak: briefing.leaking[0] || null,
    })

    return NextResponse.json({
      success: result.success,
      sent: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      briefing,
    })
  } catch (error) {
    await logger.error(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to send daily Sandra briefing" }, { status: 500 })
  }
}
