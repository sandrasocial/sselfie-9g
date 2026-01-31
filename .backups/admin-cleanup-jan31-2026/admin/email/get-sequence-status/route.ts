import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Get status of all emails in a sequence
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get("sequenceId")

    if (!sequenceId) {
      return NextResponse.json(
        { error: "Sequence ID is required" },
        { status: 400 }
      )
    }

    // Get sequence
    const sequenceRecord = await sql`
      SELECT id, campaign_name, body_html, status
      FROM admin_email_campaigns
      WHERE id = ${parseInt(sequenceId)}
      AND campaign_type = 'resend_automation_sequence'
    `

    if (sequenceRecord.length === 0) {
      return NextResponse.json(
        { error: `Sequence ${sequenceId} not found` },
        { status: 404 }
      )
    }

    const sequence = sequenceRecord[0]
    const sequenceData = JSON.parse(sequence.body_html)
    const emails = sequenceData.emails || []

    // Get all sent emails for this sequence
    const sentEmails = await sql`
      SELECT 
        id,
        campaign_name,
        subject_line,
        status,
        resend_broadcast_id,
        scheduled_for,
        sent_at,
        (target_audience->>'email_number')::text as email_number
      FROM admin_email_campaigns
      WHERE campaign_type = 'resend_automation_email'
      AND (target_audience->>'sequence_id')::text = ${sequenceId}
      ORDER BY (target_audience->>'email_number')::int
    `

    // Map sent emails by number
    const sentEmailsMap = new Map()
    sentEmails.forEach((email: any) => {
      sentEmailsMap.set(parseInt(email.email_number), {
        id: email.id,
        status: email.status,
        broadcastId: email.resend_broadcast_id,
        scheduledFor: email.scheduled_for,
        sentAt: email.sent_at,
      })
    })

    // Build status for each email in sequence
    const emailStatuses = emails.map((email: any) => {
      const sentEmail = sentEmailsMap.get(email.number)
      return {
        number: email.number,
        subject: email.subject,
        delayDays: email.delayDays || 0,
        status: sentEmail?.status || 'not_sent',
        hasBroadcast: !!sentEmail?.broadcastId,
        scheduledFor: sentEmail?.scheduledFor,
        sentAt: sentEmail?.sentAt,
        campaignId: sentEmail?.id,
      }
    })

    return NextResponse.json({
      success: true,
      sequenceId: parseInt(sequenceId),
      sequenceName: sequence.campaign_name,
      sequenceStatus: sequence.status,
      emails: emailStatuses,
      totalEmails: emails.length,
      sentEmails: emailStatuses.filter((e: any) => e.status !== 'not_sent').length,
      failedEmails: emailStatuses.filter((e: any) => e.status === 'not_sent' || e.status === 'failed').length,
    })
  } catch (error: any) {
    console.error("[v0] Error getting sequence status:", error)
    return NextResponse.json(
      { error: "Failed to get sequence status", details: error.message },
      { status: 500 }
    )
  }
}

