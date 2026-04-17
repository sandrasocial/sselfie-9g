import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { generateRevenueEngineWeeklyReport, storeAnalyticsReport } from "@/lib/analytics/reports"

export async function GET(request: Request) {
  const cronLogger = createCronLogger("revenue-engine-weekly")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const report = await generateRevenueEngineWeeklyReport({
      days: Number(process.env.REVENUE_ENGINE_REPORT_WINDOW_DAYS || 30),
    })

    await storeAnalyticsReport({
      reportType: "revenue_engine_weekly",
      periodStart: new Date(report.periodStart),
      periodEnd: new Date(report.periodEnd),
      payload: report,
    })

    await cronLogger.success({
      sessions: report.summary.sessions,
      purchases: report.summary.purchases,
      revenueCents: report.summary.revenueCents,
      emailAttributedRevenueCents: report.summary.emailAttributedRevenueCents,
      referralRevenueCents: report.summary.referralRevenueCents,
      bridgeToStudioRatePct: report.summary.bridgeToStudioRatePct,
    })

    return NextResponse.json({ ok: true, report })
  } catch (error) {
    await cronLogger.error(error, { step: "revenue-engine-weekly" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run revenue engine digest" },
      { status: 500 },
    )
  }
}
