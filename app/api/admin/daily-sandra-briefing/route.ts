import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { buildDailySandraBriefing, generateDailySandraBriefingEmail } from "@/lib/admin/daily-sandra-briefing"
import { getGrowthIntelligenceReport } from "@/lib/admin/growth-intelligence"

export const dynamic = "force-dynamic"

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  const adminCheck = await requireAdmin()
  return adminCheck.isAdmin
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedDays = Number(searchParams.get("days") || 7)
  const windowDays = [1, 3, 7, 14, 30].includes(requestedDays) ? requestedDays : 7
  const report = await getGrowthIntelligenceReport(windowDays)
  const briefing = buildDailySandraBriefing(report)
  const email = generateDailySandraBriefingEmail(briefing)

  return NextResponse.json({
    briefing,
    email,
  })
}
