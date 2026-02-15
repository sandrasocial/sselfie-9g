import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  generateCohortDeliveryLoadReport,
  getLatestAnalyticsReports,
  logCohortDeliveryLoadEntry,
  storeAnalyticsReport,
} from "@/lib/analytics/reports"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const [latest, reports] = await Promise.all([
    generateCohortDeliveryLoadReport({ months: 4 }),
    getLatestAnalyticsReports({ reportType: "cohort_delivery_load_weekly", limit: 8 }),
  ])

  return NextResponse.json({ latest, reports })
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const payload = await req.json().catch(() => ({}))
  const mode = String(payload?.mode || "").toLowerCase()
  const hours = Number(payload?.hours || 0)

  let inserted: any = null
  if (mode === "live" || mode === "async") {
    inserted = await logCohortDeliveryLoadEntry({
      mode,
      hours,
      sessionDate: payload?.sessionDate,
      cohortLabel: payload?.cohortLabel,
      notes: payload?.notes,
      loggedBy: "admin",
    })
  }

  const latest = await generateCohortDeliveryLoadReport({ months: 4 })
  await storeAnalyticsReport({
    reportType: "cohort_delivery_load_weekly",
    periodStart: new Date(latest.periodStart),
    periodEnd: new Date(latest.periodEnd),
    payload: latest,
  })

  return NextResponse.json({ ok: true, inserted, latest })
}
