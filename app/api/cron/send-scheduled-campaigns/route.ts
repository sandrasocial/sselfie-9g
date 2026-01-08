import { NextResponse } from "next/server"
import { runScheduledCampaigns } from "@/lib/email/run-scheduled-campaigns"
import { createCronLogger } from "@/lib/cron-logger"
import { isEmailTestMode } from "@/lib/email/email-control"

/**
 * Cron Job: Send Scheduled Campaigns
 * 
 * Automatically processes scheduled email campaigns from admin_email_campaigns table.
 * Runs every 15 minutes to check for campaigns that are due to be sent.
 * 
 * Schedule: every 15 minutes (cron pattern: star-slash-15 star star star star)
 * 
 * Respects global email test mode setting - if test mode is enabled, runs in test mode
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("send-scheduled-campaigns")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [Scheduled Campaigns] Unauthorized")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Check global email test mode setting
    const testModeEnabled = await isEmailTestMode()
    const mode = testModeEnabled ? "test" : "live"

    if (testModeEnabled) {
      console.log("[v0] [Scheduled Campaigns] ⚠️ Global test mode is enabled - running in test mode")
    } else {
      console.log("[v0] [Scheduled Campaigns] Running in live mode")
    }

    console.log("[v0] [Scheduled Campaigns] Starting scheduled campaign check...")

    const result = await runScheduledCampaigns({ mode })

    console.log(`[v0] [Scheduled Campaigns] Completed: ${result.length} campaign(s) processed`)

    // Calculate email stats from results
    const totalEmails = result.reduce((sum, r) => sum + (r.recipients?.total || 0), 0)
    const emailsSent = result.reduce((sum, r) => sum + (r.recipients?.sent || 0), 0)
    const emailsFailed = result.reduce((sum, r) => sum + (r.recipients?.failed || 0), 0)

    await cronLogger.success({
      campaignsProcessed: result.length,
      emailsAttempted: totalEmails,
      emailsSent,
      emailsFailed,
    })

    return NextResponse.json({
      success: true,
      campaignsProcessed: result.length,
      results: result,
    })
  } catch (error: any) {
    console.error("[v0] [Scheduled Campaigns] Error:", error)
    await cronLogger.error(error, {
      cronJob: "send-scheduled-campaigns",
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to process scheduled campaigns" 
      }, 
      { status: 500 }
    )
  }
}

