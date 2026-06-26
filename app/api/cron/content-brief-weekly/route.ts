import { type NextRequest, NextResponse } from "next/server"
import { generateContentBrief } from "@/lib/content-engine/brief-generator"
import { storeAnalyticsReport } from "@/lib/analytics/reports"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  const logger = createCronLogger("content-brief-weekly")
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

    const brief = await generateContentBrief()

    await storeAnalyticsReport({
      reportType: "content_brief_weekly",
      periodStart: new Date(brief.periodStart),
      periodEnd: new Date(brief.periodEnd),
      payload: brief,
    })

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

    // SUITE-UX-02: Member pulse — what members did with Maya this week (source:
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

    await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Intelligence <hello@sselfie.ai>",
      subject: "Your weekly content brief is ready",
      text: `Hey Sandra,\n\nThis week's content brief is ready: ${brief.contentPlan.length} posts and 1 story sequence. It now starts from demand first: what your audience is trying to stop experiencing, what they want instead, and which offer naturally answers it.${demandText}\n\nTop hooks this week:\n${topHooks}${pulseText}\n\nOpen it here: https://www.sselfie.ai/admin/content-brief\n\nEverything is a draft. Nothing posts without you.`,
      html: `<p>Hey Sandra,</p><p>This week's content brief is ready: ${brief.contentPlan.length} posts and 1 story sequence. It now starts from demand first: what your audience is trying to stop experiencing, what they want instead, and which offer naturally answers it.</p>${demandHtml}<p><strong>Top hooks this week:</strong><br/>${brief.hookIntelligence
        .slice(0, 3)
        .map((h) => `• ${escapeHtml(h.hook)}`)
        .join("<br/>")}</p>${pulseHtml}<p><a href="https://www.sselfie.ai/admin/content-brief">Open the brief</a></p><p>Everything is a draft. Nothing posts without you.</p>`,
      emailType: "content_brief_weekly",
      tags: ["content-engine", "weekly-brief"],
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
