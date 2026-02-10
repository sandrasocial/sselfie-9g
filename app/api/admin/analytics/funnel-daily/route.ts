import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { generateFunnelDailyReport, getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "funnel_daily", limit: 14 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const report = await generateFunnelDailyReport({ hours: Number(process.env.FUNNEL_REPORT_WINDOW_HOURS || 24) })
  await storeAnalyticsReport({
    reportType: "funnel_daily",
    periodStart: new Date(report.periodStart),
    periodEnd: new Date(report.periodEnd),
    payload: report,
  })

  return NextResponse.json({ ok: true, report })
}

