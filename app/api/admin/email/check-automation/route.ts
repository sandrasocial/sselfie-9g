import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

/**
 * Check if an automation/campaign exists
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("id")

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 }
      )
    }

    const campaign = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        status,
        target_audience,
        created_at,
        updated_at
      FROM admin_email_campaigns
      WHERE id = ${parseInt(campaignId, 10)}
    `

    if (campaign.length === 0) {
      return NextResponse.json(
        { 
          exists: false,
          message: `Campaign/automation ${campaignId} not found`
        },
        { status: 404 }
      )
    }

    const c = campaign[0]
    const targetAudience = c.target_audience || {}
    
    return NextResponse.json({
      exists: true,
      campaign: {
        id: c.id,
        name: c.campaign_name,
        type: c.campaign_type,
        status: c.status,
        segmentId: targetAudience.resend_segment_id,
        segmentName: targetAudience.segment_name,
        triggerType: targetAudience.trigger_type,
        emailCount: targetAudience.sequence_emails?.length || 0,
        created_at: c.created_at,
        updated_at: c.updated_at
      }
    })
  } catch (error: any) {
    console.error("[v0] Error checking automation:", error)
    return NextResponse.json(
      { error: "Failed to check automation", details: error.message },
      { status: 500 }
    )
  }
}











