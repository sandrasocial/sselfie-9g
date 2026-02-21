import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { sendNewsletterBroadcast } from "@/lib/email/send-newsletter-broadcast"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID!

/**
 * POST — approve and send the current Brand Engine broadcast.
 * Requires the campaign to exist in draft/pending state.
 */
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json().catch(() => ({}))
    const expectedRecipients: number = Number(body.expectedRecipients || 0)

    // 1. Load the current draft campaign
    const campaignRows = await sql`
      SELECT *
      FROM admin_email_campaigns
      WHERE campaign_type = 'brand_engine_broadcast'
        AND status IN ('draft', 'pending', 'scheduled')
        AND approval_status IN ('pending', 'draft', 'approved')
      ORDER BY created_at DESC
      LIMIT 1
    `

    if ((campaignRows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: "No pending Brand Engine broadcast found. Create a draft first." },
        { status: 404 },
      )
    }

    const campaign = (campaignRows as any[])[0]

    if (campaign.resend_broadcast_id) {
      return NextResponse.json(
        { success: false, error: `Campaign already sent (Resend ID: ${campaign.resend_broadcast_id})` },
        { status: 409 },
      )
    }

    // 2. Sanity check subscriber count if provided
    if (expectedRecipients > 0 && AUDIENCE_ID) {
      const realCount = await getAudienceContactCount(AUDIENCE_ID)
      const diff = Math.abs(realCount - expectedRecipients)
      const pct = realCount > 0 ? diff / realCount : 1
      if (pct > 0.3) {
        console.warn(`[BE Broadcast Send] Count mismatch: expected ${expectedRecipients}, got ${realCount}`)
        // Log but do not block — Sandra approved this
      }
    }

    // 3. Approve campaign
    await sql`
      UPDATE admin_email_campaigns
      SET
        approval_status = 'approved',
        status = 'scheduled',
        scheduled_for = NOW(),
        approved_by = 'sandra@ssasocial.com',
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${campaign.id}
    `

    // 4. Send via Resend broadcast
    const broadcastId = await sendNewsletterBroadcast(campaign.id)

    console.log(`[BE Broadcast Send] ✅ Sent campaign ${campaign.id}, Resend broadcast: ${broadcastId}`)

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      broadcastId,
      message: "Brand Engine broadcast sent successfully.",
    })
  } catch (error) {
    console.error("[BE Broadcast Send] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
