/**
 * Weekly Newsletter Cron Job
 * Generates and sends weekly newsletter using Maya
 * Should run weekly (e.g., every Monday at 9 AM)
 */

import { NextResponse } from "next/server"
import { generateAndSendWeeklyNewsletter } from "@/lib/email/automations"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized weekly newsletter request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting weekly newsletter generation and send...")

    const result = await generateAndSendWeeklyNewsletter()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          sent: result.sent,
        },
        { status: 500 },
      )
    }

    console.log(`[Cron] Weekly newsletter sent to ${result.sent} subscribers`)

    return NextResponse.json({
      success: true,
      sent: result.sent,
    })
  } catch (error) {
    console.error("[Cron] Error sending weekly newsletter:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

