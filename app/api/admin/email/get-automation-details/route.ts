import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

/**
 * Get full automation details including email content
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
        subject_line,
        body_html,
        body_text,
        target_audience,
        created_at,
        updated_at
      FROM admin_email_campaigns
      WHERE id = ${parseInt(campaignId, 10)}
      AND campaign_type = 'resend_automation_sequence'
    `

    if (campaign.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          exists: false,
          message: `Automation ${campaignId} not found`
        },
        { status: 404 }
      )
    }

    const c = campaign[0]
    const targetAudience = c.target_audience || {}
    
    // Parse sequence data from body_html (it's stored as JSON string)
    let sequenceData = null
    try {
      sequenceData = JSON.parse(c.body_html)
    } catch (e) {
      console.error("Error parsing sequence data:", e)
    }
    
    return NextResponse.json({
      success: true,
      exists: true,
      automation: {
        id: c.id,
        name: c.campaign_name,
        type: c.campaign_type,
        status: c.status,
        segmentId: targetAudience.resend_segment_id,
        segmentName: targetAudience.segment_name,
        triggerType: targetAudience.trigger_type,
        emailCount: sequenceData?.emails?.length || targetAudience.sequence_emails?.length || 0,
        sequenceData: sequenceData,
        targetAudience: targetAudience,
        created_at: c.created_at,
        updated_at: c.updated_at
      }
    })
  } catch (error: any) {
    console.error("[v0] Error getting automation details:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get automation details", details: error.message },
      { status: 500 }
    )
  }
}











