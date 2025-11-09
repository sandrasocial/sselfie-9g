import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
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
      campaign_type,
      subject_line,
      preview_text,
      body_html,
      body_text,
      target_audience,
      scheduled_for,
      image_urls,
    } = body

    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name, campaign_type, subject_line, preview_text,
        body_html, body_text, target_audience, scheduled_for,
        status, approval_status, image_urls, created_by, created_at, updated_at
      ) VALUES (
        ${campaign_name}, ${campaign_type}, ${subject_line}, ${preview_text || null},
        ${body_html}, ${body_text}, ${JSON.stringify(target_audience || {})}, ${scheduled_for || null},
        'draft', 'draft', ${image_urls || []}, ${ADMIN_EMAIL}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
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
