import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * Reject a newsletter campaign
 *
 * Changes approval_status to 'rejected' to prevent it from being sent
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

    const { reason } = await req.json().catch(() => ({ reason: null }))

    const sql = getDb()

    // Update campaign status
    const result = await sql`
      UPDATE admin_email_campaigns
      SET
        approval_status = 'rejected',
        status = 'draft',
        metrics = jsonb_set(
          COALESCE(metrics, '{}'::jsonb),
          '{rejection}',
          ${JSON.stringify({
            reason: reason || 'No reason provided',
            rejected_by: 'sandra@ssasocial.com',
            rejected_at: new Date().toISOString()
          })}::jsonb
        ),
        updated_at = NOW()
      WHERE id = ${campaignId}
        AND approval_status IN ('pending', 'draft')
      RETURNING id, campaign_name, approval_status
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found or already processed" },
        { status: 404 }
      )
    }

    const campaign = result[0]

    console.log(`[Campaign Rejection] Campaign ${campaignId} rejected:`, {
      name: campaign.campaign_name,
      reason: reason || 'No reason provided'
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        approval_status: campaign.approval_status
      },
      message: "Campaign rejected"
    })

  } catch (error) {
    console.error("[Campaign Rejection] Error:", error)

    return NextResponse.json({
      error: "Failed to reject campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
