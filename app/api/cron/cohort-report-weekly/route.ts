import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { generateCohortWeeklyReport, storeAnalyticsReport } from "@/lib/analytics/reports"

/**
 * Weekly cohort report (best-effort).
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("cohort-report-weekly")
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

    const weeks = Number(process.env.COHORT_REPORT_WEEKS || 8)
    const payload = await generateCohortWeeklyReport({ weeks })

    // Store a weekly snapshot with a 7-day window anchor (end = now).
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    await storeAnalyticsReport({
      reportType: "cohorts_weekly",
      periodStart,
      periodEnd,
      payload,
    })

    await cronLogger.success({ stored: true, payload })
    return NextResponse.json({ success: true, payload })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json({ success: false, error: error?.message || "Failed to generate cohort report" }, { status: 500 })
  }
}

