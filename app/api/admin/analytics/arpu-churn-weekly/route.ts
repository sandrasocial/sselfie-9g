import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  generateArpuChurnWeeklyReport,
  getLatestAnalyticsReports,
  storeAnalyticsReport,
} from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "arpu_churn_weekly", limit: 12 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const payload = await generateArpuChurnWeeklyReport({ lookbackDays: 30 })
  await storeAnalyticsReport({
    reportType: "arpu_churn_weekly",
    periodStart: new Date(payload.periodStart),
    periodEnd: new Date(payload.periodEnd),
    payload,
  })

  return NextResponse.json({ ok: true, payload })
}
