import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

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
      subject_line,
      email_body,
      campaign_type = "newsletter",
    } = body

    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (!audienceId) {
      return NextResponse.json(
        {
          error: "RESEND_AUDIENCE_ID not configured",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Creating Resend broadcast for:", campaign_name)

    const broadcast = await resend.broadcasts.create({
      audienceId: audienceId,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      subject: subject_line,
      html: email_body,
    })

    console.log("[v0] Broadcast created successfully:", broadcast.data?.id)

    // Save to database for tracking
    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name, campaign_type, subject_line,
        body_html, status, approval_status, 
        resend_broadcast_id, created_by, created_at, updated_at
      ) VALUES (
        ${campaign_name}, ${campaign_type}, ${subject_line},
        ${email_body}, 'draft', 'draft',
        ${broadcast.data?.id || null}, ${ADMIN_EMAIL}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      campaign: result[0],
      broadcastId: broadcast.data?.id,
      message: "Email created in Resend! Visit https://resend.com/broadcasts to review and send.",
    })
  } catch (error: any) {
    console.error("[v0] Error creating email campaign:", error)
    return NextResponse.json(
      { 
        error: "Failed to create broadcast",
        details: error.message 
      }, 
      { status: 500 }
    )
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
    const { campaignId, approval_status, scheduled_for, target_audience } = body

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 })
    }

    // Update approval status
    if (approval_status) {
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
    }

    // Update scheduling
    if (scheduled_for !== undefined) {
      const status = scheduled_for ? "scheduled" : "draft"
      const result = await sql`
        UPDATE admin_email_campaigns
        SET 
          scheduled_for = ${scheduled_for || null},
          status = ${status},
          updated_at = NOW()
        WHERE id = ${campaignId}
        RETURNING *
      `
      return NextResponse.json(result[0])
    }

    // Update target audience
    if (target_audience) {
      const result = await sql`
        UPDATE admin_email_campaigns
        SET 
          target_audience = ${JSON.stringify(target_audience)},
          updated_at = NOW()
        WHERE id = ${campaignId}
        RETURNING *
      `
      return NextResponse.json(result[0])
    }

    return NextResponse.json({ error: "No update fields provided" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
