import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * Debug endpoint to view all recent campaigns
 * Visit: /api/debug/campaigns
 */
export async function GET(req: NextRequest) {
  try {
    const sql = getDb()

    const campaigns = await sql`
      SELECT
        id,
        campaign_name,
        subject_line,
        created_by,
        status,
        approval_status,
        created_at,
        body_html
      FROM admin_email_campaigns
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      total: campaigns.length,
      latest_gumloop: campaigns.filter(c => c.created_by === 'gumloop-automation')[0],
      all_campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.campaign_name,
        subject: c.subject_line,
        created_by: c.created_by,
        status: c.status,
        approval_status: c.approval_status,
        created_at: c.created_at,
        has_html: !!c.body_html
      }))
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
