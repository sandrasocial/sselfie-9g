import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { generateCohortWeeklyReport, getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const reports = await getLatestAnalyticsReports({ reportType: "cohorts_weekly", limit: 8 })
  return NextResponse.json({ reports })
}

export async function POST() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const weeks = Number(process.env.COHORT_REPORT_WEEKS || 8)
  const payload = await generateCohortWeeklyReport({ weeks })
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  await storeAnalyticsReport({
    reportType: "cohorts_weekly",
    periodStart,
    periodEnd,
    payload,
  })

  return NextResponse.json({ ok: true, payload })
}

