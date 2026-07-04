import { type NextRequest, NextResponse } from "next/server"
import {
  generateContentBrief,
  generateContentBriefResearchMemo,
  generateDailyStoriesForBrief,
  type ContentBrief,
} from "@/lib/content-engine/brief-generator"
import { getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"
import {
  claimNextContentBriefJob,
  completeContentBriefJob,
  failContentBriefJob,
  getLatestContentBriefJob,
  markContentBriefJobPhase,
} from "@/lib/content-engine/brief-jobs"
import { createCronLogger } from "@/lib/cron-logger"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Drains the admin "Queue this week's brief" button (app/api/admin/content-brief POST inserts
// a content_brief_jobs row) without anyone running `pnpm content-brief:worker` by hand - Sandra
// is not going to open a terminal. Runs one phase per invocation, same pattern as the Monday
// content-brief-weekly cron (research -> build -> stories, each its own call under the 300s
// serverless cap), so a queued job drains itself over a few ticks with zero manual step.
const RESEARCH_MEMO_MAX_AGE_MS = 6 * 60 * 60 * 1000

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

export async function GET(request: NextRequest) {
  const logger = createCronLogger("content-brief-jobs-tick")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logger.error(new Error("Unauthorized"), { reason: "invalid_cron_secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const latest = await getLatestContentBriefJob()
    if (!latest || latest.status === "completed" || latest.status === "failed") {
      await logger.success({ ticked: false, reason: "no active job" })
      return NextResponse.json({ success: true, ticked: false })
    }

    const job = latest.status === "queued" ? await claimNextContentBriefJob() : latest
    if (!job) {
      await logger.success({ ticked: false, reason: "job already claimed elsewhere" })
      return NextResponse.json({ success: true, ticked: false })
    }

    if (job.phase === "research" || job.phase === "queued") {
      const memo = await generateContentBriefResearchMemo()
      const now = new Date()
      await storeAnalyticsReport({
        reportType: "content_brief_research_memo",
        periodStart: now,
        periodEnd: now,
        payload: { memo, source: "admin_job_tick", jobId: job.id },
      })
      await markContentBriefJobPhase(job.id, "build", { researchCompletedAt: now.toISOString() })
      await logger.success({ ticked: true, jobId: job.id, phase: "research", memoChars: memo.length })
      return NextResponse.json({ success: true, ticked: true, jobId: job.id, phase: "research" })
    }

    if (job.phase === "build") {
      const prebuiltResearchMemo = await getFreshResearchMemo()
      const brief = await generateContentBrief({ prebuiltResearchMemo })
      const reportId = await storeAnalyticsReport({
        reportType: "content_brief_weekly",
        periodStart: new Date(brief.periodStart),
        periodEnd: new Date(brief.periodEnd),
        payload: brief,
      })
      await markContentBriefJobPhase(job.id, "stories", {
        buildCompletedAt: new Date().toISOString(),
        contentPieces: brief.contentPlan.length,
        baseReportId: reportId,
      })
      await logger.success({
        ticked: true,
        jobId: job.id,
        phase: "build",
        pieces: brief.contentPlan.length,
      })
      return NextResponse.json({ success: true, ticked: true, jobId: job.id, phase: "build" })
    }

    // phase === "stories"
    const rows = await getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 })
    const row = rows[0] as { id?: number; payload?: ContentBrief } | undefined
    const storedBrief = row?.payload?.contentPlan ? row.payload : null
    if (!storedBrief) {
      throw new Error("Stories phase found no stored weekly brief to build from.")
    }

    let dailyStories: ContentBrief["dailyStories"]
    let storiesError: string | null = null
    let finalReportId = row?.id ?? null
    try {
      dailyStories = await generateDailyStoriesForBrief(storedBrief)
      finalReportId = await storeAnalyticsReport({
        reportType: "content_brief_weekly",
        periodStart: new Date(storedBrief.periodStart),
        periodEnd: new Date(storedBrief.periodEnd),
        payload: { ...storedBrief, dailyStories },
      })
    } catch (error) {
      storiesError = error instanceof Error ? error.message : String(error)
      console.error("[content-brief-jobs-tick] daily stories pass failed:", error)
    }

    await completeContentBriefJob(job.id, {
      resultReportId: finalReportId,
      payloadPatch: {
        completedAt: new Date().toISOString(),
        contentPieces: storedBrief.contentPlan.length,
        dailyStories: dailyStories?.length ?? 0,
        storiesError,
      },
    })
    await logger.success({
      ticked: true,
      jobId: job.id,
      phase: "stories",
      dailyStories: dailyStories?.length ?? 0,
      storiesError,
    })
    return NextResponse.json({ success: true, ticked: true, jobId: job.id, phase: "stories" })
  } catch (error: any) {
    const latest = await getLatestContentBriefJob().catch(() => null)
    if (latest && (latest.status === "queued" || latest.status === "running")) {
      await failContentBriefJob(latest.id, {
        error: error?.message || "Content brief job tick failed",
      }).catch(() => {})
    }
    await logger.error(error, { reason: "content_brief_job_tick_failed" })
    return NextResponse.json(
      { success: false, error: error?.message || "Content brief job tick failed" },
      { status: 500 }
    )
  }
}
