/**
 * Automation: Weekly Nurture Email
 * Cron job: Sends weekly newsletter every Friday at 9 AM
 * GET /api/automations/send-weekly-nurture
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { generateAndSendWeeklyNewsletter } from "@/lib/email/automations"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Automation] Starting weekly nurture email...")

    // Use the existing weekly newsletter automation
    const result = await generateAndSendWeeklyNewsletter()

    if (!result.success) {
      console.error("[Automation] Failed to send weekly nurture:", result.error)
      return NextResponse.json(
        {
          success: false,
          sent: result.sent,
          error: result.error,
        },
        { status: 500 },
      )
    }

    // Log to email_logs (bulk insert for all recipients)
    // Note: The automation function handles individual logging, but we log the batch here
    await sql`
      INSERT INTO email_logs (
        user_email,
        email_type,
        status,
        timestamp
      )
      VALUES (
        'batch@sselfie.ai',
        'weekly-nurture',
        'sent',
        NOW()
      )
    `.catch((err) => {
      console.error("[Automation] Failed to log weekly nurture batch:", err)
    })

    console.log(`[Automation] Weekly nurture sent to ${result.sent} subscribers`)

    return NextResponse.json({
      success: true,
      sent: result.sent,
    })
  } catch (error) {
    console.error("[Automation] Error in send-weekly-nurture:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

