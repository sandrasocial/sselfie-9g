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
    } = body

    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name, campaign_type, subject_line, preview_text,
        body_html, body_text, target_audience, scheduled_for,
        status, created_by, created_at, updated_at
      ) VALUES (
        ${campaign_name}, ${campaign_type}, ${subject_line}, ${preview_text || null},
        ${body_html}, ${body_text}, ${JSON.stringify(target_audience || {})}, ${scheduled_for || null},
        'draft', ${ADMIN_EMAIL}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating email campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
