import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { generateFunnelDailyReport, storeAnalyticsReport } from "@/lib/analytics/reports"

/**
 * Daily funnel report (best-effort).
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("funnel-report-daily")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const report = await generateFunnelDailyReport({ hours: Number(process.env.FUNNEL_REPORT_WINDOW_HOURS || 24) })
    await storeAnalyticsReport({
      reportType: "funnel_daily",
      periodStart: new Date(report.periodStart),
      periodEnd: new Date(report.periodEnd),
      payload: report,
    })

    await cronLogger.success({ stored: true, report })
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json({ success: false, error: error?.message || "Failed to generate funnel report" }, { status: 500 })
  }
}

