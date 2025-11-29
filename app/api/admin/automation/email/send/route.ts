import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"
import { sendEmail } from "@/lib/email/resend"

/**
 * POST /api/admin/automation/email/send
 * Send email via Resend and update tracking fields in Neon database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    const { emailId } = body

    if (!emailId) {
      return NextResponse.json({ error: "emailId is required" }, { status: 400 })
    }

    const emailRecords = await sql`
      SELECT id, user_id, email, subject, html, status
      FROM marketing_email_queue
      WHERE id = ${emailId}
      LIMIT 1
    `

    if (emailRecords.length === 0) {
      return NextResponse.json({ error: "Email not found in queue" }, { status: 404 })
    }

    const emailRecord = emailRecords[0]

    if (emailRecord.status === "sent") {
      return NextResponse.json({ error: "Email already sent" }, { status: 400 })
    }

    const sendResult = await sendEmail({
      to: emailRecord.email,
      subject: emailRecord.subject,
      html: emailRecord.html,
    })

    if (!sendResult.success) {
      await sql`
        UPDATE marketing_email_queue
        SET status = 'failed', 
            error_message = ${sendResult.error || "Unknown error"},
            updated_at = NOW()
        WHERE id = ${emailId}
      `

      return NextResponse.json({ error: "Failed to send email", details: sendResult.error }, { status: 500 })
    }

    await sql`
      UPDATE marketing_email_queue
      SET status = 'sent',
          sent_at = NOW(),
          updated_at = NOW()
      WHERE id = ${emailId}
    `

    await sql`
      INSERT INTO email_logs (user_email, email_type, status, sent_at, resend_message_id)
      VALUES (${emailRecord.email}, 'marketing_automation', 'sent', NOW(), ${sendResult.messageId})
    `

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      message: `Email sent successfully to ${emailRecord.email}`,
    })
  } catch (error) {
    console.error("[Automation] Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
