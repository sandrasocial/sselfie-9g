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

    await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Intelligence <hello@sselfie.ai>",
      subject: "Your weekly content brief is ready",
      text: `Hey Sandra,\n\nThis week's content brief is ready: ${brief.contentPlan.length} posts and 1 story sequence, built from your own post data and what your audience copied most.\n\nTop hooks this week:\n${topHooks}\n\nOpen it here: https://www.sselfie.ai/admin/content-brief\n\nEverything is a draft. Nothing posts without you.`,
      html: `<p>Hey Sandra,</p><p>This week's content brief is ready: ${brief.contentPlan.length} posts and 1 story sequence, built from your own post data and what your audience copied most.</p><p><strong>Top hooks this week:</strong><br/>${brief.hookIntelligence
        .slice(0, 3)
        .map((h) => `• ${escapeHtml(h.hook)}`)
        .join("<br/>")}</p><p><a href="https://www.sselfie.ai/admin/content-brief">Open the brief</a></p><p>Everything is a draft. Nothing posts without you.</p>`,
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
