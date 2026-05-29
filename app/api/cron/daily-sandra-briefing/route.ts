import { type NextRequest, NextResponse } from "next/server"
import { buildDailySandraBriefing, generateDailySandraBriefingEmail } from "@/lib/admin/daily-sandra-briefing"
import { getGrowthIntelligenceReport } from "@/lib/admin/growth-intelligence"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = process.env.DAILY_SANDRA_BRIEFING_EMAIL || process.env.IG_AGENT_ADMIN_EMAIL || "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  const logger = createCronLogger("daily-sandra-briefing")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logger.error(new Error("Unauthorized"), { reason: "invalid_cron_secret" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (process.env.DAILY_SANDRA_BRIEFING_ENABLED !== "true") {
      await logger.success({ sent: false, skipped: "disabled" })
      return NextResponse.json({ success: true, sent: false, skipped: "disabled" })
    }

    const report = await getGrowthIntelligenceReport(7)
    const briefing = buildDailySandraBriefing(report)
    const email = generateDailySandraBriefingEmail(briefing)
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      from: "SSELFIE Intelligence <hello@sselfie.ai>",
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "daily_sandra_briefing",
      tags: ["growth-intelligence", "daily-briefing"],
    })

    await logger.success({
      sent: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      priorities: briefing.codexNext.length + briefing.sandraNext.length,
    })

    return NextResponse.json({
      success: result.success,
      sent: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      briefing,
    })
  } catch (error) {
    await logger.error(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to send daily Sandra briefing" }, { status: 500 })
  }
}
