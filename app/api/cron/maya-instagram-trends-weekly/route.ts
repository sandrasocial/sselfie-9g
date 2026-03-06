import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { storeAnalyticsReport } from "@/lib/analytics/reports"
import { collectMayaInstagramTrendSignals } from "@/lib/maya/calendar-trends"

export async function GET(req: Request) {
  const cronLogger = createCronLogger("maya-instagram-trends-weekly")
  await cronLogger.start()

  try {
    const isProduction = process.env.NODE_ENV === "production"
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")

    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const trends = await collectMayaInstagramTrendSignals()
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() - 7)

    await storeAnalyticsReport({
      reportType: "maya_instagram_trends_weekly",
      periodStart,
      periodEnd,
      payload: trends,
    })

    await cronLogger.success({
      sourceCount: trends.sourceUrls.length,
      hooks: trends.hookPatterns.length,
      ctas: trends.ctaPatterns.length,
      hashtags: trends.hashtagSets.length,
    })

    return NextResponse.json({
      success: true,
      trends,
    })
  } catch (error: any) {
    await cronLogger.error(error, { reason: "Failed to refresh Maya Instagram trends" })
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to refresh trends" },
      { status: 500 },
    )
  }
}
