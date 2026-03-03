import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * Unreject a previously rejected newsletter campaign
 *
 * Changes approval_status back to 'pending' so it can be reviewed again
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

    // Update campaign status back to pending
    const result = await sql`
      UPDATE admin_email_campaigns
      SET
        approval_status = 'pending',
        status = 'draft',
        metrics = jsonb_set(
          COALESCE(metrics, '{}'::jsonb),
          '{unrejected}',
          ${JSON.stringify({
            unrejected_by: 'sandra@ssasocial.com',
            unrejected_at: new Date().toISOString()
          })}::jsonb
        ),
        updated_at = NOW()
      WHERE id = ${campaignId}
        AND approval_status = 'rejected'
      RETURNING id, campaign_name, approval_status
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found or not rejected" },
        { status: 404 }
      )
    }

    const campaign = result[0]

    console.log(`[Campaign Unreject] Campaign ${campaignId} moved back to pending:`, {
      name: campaign.campaign_name
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        approval_status: campaign.approval_status
      },
      message: "Campaign moved back to pending review"
    })

  } catch (error) {
    console.error("[Campaign Unreject] Error:", error)

    return NextResponse.json({
      error: "Failed to unreject campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
