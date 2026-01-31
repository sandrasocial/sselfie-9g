import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Resend a specific email from a sequence
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
    const { sequenceId, emailNumber, startTime = "now" } = body

    if (!sequenceId || !emailNumber) {
      return NextResponse.json(
        { error: "Sequence ID and email number are required" },
        { status: 400 }
      )
    }

    console.log(`[v0] Resending email ${emailNumber} from sequence ${sequenceId}...`)

    // Get sequence from database
    const sequenceRecord = await sql`
      SELECT id, campaign_name, body_html, target_audience
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
    const sequenceData = JSON.parse(sequence.body_html)
    const audience = sequence.target_audience as any
    const segmentId = audience?.resend_segment_id

    if (!segmentId) {
      return NextResponse.json(
        { error: "Sequence missing segment ID" },
        { status: 400 }
      )
    }

    // Find the specific email
    const email = sequenceData.emails.find((e: any) => e.number === parseInt(emailNumber))
    if (!email) {
      return NextResponse.json(
        { error: `Email ${emailNumber} not found in sequence` },
        { status: 404 }
      )
    }

    // Validate email data
    if (!email.html || typeof email.html !== 'string' || email.html.trim().length === 0) {
      return NextResponse.json(
        { error: `Email ${emailNumber} has invalid or empty HTML` },
        { status: 400 }
      )
    }

    if (!email.subject || typeof email.subject !== 'string' || email.subject.trim().length === 0) {
      return NextResponse.json(
        { error: `Email ${emailNumber} has invalid or empty subject` },
        { status: 400 }
      )
    }

    // Calculate send time
    const startDate = startTime === "now" ? new Date() : new Date(startTime)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start time format. Use "now" or ISO timestamp.' },
        { status: 400 }
      )
    }

    console.log(`[v0] Creating broadcast for email ${emailNumber}: "${email.subject}" (HTML length: ${email.html.length})`)

    // Create broadcast
    const broadcast = await resend.broadcasts.create({
      segmentId: segmentId,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      subject: email.subject,
      html: email.html,
    })

    if (broadcast.error || !broadcast.data?.id) {
      console.error(`[v0] ❌ Failed to create broadcast for email ${emailNumber}:`, broadcast.error)
      return NextResponse.json(
        { 
          error: "Failed to create broadcast",
          details: broadcast.error ? JSON.stringify(broadcast.error) : "Unknown error"
        },
        { status: 500 }
      )
    }

    const broadcastId = broadcast.data.id

    // Schedule broadcast
    await resend.broadcasts.send(broadcastId, {
      scheduledAt: startDate.toISOString(),
    })

    // Check if email record already exists
    const existingEmail = await sql`
      SELECT id FROM admin_email_campaigns
      WHERE campaign_type = 'resend_automation_email'
      AND (target_audience->>'sequence_id')::text = ${sequenceId.toString()}
      AND (target_audience->>'email_number')::text = ${emailNumber.toString()}
      LIMIT 1
    `

    if (existingEmail.length > 0) {
      // Update existing record
      await sql`
        UPDATE admin_email_campaigns
        SET resend_broadcast_id = ${broadcastId},
            status = 'scheduled',
            scheduled_for = ${startDate.toISOString()},
            updated_at = NOW()
        WHERE id = ${existingEmail[0].id}
      `
    } else {
      // Create new record
      await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name, campaign_type, subject_line,
          body_html, body_text, status, resend_broadcast_id,
          target_audience, scheduled_for, created_by, created_at
        ) VALUES (
          ${`${sequence.campaign_name} - Email ${emailNumber}`}, 'resend_automation_email', ${email.subject},
          ${email.html}, '', 'scheduled', ${broadcastId},
          ${JSON.stringify({
            resend_segment_id: segmentId,
            sequence_id: sequenceId,
            email_number: parseInt(emailNumber),
          })}::jsonb,
          ${startDate.toISOString()},
          ${ADMIN_EMAIL}, NOW()
        )
      `
    }

    console.log(`[v0] ✅ Resent email ${emailNumber}: "${email.subject}" for ${startDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      sequenceId,
      emailNumber: parseInt(emailNumber),
      broadcastId,
      scheduledFor: startDate.toISOString(),
      message: `Email ${emailNumber} resent successfully! 🚀`,
    })
  } catch (error: any) {
    console.error("[v0] Error resending sequence email:", error)
    return NextResponse.json(
      { error: "Failed to resend email", details: error.message },
      { status: 500 }
    )
  }
}

