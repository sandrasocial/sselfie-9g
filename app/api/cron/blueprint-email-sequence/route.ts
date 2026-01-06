import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"

/**
 * Blueprint Email Sequence - DISABLED
 * 
 * This cron job is disabled as it overlaps with send-blueprint-followups.
 * Blueprint followup emails are now handled by /api/cron/send-blueprint-followups
 * 
 * GET /api/cron/blueprint-email-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("blueprint-email-sequence")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[Blueprint Email Sequence] This cron is disabled - blueprint followups are handled by send-blueprint-followups")

    await cronLogger.success({
      message: "Disabled - handled by send-blueprint-followups",
      skipped: true,
    })

    return NextResponse.json({
      success: true,
      message: "This cron is disabled. Blueprint followup emails are handled by /api/cron/send-blueprint-followups",
      skipped: true,
    })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
