import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Create a new email automation sequence
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
    const {
      name,
      description,
      segmentId,
      segmentName,
      emails, // Array of { number, subject, html, text, delayDays }
    } = body

    if (!name || !segmentId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Name, segmentId, and emails array are required" },
        { status: 400 }
      )
    }

    console.log(`[v0] Creating automation sequence: ${name}`)

    // Check if sequence with same name already exists
    const existingSequence = await sql`
      SELECT id, status, campaign_name
      FROM admin_email_campaigns
      WHERE campaign_name = ${name}
      AND campaign_type = 'resend_automation_sequence'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingSequence.length > 0) {
      const existing = existingSequence[0]
      return NextResponse.json({
        success: false,
        error: "Sequence already exists",
        existingSequenceId: existing.id,
        existingStatus: existing.status,
        message: `A sequence named "${name}" already exists (ID: ${existing.id}, Status: ${existing.status}). Use a different name or activate the existing sequence.`,
      }, { status: 409 }) // 409 Conflict
    }

    // Generate email content for each email if not provided
    const processedEmails = emails.map((email: any, index: number) => {
      // Validate required fields
      if (!email.html || typeof email.html !== 'string' || email.html.trim().length === 0) {
        throw new Error(`Email ${email.number || index + 1} has invalid or empty HTML content`)
      }
      if (!email.subject || typeof email.subject !== 'string' || email.subject.trim().length === 0) {
        throw new Error(`Email ${email.number || index + 1} has invalid or empty subject`)
      }

      return {
        number: email.number || index + 1,
        subject: email.subject.trim(),
        html: email.html.trim(),
        text: email.text || email.html.replace(/<[^>]*>/g, "").trim(),
        delayDays: email.delayDays || 0,
      }
    })

    // Create sequence structure
    const sequenceData = {
      name,
      description,
      emails: processedEmails,
    }

    // Save to database
    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name,
        campaign_type,
        subject_line,
        body_html,
        body_text,
        target_audience,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        'resend_automation_sequence',
        ${processedEmails[0]?.subject || name},
        ${JSON.stringify(sequenceData)},
        '',
        ${JSON.stringify({
          resend_segment_id: segmentId,
          resend_segment_name: segmentName,
        })}::jsonb,
        'draft',
        ${ADMIN_EMAIL},
        NOW(),
        NOW()
      )
      RETURNING id, campaign_name, status
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Failed to create sequence" },
        { status: 500 }
      )
    }

    const sequence = result[0]

    console.log(`[v0] ✅ Sequence created: ${sequence.id}`)

    return NextResponse.json({
      success: true,
      sequenceId: sequence.id,
      sequenceName: sequence.campaign_name,
      status: sequence.status,
      message: `Sequence "${name}" created successfully! You can now activate it.`,
    })
  } catch (error: any) {
    console.error("[v0] Error creating automation sequence:", error)
    return NextResponse.json(
      { error: "Failed to create sequence", details: error.message },
      { status: 500 }
    )
  }
}

