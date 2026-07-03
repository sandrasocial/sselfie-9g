import { type NextRequest, NextResponse } from "next/server"
import {
  generateContentBrief,
  generateContentBriefResearchMemo,
  generateDailyStoriesForBrief,
  type ContentBrief,
} from "@/lib/content-engine/brief-generator"
import { getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"

// The full pipeline (web research + three generation passes) outruns the 300s function cap,
// so vercel.json fires this route three times on Mondays: ?phase=research at 06:00 stores
// the memo, the default build phase at 06:30 consumes it and stores the brief, and
// ?phase=stories at 07:00 adds the seven daily story sequences and sends Sandra the email.
// A memo/brief older than this is stale and the phase falls back (research regenerates
// inline accepting timeout risk; stories refuses rather than decorating an old week).
const RESEARCH_MEMO_MAX_AGE_MS = 6 * 60 * 60 * 1000

async function getFreshResearchMemo(): Promise<string | null> {
  const rows = await getLatestAnalyticsReports({ reportType: "content_brief_research_memo", limit: 1 })
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

export async function GET(request: NextRequest) {
  const phaseParam = request.nextUrl.searchParams.get("phase")
  const phase =
    phaseParam === "research" ? "research" : phaseParam === "stories" ? "stories" : "build"
  const logger = createCronLogger(
    phase === "research"
      ? "content-brief-weekly-research"
      : phase === "stories"
        ? "content-brief-weekly-stories"
        : "content-brief-weekly",
  )
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logger.error(new Error("Unauthorized"), { reason: "invalid_cron_secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (process.env.CONTENT_BRIEF_ENABLED !== "true") {
      await logger.success({ generated: false, skipped: "disabled" })
      return NextResponse.json({ success: true, generated: false, skipped: "disabled" })
    }

    if (phase === "research") {
      const memo = await generateContentBriefResearchMemo()
      const now = new Date()
      await storeAnalyticsReport({
        reportType: "content_brief_research_memo",
        periodStart: now,
        periodEnd: now,
        payload: { memo },
      })
      await logger.success({ generated: true, phase: "research", memoChars: memo.length })
      return NextResponse.json({ success: true, phase: "research", memoChars: memo.length })
    }

    if (phase === "stories") {
      const storedBrief = await getFreshStoredBrief()
      if (!storedBrief) {
        throw new Error(
          "Stories phase found no fresh weekly brief to build from. Run the build phase first."
        )
      }
      // Fail-open on the stories themselves: a broken stories pass must never cost Sandra
      // the whole Monday brief email. She gets the feed plan either way.
      let dailyStories: ContentBrief["dailyStories"]
      let storiesError: string | null = null
      try {
        dailyStories = await generateDailyStoriesForBrief(storedBrief)
        await storeAnalyticsReport({
          reportType: "content_brief_weekly",
          periodStart: new Date(storedBrief.periodStart),
          periodEnd: new Date(storedBrief.periodEnd),
          payload: { ...storedBrief, dailyStories },
        })
      } catch (error) {
        storiesError = error instanceof Error ? error.message : String(error)
        console.error("[content-brief-weekly] daily stories pass failed:", error)
      }
      await sendBriefEmail(storedBrief, dailyStories?.length ?? 0, storiesError)
      await logger.success({
        generated: true,
        phase: "stories",
        dailyStories: dailyStories?.length ?? 0,
        storiesError,
      })
      return NextResponse.json({
        success: true,
        phase: "stories",
        dailyStories: dailyStories?.length ?? 0,
        storiesError,
      })
    }

    const prebuiltResearchMemo = await getFreshResearchMemo()
    const brief = await generateContentBrief({ prebuiltResearchMemo })

    await storeAnalyticsReport({
      reportType: "content_brief_weekly",
      periodStart: new Date(brief.periodStart),
      periodEnd: new Date(brief.periodEnd),
      payload: brief,
    })

    await logger.success({
      generated: true,
      pieces: brief.contentPlan.length,
      hooks: brief.hookIntelligence.length,
      insightsLevel: brief.accountSnapshot.insightsLevel,
    })

    return NextResponse.json({
      success: true,
      generated: true,
      pieces: brief.contentPlan.length,
      insightsLevel: brief.accountSnapshot.insightsLevel,
    })
  } catch (error: any) {
    await logger.error(error, { reason: "content_brief_generation_failed" })
    return NextResponse.json(
      { success: false, error: error?.message || "Content brief generation failed" },
      { status: 500 },
    )
  }
}

// The Monday email goes out at the END of the pipeline (stories phase) so it can present
// the full week: 7 filmable feed scripts + 7 daily story sequences in one send.
async function sendBriefEmail(
  brief: ContentBrief,
  dailyStoriesCount: number,
  storiesError: string | null,
) {
    const topHooks = brief.hookIntelligence
      .slice(0, 3)
      .map((h) => `• ${h.hook}`)
      .join("\n")

    const demandText = brief.demandMap
      ? `\n\nDemand map:\n${[
          `Signal: ${brief.demandMap.strongestDemandSignal}`,
          `Before: ${brief.demandMap.painfulBefore}`,
          `After: ${brief.demandMap.desiredAfter}`,
          `Bridge: ${brief.demandMap.primaryOfferBridge}`,
        ].join("\n")}`
      : ""
    const demandHtml = brief.demandMap
      ? `<p><strong>Demand map</strong><br/>${[
          `Signal: ${escapeHtml(brief.demandMap.strongestDemandSignal)}`,
          `Before: ${escapeHtml(brief.demandMap.painfulBefore)}`,
          `After: ${escapeHtml(brief.demandMap.desiredAfter)}`,
          `Bridge: ${escapeHtml(brief.demandMap.primaryOfferBridge)}`,
        ].join("<br/>")}</p>`
      : ""

    const trendRadar = Array.isArray(brief.trendRadar) ? brief.trendRadar : []
    const trendText = trendRadar.length
      ? `\n\nTrend radar (this week's waves):\n${trendRadar
          .map((entry) => `• ${entry.trend}: ${entry.howSandraRidesIt}`)
          .join("\n")}`
      : ""
    const trendHtml = trendRadar.length
      ? `<p><strong>Trend radar</strong> (this week's waves):<br/>${trendRadar
          .map((entry) => `• ${escapeHtml(entry.trend)}: ${escapeHtml(entry.howSandraRidesIt)}`)
          .join("<br/>")}</p>`
      : ""

    // Old stored briefs predate onScreenHookBank; the block simply disappears then.
    const hookBank = Array.isArray(brief.onScreenHookBank) ? brief.onScreenHookBank : []
    const hookBankText = hookBank.length
      ? `\n\nOn-screen hooks this week (the text ON the video, not the caption):\n${hookBank
          .slice(0, 5)
          .map((entry) => `• ${entry.text}`)
          .join("\n")}`
      : ""
    const hookBankHtml = hookBank.length
      ? `<p><strong>On-screen hooks this week</strong> (the text ON the video, not the caption):<br/>${hookBank
          .slice(0, 5)
          .map((entry) => `• ${escapeHtml(entry.text)}`)
          .join("<br/>")}</p>`
      : ""

    // SUITE-UX-02: Member pulse - what members did with Maya this week (source:
    // analytics_events behavior + app_v3_memory). Best-effort; never blocks the brief.
    let pulseText = ""
    let pulseHtml = ""
    try {
      const { buildMemberPulse } = await import("@/lib/admin/member-pulse")
      const pulse = await buildMemberPulse(7)
      const pct = (v: number | null) => (v === null ? "n/a" : `${Math.round(v * 100)}%`)
      if (pulse.activeMembers === 0 && pulse.imagesGenerated === 0) {
        pulseText = `\n\nMember pulse (last 7 days, source: analytics_events): no member activity logged yet this week.`
        pulseHtml = `<p><strong>Member pulse</strong> (last 7 days, source: analytics_events): no member activity logged yet this week.</p>`
      } else {
        const lines = [
          `${pulse.activeMembers} members created with Maya · ${pulse.imagesGenerated} images from ${pulse.conceptsEmitted} concepts`,
          `Loved it: ${pulse.downloads} downloads (${pct(pulse.downloadRate)} of images) · Friction: ${pulse.rerolls} re-rolls (${pct(pulse.rerollRate)}), ${pulse.edits} edits`,
          pulse.topVibes.length > 0
            ? `Top vibes: ${pulse.topVibes.map((v) => `${v.aestheticId} (${v.count})`).join(", ")}`
            : "",
          pulse.freshPreferenceNotes.length > 0
            ? `What they told Maya they want:\n${pulse.freshPreferenceNotes.map((n) => `  • ${n}`).join("\n")}`
            : "",
          pulse.recentEditAsks.length > 0
            ? `What they keep asking to change:\n${pulse.recentEditAsks.map((n) => `  • ${n}`).join("\n")}`
            : "",
        ].filter(Boolean)
        pulseText = `\n\nMember pulse (last 7 days, source: analytics_events + app_v3_memory):\n${lines.join("\n")}`
        pulseHtml = `<p><strong>Member pulse</strong> (last 7 days, source: analytics_events + app_v3_memory):<br/>${lines
          .map((l) => escapeHtml(l).replace(/\n/g, "<br/>"))
          .join("<br/>")}</p>`
      }
    } catch (pulseError) {
      console.error("[content-brief-weekly] member pulse skipped:", pulseError)
    }

    const storiesLine =
      dailyStoriesCount > 0
        ? `${brief.contentPlan.length} filmable feed scripts (one per day, captions included) and ${dailyStoriesCount} daily story sequences`
        : `${brief.contentPlan.length} filmable feed scripts (one per day, captions included). The daily story sequences failed to generate this run${storiesError ? ` (${storiesError})` : ""}, so this week's stories need a manual pass`

    await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Intelligence <hello@sselfie.ai>",
      subject: "Your week is planned: daily scripts + stories",
      text: `Hey Sandra,\n\nThis week is fully planned: ${storiesLine}. Every piece is a no-talking script: on-screen text, b-roll notes, caption, and the keyword CTA. Film once, post daily.${demandText}${trendText}${hookBankText}\n\nTop hooks this week:\n${topHooks}${pulseText}\n\nOpen it here: https://www.sselfie.ai/admin/content-brief\n\nEverything is a draft. Nothing posts without you.`,
      html: `<p>Hey Sandra,</p><p>This week is fully planned: ${escapeHtml(storiesLine)}. Every piece is a no-talking script: on-screen text, b-roll notes, caption, and the keyword CTA. Film once, post daily.</p>${demandHtml}${trendHtml}${hookBankHtml}<p><strong>Top hooks this week:</strong><br/>${brief.hookIntelligence
        .slice(0, 3)
        .map((h) => `• ${escapeHtml(h.hook)}`)
        .join("<br/>")}</p>${pulseHtml}<p><a href="https://www.sselfie.ai/admin/content-brief">Open the brief</a></p><p>Everything is a draft. Nothing posts without you.</p>`,
      emailType: "content_brief_weekly",
      tags: ["content-engine", "weekly-brief"],
    })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
