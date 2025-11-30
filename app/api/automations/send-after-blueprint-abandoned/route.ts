/**
 * Automation: Send After Blueprint Abandoned
 * Cron job: Checks for users who started blueprint but didn't complete after 6 hours
 * GET /api/automations/send-after-blueprint-abandoned
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { welcomeEmail1, stripHtmlToText } from "@/lib/email/templates/maya-html"

const sql = neon(process.env.DATABASE_URL!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Automation] Checking for abandoned blueprints...")

    // Find subscribers who started blueprint but didn't complete after 6 hours
    const abandoned = await sql`
      SELECT 
        id,
        email,
        name,
        created_at,
        blueprint_completed
      FROM blueprint_subscribers
      WHERE blueprint_completed = false
        AND created_at < NOW() - INTERVAL '6 hours'
        AND created_at > NOW() - INTERVAL '24 hours'
        AND id NOT IN (
          SELECT subscriber_id FROM email_logs 
          WHERE email_type = 'blueprint-abandoned' 
          AND status = 'sent'
        )
      LIMIT 50
    `

    console.log(`[Automation] Found ${abandoned.length} abandoned blueprints`)

    const results = {
      checked: abandoned.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const subscriber of abandoned) {
      try {
        // Check if already sent
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscriber.email}
            AND email_type = 'blueprint-abandoned'
            AND status = 'sent'
          LIMIT 1
        `

        if (existingLog.length > 0) {
          continue
        }

        const firstName = subscriber.name?.split(" ")[0] || "there"
        const html = welcomeEmail1({ firstName })

        const result = await sendEmail({
          to: subscriber.email,
          subject: "Don't let your brand blueprint go unfinished ✨",
          html,
          text: stripHtmlToText(html),
          emailType: "blueprint-abandoned",
          tags: ["blueprint", "abandoned", "nurture"],
        })

        // Log to email_logs
        await sql`
          INSERT INTO email_logs (
            user_email,
            email_type,
            status,
            resend_message_id,
            timestamp
          )
          VALUES (
            ${subscriber.email},
            'blueprint-abandoned',
            ${result.success ? "sent" : "failed"},
            ${result.messageId || null},
            NOW()
          )
        `

        if (result.success) {
          results.sent++
          console.log(`[Automation] Abandoned blueprint email sent to: ${subscriber.email}`)
        } else {
          results.failed++
          results.errors.push(`${subscriber.email}: ${result.error}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(
          `${subscriber.email}: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(
      `[Automation] Abandoned blueprint check complete: ${results.sent} sent, ${results.failed} failed`,
    )

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error("[Automation] Error in send-after-blueprint-abandoned:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

