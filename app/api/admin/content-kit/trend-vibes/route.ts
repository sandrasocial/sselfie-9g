import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import {
  isUsableWeeklyTrend,
  type WeeklyContentBrief,
  type WeeklyTrendRadarEntry,
} from "@/lib/content/weekly-brief-contract"

// SHOOT-TREND-PRESET-01: serves this week's live Trend Radar entries as selectable Shoot
// Studio story-collection vibe presets (Sandra's ask, 2026-07-05: "a new preset that helps
// me create the trends we're pulling from the weekly brief"). "This week only" per Sandra -
// no accumulating trend-preset library, just whatever the freshest stored brief carries.
export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"
// A bit more than 7 days so a brief that ran a day late (or a manual admin regenerate) still
// counts as "this week" - matches the staleness window used elsewhere for the same report type.
const THIS_WEEK_MAX_AGE_MS = 9 * 24 * 60 * 60 * 1000

async function requireAdmin(request: NextRequest) {
  const bearer = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
  const row = rows[0] as { created_at?: string; payload?: WeeklyContentBrief } | undefined
  const age = row?.created_at ? Date.now() - new Date(row.created_at).getTime() : Infinity
  if (!row?.payload || age > THIS_WEEK_MAX_AGE_MS) {
    return NextResponse.json({ trends: [] })
  }

  const trends = (Array.isArray(row.payload.trendRadar) ? row.payload.trendRadar : [])
    .filter(entry => Boolean(entry?.vibePreset?.trim()))
    .filter((entry): entry is WeeklyTrendRadarEntry => isUsableWeeklyTrend(entry))
    .map(entry => ({ trend: entry.trend, vibePreset: entry.vibePreset }))

  return NextResponse.json({ trends })
}
