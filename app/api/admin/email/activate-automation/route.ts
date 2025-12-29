import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Activate a Resend automation sequence
 */
export async function POST(request: Request) {
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

    const body = await request.json()
    const { sequenceId, startTime = "now" } = body

    if (!sequenceId) {
      return NextResponse.json(
        { error: "Sequence ID required" },
        { status: 400 }
      )
    }

    console.log(`[v0] Activating automation sequence ${sequenceId}...`)

    // Get sequence from database
    const sequenceRecord = await sql`
      SELECT id, campaign_name, body_html, target_audience, status
      FROM admin_email_campaigns
      WHERE id = ${sequenceId}
      AND campaign_type = 'resend_automation_sequence'
    `

    if (sequenceRecord.length === 0) {
      return NextResponse.json(
        { error: `Sequence ${sequenceId} not found` },
        { status: 404 }
      )
    }

    const sequence = sequenceRecord[0]
    
    // Check if sequence is already active
    if (sequence.status === 'active') {
      // Check if broadcasts already exist for this sequence
      const existingBroadcasts = await sql`
        SELECT id, resend_broadcast_id, status, scheduled_for
        FROM admin_email_campaigns
        WHERE campaign_type = 'resend_automation_email'
        AND (target_audience->>'sequence_id')::text = ${sequenceId.toString()}
        AND status IN ('scheduled', 'sent', 'sending')
        ORDER BY created_at DESC
      `

      if (existingBroadcasts.length > 0) {
        return NextResponse.json({
          success: false,
          error: "Sequence already activated",
          message: `This sequence is already active with ${existingBroadcasts.length} scheduled/sent emails. To reactivate, please deactivate it first or create a new sequence.`,
          existingBroadcasts: existingBroadcasts.length,
        }, { status: 409 }) // 409 Conflict
      }
    }

    const sequenceData = JSON.parse(sequence.body_html)
    const audience = sequence.target_audience as any
    const segmentId = audience?.resend_segment_id

    if (!segmentId) {
      return NextResponse.json(
        { error: "Sequence missing segment ID" },
        { status: 400 }
      )
    }

    // Calculate start time
    const startDate = startTime === "now" ? new Date() : new Date(startTime)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start time format. Use "now" or ISO timestamp.' },
        { status: 400 }
      )
    }

    // Create scheduled broadcasts for each email
    const broadcastIds: string[] = []
    let cumulativeDelay = 0

    for (const email of sequenceData.emails) {
      const emailSendTime = new Date(startDate)
      emailSendTime.setDate(emailSendTime.getDate() + cumulativeDelay + email.delayDays)
      cumulativeDelay += email.delayDays

      try {
        // Validate email data
        if (!email.html || typeof email.html !== 'string' || email.html.trim().length === 0) {
          console.error(`[v0] ❌ Email ${email.number} has invalid or empty HTML`)
          console.error(`[v0] Email data:`, { number: email.number, subject: email.subject, hasHtml: !!email.html, htmlLength: email.html?.length })
          continue
        }

        if (!email.subject || typeof email.subject !== 'string' || email.subject.trim().length === 0) {
          console.error(`[v0] ❌ Email ${email.number} has invalid or empty subject`)
          continue
        }

        console.log(`[v0] Creating broadcast for email ${email.number}: "${email.subject}" (HTML length: ${email.html.length})`)

        // Create broadcast
        const broadcast = await resend.broadcasts.create({
          segmentId: segmentId,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          subject: email.subject,
          html: email.html,
        })

        if (broadcast.error || !broadcast.data?.id) {
          console.error(`[v0] ❌ Failed to create broadcast for email:`, email.subject)
          console.error(`[v0] Broadcast error details:`, JSON.stringify(broadcast.error, null, 2))
          console.error(`[v0] Broadcast response:`, JSON.stringify(broadcast, null, 2))
          continue
        }

        const broadcastId = broadcast.data.id

        // Schedule broadcast
        await resend.broadcasts.send(broadcastId, {
          scheduledAt: emailSendTime.toISOString(),
        })

        broadcastIds.push(broadcastId)

        // Check if this email already exists for this sequence
        const existingEmail = await sql`
          SELECT id, resend_broadcast_id, status
          FROM admin_email_campaigns
          WHERE campaign_type = 'resend_automation_email'
          AND (target_audience->>'sequence_id')::text = ${sequenceId.toString()}
          AND (target_audience->>'email_number')::text = ${email.number.toString()}
          LIMIT 1
        `

        if (existingEmail.length > 0) {
          console.log(`[v0] ⚠️ Email ${email.number} already exists for sequence ${sequenceId}, skipping duplicate`)
          continue
        }

        // Save each email as campaign record
        await sql`
          INSERT INTO admin_email_campaigns (
            campaign_name, campaign_type, subject_line,
            body_html, body_text, status, resend_broadcast_id,
            target_audience, scheduled_for, created_by, created_at
          ) VALUES (
            ${`${sequence.campaign_name} - Email ${email.number}`}, 'resend_automation_email', ${email.subject},
            ${email.html}, '', 'scheduled', ${broadcastId},
            ${JSON.stringify({
              resend_segment_id: segmentId,
              sequence_id: sequenceId,
              email_number: email.number,
            })}::jsonb,
            ${emailSendTime.toISOString()},
            ${ADMIN_EMAIL}, NOW()
          )
        `

        console.log(`[v0] ✅ Scheduled email ${email.number}: "${email.subject}" for ${emailSendTime.toISOString()}`)
      } catch (emailError: any) {
        console.error(`[v0] ❌ Error scheduling email:`, emailError)
      }
    }

    // Update sequence status
    await sql`
      UPDATE admin_email_campaigns
      SET status = 'active', updated_at = NOW()
      WHERE id = ${sequenceId}
    `

    return NextResponse.json({
      success: true,
      sequenceId,
      broadcastIds,
      scheduledEmails: broadcastIds.length,
      startTime: startDate.toISOString(),
      message: `Automation activated! 🚀 ${broadcastIds.length} emails scheduled starting ${startTime === "now" ? "immediately" : startDate.toISOString()}`,
    })
  } catch (error: any) {
    console.error("[v0] Error activating automation:", error)
    return NextResponse.json(
      { error: "Failed to activate automation", details: error.message },
      { status: 500 }
    )
  }
}

