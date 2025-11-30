/**
 * Email Queue Processor Cron Job
 * Processes pending emails from marketing_email_queue
 * Should run every 5 minutes via Vercel Cron
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Verify cron secret (set in Vercel env vars)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized email queue processor request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting email queue processing...")

    // Get all pending emails that are due
    const pendingEmails = await sql`
      SELECT 
        id, 
        user_id, 
        email, 
        subject, 
        html,
        scheduled_for
      FROM marketing_email_queue
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT 50
    `

    console.log(`[Cron] Found ${pendingEmails.length} pending emails to send`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const emailRecord of pendingEmails) {
      try {
        // Send the email using global email helper
        const result = await sendEmail({
          to: emailRecord.email,
          subject: emailRecord.subject,
          html: emailRecord.html,
          userId: emailRecord.user_id,
          emailType: "automated",
        })

        if (result.success) {
          // Mark as sent
          await sql`
            UPDATE marketing_email_queue
            SET status = 'sent', sent_at = NOW()
            WHERE id = ${emailRecord.id}
          `
          results.sent++
          console.log(`[Cron] Email sent to ${emailRecord.email}`)
        } else {
          // Mark as failed
          await sql`
            UPDATE marketing_email_queue
            SET status = 'failed', error_message = ${result.error || "Unknown error"}
            WHERE id = ${emailRecord.id}
          `
          results.failed++
          results.errors.push(`${emailRecord.email}: ${result.error}`)
          console.error(`[Cron] Failed to send email to ${emailRecord.email}:`, result.error)
        }
      } catch (error) {
        // Mark as failed
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        await sql`
          UPDATE marketing_email_queue
          SET status = 'failed', error_message = ${errorMsg}
          WHERE id = ${emailRecord.id}
        `
        results.failed++
        results.errors.push(`${emailRecord.email}: ${errorMsg}`)
        console.error(`[Cron] Error processing email ${emailRecord.id}:`, error)
      }

      // Rate limiting: wait 200ms between sends
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(
      `[Cron] Email queue processing complete: ${results.sent} sent, ${results.failed} failed`,
    )

    return NextResponse.json({
      success: true,
      processed: pendingEmails.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.slice(0, 10), // Limit error details
    })
  } catch (error) {
    console.error("[Cron] Error processing email queue:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

