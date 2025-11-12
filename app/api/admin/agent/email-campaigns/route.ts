import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: Request) {
  try {
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

    const campaigns = await sql`
      SELECT * FROM admin_email_campaigns
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error("[v0] Error fetching email campaigns:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
      campaign_name,
      campaign_type,
      subject_line,
      preview_text,
      body_html,
      body_text,
      email_body,
      target_audience,
      scheduled_for,
      image_urls,
      user_id,
      notes,
      sequence_position,
      sequence_total,
      send_delay_days,
    } = body

    const htmlContent = body_html || email_body

    const sequenceNotes =
      send_delay_days !== undefined
        ? `${notes || ""}\nSequence: ${sequence_position}/${sequence_total}. Send after ${send_delay_days} days.`
        : notes

    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name, campaign_type, subject_line, preview_text,
        body_html, body_text, target_audience, scheduled_for,
        status, approval_status, image_urls, created_by, created_at, updated_at
      ) VALUES (
        ${campaign_name}, ${campaign_type}, ${subject_line}, ${preview_text || null},
        ${htmlContent}, ${body_text || null}, ${JSON.stringify(target_audience || {})}, ${scheduled_for || null},
        'draft', 'draft', ${image_urls || []}, ${ADMIN_EMAIL}, NOW(), NOW()
      )
      RETURNING *
    `

    const campaign = result[0]
    console.log("[v0] Campaign saved to database:", campaign.id)

    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (!audienceId) {
      console.warn("[v0] RESEND_AUDIENCE_ID not configured, skipping Resend broadcast creation")
      return NextResponse.json({
        success: true,
        campaign,
        message: "Email campaign saved to database. Configure RESEND_AUDIENCE_ID in Vars to create Resend broadcasts.",
      })
    }

    try {
      const broadcastName = sequence_position
        ? `${campaign_name} (${sequence_position}/${sequence_total}) - Send Day ${send_delay_days}`
        : campaign_name

      const broadcast = await resend.broadcasts.create({
        audienceId: audienceId,
        from: "Sandra from SSELFIE <hello@sselfie.ai>",
        subject: subject_line,
        html: htmlContent,
        name: broadcastName,
      })

      console.log("[v0] Resend broadcast created:", broadcast.data?.id)

      await sql`
        UPDATE admin_email_campaigns
        SET resend_broadcast_id = ${broadcast.data?.id},
            status = 'scheduled',
            updated_at = NOW()
        WHERE id = ${campaign.id}
      `

      return NextResponse.json({
        success: true,
        campaign: { ...campaign, resend_broadcast_id: broadcast.data?.id },
        broadcast_id: broadcast.data?.id,
        message: `Email campaign created and saved to Resend! Visit https://resend.com/broadcasts to review and send.`,
        instructions: [
          "1. Go to https://resend.com/broadcasts",
          "2. Find your broadcast: " + broadcastName,
          "3. Review the email preview",
          send_delay_days !== undefined
            ? `4. Schedule to send ${send_delay_days} days after previous email`
            : '4. Click "Send" when ready to send to your audience',
        ],
      })
    } catch (resendError: any) {
      console.error("[v0] Error creating Resend broadcast:", resendError)

      return NextResponse.json({
        success: true,
        campaign,
        warning: "Campaign saved to database, but Resend broadcast creation failed",
        error: resendError.message,
        message:
          "Email campaign saved locally. Check that your Resend domain is verified and RESEND_AUDIENCE_ID is correct.",
      })
    }
  } catch (error) {
    console.error("[v0] Error creating email campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
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
    const { campaignId, approval_status } = body

    if (!campaignId || !approval_status) {
      return NextResponse.json({ error: "Campaign ID and approval status required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE admin_email_campaigns
      SET 
        approval_status = ${approval_status},
        approved_by = ${ADMIN_EMAIL},
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${campaignId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
