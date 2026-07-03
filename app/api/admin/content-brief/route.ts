import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  generateContentBrief,
  generateContentBriefResearchMemo,
  generateDailyStoriesForBrief,
  type ContentBrief,
} from "@/lib/content-engine/brief-generator"
import { getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"
const RESEARCH_MEMO_MAX_AGE_MS = 6 * 60 * 60 * 1000

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

async function getFreshResearchMemo(): Promise<string | null> {
  const rows = await getLatestAnalyticsReports({
    reportType: "content_brief_research_memo",
    limit: 1,
  })
  const row = rows[0] as { created_at?: string; payload?: { memo?: string } } | undefined
  if (!row?.payload?.memo) return null
  const age = Date.now() - new Date(row.created_at ?? 0).getTime()
  return age <= RESEARCH_MEMO_MAX_AGE_MS ? row.payload.memo : null
}

async function getFreshStoredBrief(): Promise<ContentBrief | null> {
  const rows = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
  const row = rows[0] as { created_at?: string; payload?: ContentBrief } | undefined
  if (!row?.payload?.contentPlan) return null
  const age = Date.now() - new Date(row.created_at ?? 0).getTime()
  return age <= RESEARCH_MEMO_MAX_AGE_MS ? row.payload : null
}

function resolvePhase(request: NextRequest) {
  const phase = request.nextUrl.searchParams.get("phase")
  if (phase === "research" || phase === "stories") return phase
  return "build"
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 8), 30)

  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit,
  })

  return NextResponse.json({ reports })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const phase = resolvePhase(request)

    if (phase === "research") {
      const memo = await generateContentBriefResearchMemo()
      const now = new Date()
      await storeAnalyticsReport({
        reportType: "content_brief_research_memo",
        periodStart: now,
        periodEnd: now,
        payload: { memo },
      })

      return NextResponse.json({ success: true, phase: "research", memoChars: memo.length })
    }

    if (phase === "stories") {
      const storedBrief = await getFreshStoredBrief()
      if (!storedBrief) {
        return NextResponse.json(
          {
            success: false,
            phase: "stories",
            code: "missing_content_brief",
            error: "No fresh weekly brief was found. Build the brief before adding daily stories.",
          },
          { status: 409 }
        )
      }

      try {
        const dailyStories = await generateDailyStoriesForBrief(storedBrief)
        const briefWithStories = { ...storedBrief, dailyStories }
        await storeAnalyticsReport({
          reportType: "content_brief_weekly",
          periodStart: new Date(storedBrief.periodStart),
          periodEnd: new Date(storedBrief.periodEnd),
          payload: briefWithStories,
        })

        return NextResponse.json({
          success: true,
          phase: "stories",
          dailyStories: dailyStories.length,
          brief: briefWithStories,
        })
      } catch (storiesError) {
        const storiesMessage =
          storiesError instanceof Error ? storiesError.message : "Daily stories failed"
        console.error("[content-brief] daily stories pass failed:", storiesError)
        return NextResponse.json({
          success: true,
          phase: "stories",
          dailyStories: 0,
          storiesError: storiesMessage,
          brief: storedBrief,
        })
      }
    }

    const prebuiltResearchMemo = await getFreshResearchMemo()
    if (!prebuiltResearchMemo) {
      return NextResponse.json(
        {
          success: false,
          phase: "build",
          code: "missing_research_memo",
          error:
            "The research memo is missing or stale. Run the research phase first, then build the brief.",
        },
        { status: 409 }
      )
    }

    const brief = await generateContentBrief({ prebuiltResearchMemo })

    await storeAnalyticsReport({
      reportType: "content_brief_weekly",
      periodStart: new Date(brief.periodStart),
      periodEnd: new Date(brief.periodEnd),
      payload: brief,
    })

    return NextResponse.json({ success: true, phase: "build", brief })
  } catch (error: unknown) {
    console.error("[content-brief] manual generation failed:", error)
    const message = error instanceof Error ? error.message : "Generation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
