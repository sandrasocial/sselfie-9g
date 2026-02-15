import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  generateBrandEngineLaunchDailyReport,
  getLatestAnalyticsReports,
  storeAnalyticsReport,
} from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "brand_engine_launch_daily", limit: 14 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
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

  return NextResponse.json({ ok: true, payload })
}
