// THIS WEEK - Monday pre-warm (2026-07-07). Generates the new week's platform trend digest
// (Anthropic + live web search) so the first member to open the app on Monday gets fresh
// ideas instantly instead of waiting on generation. Freshness does not DEPEND on this cron -
// the digest also generates lazily on first member request - this just makes Monday fast.
// Kill switch: WEEKLY_CONTENT_TRENDS_DISABLED=true.

import { type NextRequest, NextResponse } from "next/server"
import { getOrCreateWeeklyTrendDigest } from "@/lib/this-week/trends"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (process.env.WEEKLY_CONTENT_TRENDS_DISABLED === "true") {
    return NextResponse.json({ skipped: true, reason: "kill_switch" })
  }

  try {
    const { weekStart, digest } = await getOrCreateWeeklyTrendDigest()
    console.log(`[weekly-content-trends] week=${weekStart} trends=${digest.trends.length} provenance=${digest.provenance}`)
    return NextResponse.json({ weekStart, trendCount: digest.trends.length, provenance: digest.provenance })
  } catch (error) {
    console.error("[weekly-content-trends] failed:", error)
    return NextResponse.json({ error: "digest_failed" }, { status: 500 })
  }
}
