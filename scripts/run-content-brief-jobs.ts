// Background/local runner for admin-triggered weekly content briefs.
// Run with: pnpm content-brief:worker
/* eslint-disable no-console */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

const envPath = resolve(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  config({ path: envPath })
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function main() {
  const {
    claimNextContentBriefJob,
    completeContentBriefJob,
    failContentBriefJob,
    markContentBriefJobPhase,
  } = await import("@/lib/content-engine/brief-jobs")
  const {
    generateContentBrief,
    generateContentBriefResearchMemo,
    generateDailyStoriesForBrief,
  } = await import("@/lib/content-engine/brief-generator")
  const { storeAnalyticsReport } = await import("@/lib/analytics/reports")

  const job = await claimNextContentBriefJob()
  if (!job) {
    console.log("[content-brief-worker] No queued content brief jobs.")
    return
  }

  const started = Date.now()
  console.log(`[content-brief-worker] Claimed job #${job.id}`)

  try {
    await markContentBriefJobPhase(job.id, "research", {
      researchStartedAt: new Date().toISOString(),
    })
    console.log("[content-brief-worker] Research memo started")
    const memo = await generateContentBriefResearchMemo()
    const memoPeriodEnd = new Date()
    const memoPeriodStart = new Date(memoPeriodEnd)
    memoPeriodStart.setDate(memoPeriodStart.getDate() - 7)
    await storeAnalyticsReport({
      reportType: "content_brief_research_memo",
      periodStart: memoPeriodStart,
      periodEnd: memoPeriodEnd,
      payload: {
        memo,
        source: "content_brief_worker",
        jobId: job.id,
      },
    })

    await markContentBriefJobPhase(job.id, "build", {
      researchCompletedAt: new Date().toISOString(),
      memoChars: memo.length,
    })
    console.log(`[content-brief-worker] Research memo done (${memo.length} chars)`)
    console.log("[content-brief-worker] Weekly plan started")
    const brief = await generateContentBrief({ prebuiltResearchMemo: memo })
    const baseReportId = await storeAnalyticsReport({
      reportType: "content_brief_weekly",
      periodStart: new Date(brief.periodStart),
      periodEnd: new Date(brief.periodEnd),
      payload: brief,
    })

    await markContentBriefJobPhase(job.id, "stories", {
      buildCompletedAt: new Date().toISOString(),
      contentPieces: brief.contentPlan.length,
      baseReportId,
    })
    console.log(`[content-brief-worker] Weekly plan stored (${brief.contentPlan.length} pieces)`)
    console.log("[content-brief-worker] Daily stories started")

    try {
      const dailyStories = await generateDailyStoriesForBrief(brief)
      const fullBrief = { ...brief, dailyStories }
      const finalReportId = await storeAnalyticsReport({
        reportType: "content_brief_weekly",
        periodStart: new Date(fullBrief.periodStart),
        periodEnd: new Date(fullBrief.periodEnd),
        payload: fullBrief,
      })
      await completeContentBriefJob(job.id, {
        resultReportId: finalReportId,
        payloadPatch: {
          completedAt: new Date().toISOString(),
          contentPieces: fullBrief.contentPlan.length,
          dailyStories: dailyStories.length,
          durationSeconds: Math.round((Date.now() - started) / 1000),
          finalReportId,
        },
      })
      console.log(
        `[content-brief-worker] Job #${job.id} completed with ${dailyStories.length} daily story sequences.`
      )
    } catch (storyError) {
      const storyMessage = messageFromError(storyError)
      await completeContentBriefJob(job.id, {
        resultReportId: baseReportId,
        payloadPatch: {
          completedAt: new Date().toISOString(),
          contentPieces: brief.contentPlan.length,
          dailyStories: 0,
          storiesError: storyMessage,
          durationSeconds: Math.round((Date.now() - started) / 1000),
          finalReportId: baseReportId,
        },
      })
      console.warn(
        `[content-brief-worker] Job #${job.id} stored the weekly plan, but daily stories failed: ${storyMessage}`
      )
    }
  } catch (error) {
    const errorMessage = messageFromError(error)
    await failContentBriefJob(job.id, {
      error: errorMessage,
      payloadPatch: {
        failedAt: new Date().toISOString(),
        durationSeconds: Math.round((Date.now() - started) / 1000),
      },
    })
    console.error(`[content-brief-worker] Job #${job.id} failed: ${errorMessage}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[content-brief-worker] Fatal error:", messageFromError(error))
  process.exit(1)
})
