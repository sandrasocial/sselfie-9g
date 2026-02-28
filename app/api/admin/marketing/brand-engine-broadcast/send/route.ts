import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  getBroadcastRecipientPreflight,
  sendNewsletterBroadcast,
} from "@/lib/email/send-newsletter-broadcast"

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

    // 2. Preflight recipient count (source of truth for sendability)
    if (!AUDIENCE_ID) {
      return NextResponse.json(
        { success: false, error: "RESEND_AUDIENCE_ID is not configured." },
        { status: 500 },
      )
    }

    const preflight = await getBroadcastRecipientPreflight(AUDIENCE_ID)
    if (preflight.sendableCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No sendable recipients available after suppression filtering. Run bounce cleanup before sending.",
          preflight,
        },
        { status: 400 },
      )
    }

    // 3. Sanity check recipient expectation if provided
    if (expectedRecipients > 0) {
      const diff = Math.abs(preflight.sendableCount - expectedRecipients)
      const pct = preflight.sendableCount > 0 ? diff / preflight.sendableCount : 1
      if (pct > 0.3) {
        console.warn(
          `[BE Broadcast Send] Count mismatch: expected ${expectedRecipients}, preflight sendable ${preflight.sendableCount}`,
        )
        // Log but do not block — Sandra approved this
      }
    }

    // 4. Approve campaign
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

    // 5. Send via Resend broadcast
    const broadcastId = await sendNewsletterBroadcast(campaign.id, preflight)

    console.log(`[BE Broadcast Send] ✅ Sent campaign ${campaign.id}, Resend broadcast: ${broadcastId}`)

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      broadcastId,
      preflight,
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
