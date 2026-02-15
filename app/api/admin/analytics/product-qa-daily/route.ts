import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { generateProductQaDailyReport, getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "product_qa_daily", limit: 14 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const payload = await generateProductQaDailyReport({
    hours: Number(process.env.PRODUCT_QA_DAILY_WINDOW_HOURS || 24),
  })

  await storeAnalyticsReport({
    reportType: "product_qa_daily",
    periodStart: new Date(payload.periodStart),
    periodEnd: new Date(payload.periodEnd),
    payload,
  })

  return NextResponse.json({ ok: true, payload })
}
