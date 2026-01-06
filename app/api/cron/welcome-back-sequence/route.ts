import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"

/**
 * Welcome Back Sequence - DISABLED
 * 
 * This cron job is disabled as it overlaps with reengagement-campaigns.
 * Re-engagement emails are now handled by /api/cron/reengagement-campaigns
 * 
 * GET /api/cron/welcome-back-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 11 AM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("welcome-back-sequence")
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

    console.log("[Welcome Back Sequence] This cron is disabled - re-engagement is handled by reengagement-campaigns")

    await cronLogger.success({
      message: "Disabled - handled by reengagement-campaigns",
      skipped: true,
    })

    return NextResponse.json({
      success: true,
      message: "This cron is disabled. Re-engagement emails are handled by /api/cron/reengagement-campaigns",
      skipped: true,
    })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
