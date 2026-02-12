import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { generateBrandEngineLaunchDailyReport, storeAnalyticsReport } from "@/lib/analytics/reports"

/**
 * Daily Brand Engine launch digest.
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("brand-engine-launch-digest")
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

    const payload = await generateBrandEngineLaunchDailyReport({
      hours: Number(process.env.BRAND_ENGINE_LAUNCH_REPORT_WINDOW_HOURS || 24),
    })

    await storeAnalyticsReport({
      reportType: "brand_engine_launch_daily",
      periodStart: new Date(payload.periodStart),
      periodEnd: new Date(payload.periodEnd),
      payload,
    })

    await cronLogger.success({ stored: true, payload })
    return NextResponse.json({ success: true, payload })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate launch digest" },
      { status: 500 },
    )
  }
}

