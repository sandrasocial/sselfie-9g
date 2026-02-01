import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * Approve a newsletter campaign for sending
 *
 * Changes approval_status to 'approved' and status to 'scheduled'
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Update campaign status
    const result = await sql`
      UPDATE admin_email_campaigns
      SET
        approval_status = 'approved',
        status = 'scheduled',
        approved_by = 'sandra@ssasocial.com',
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${campaignId}
        AND approval_status IN ('pending', 'draft')
      RETURNING id, campaign_name, status, approval_status, scheduled_for
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found or already processed" },
        { status: 404 }
      )
    }

    const campaign = result[0]

    console.log(`[Campaign Approval] ✅ Campaign ${campaignId} approved:`, {
      name: campaign.campaign_name,
      scheduled_for: campaign.scheduled_for
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        status: campaign.status,
        approval_status: campaign.approval_status,
        scheduled_for: campaign.scheduled_for
      },
      message: "Campaign approved and scheduled for sending"
    })

  } catch (error) {
    console.error("[Campaign Approval] Error:", error)

    return NextResponse.json({
      error: "Failed to approve campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
