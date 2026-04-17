import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  generateRevenueEngineWeeklyReport,
  getLatestAnalyticsReports,
  storeAnalyticsReport,
} from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "revenue_engine_weekly", limit: 8 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const report = await generateRevenueEngineWeeklyReport({ days: Number(process.env.REVENUE_ENGINE_REPORT_WINDOW_DAYS || 30) })
  await storeAnalyticsReport({
    reportType: "revenue_engine_weekly",
    periodStart: new Date(report.periodStart),
    periodEnd: new Date(report.periodEnd),
    payload: report,
  })

  return NextResponse.json({ ok: true, report })
}
