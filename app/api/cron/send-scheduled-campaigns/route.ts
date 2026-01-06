import { NextResponse } from "next/server"
import { runScheduledCampaigns } from "@/lib/email/run-scheduled-campaigns"
import { createCronLogger } from "@/lib/cron-logger"

/**
 * Cron Job: Send Scheduled Campaigns
 * 
 * Automatically processes scheduled email campaigns from admin_email_campaigns table.
 * Runs every 15 minutes to check for campaigns that are due to be sent.
 * 
 * Schedule: every 15 minutes (cron pattern: star-slash-15 star star star star)
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("send-scheduled-campaigns")
  cronLogger.start()

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

    console.log("[v0] [Scheduled Campaigns] Starting scheduled campaign check...")

    const result = await runScheduledCampaigns({ mode: "live" })

    console.log(`[v0] [Scheduled Campaigns] Completed: ${result.length} campaign(s) processed`)

    cronLogger.success({
      campaignsProcessed: result.length,
    })

    return NextResponse.json({
      success: true,
      campaignsProcessed: result.length,
      results: result,
    })
  } catch (error: any) {
    console.error("[v0] [Scheduled Campaigns] Error:", error)
    cronLogger.error(error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to process scheduled campaigns" 
      }, 
      { status: 500 }
    )
  }
}

