import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"
import { sendNewsletterBroadcast } from "@/lib/email/send-newsletter-broadcast"
import { BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME } from "@/lib/email/templates/brand-engine-broadcast-feb-2026"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com")
    .trim()
    .toLowerCase()
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true as const, adminEmail: String(neonUser.email || "").trim().toLowerCase() }
}

async function getSubscriberCount() {
  const audienceId = String(process.env.RESEND_AUDIENCE_ID || "").trim()
  if (!audienceId) return 0
  return getAudienceContactCount(audienceId)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => ({}))
    const expectedRecipients = Number(body?.expectedRecipients || 0)

    const subscriberCount = await getSubscriberCount().catch(() => 0)
    if (expectedRecipients > 0 && subscriberCount > 0 && expectedRecipients !== subscriberCount) {
      return NextResponse.json(
        {
          error: "Subscriber count changed. Refresh and confirm again before sending.",
          expectedRecipients,
          subscriberCount,
        },
        { status: 409 },
      )
    }

    const sql = getDb()
    const [campaign] = await sql`
      SELECT id, status, approval_status, resend_broadcast_id
      FROM admin_email_campaigns
      WHERE campaign_name = ${BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!campaign?.id) {
      return NextResponse.json({ error: "Draft campaign not found. Create preview draft first." }, { status: 404 })
    }

    if (campaign.resend_broadcast_id) {
      return NextResponse.json({ error: "Campaign already sent.", campaignId: campaign.id }, { status: 409 })
    }

    const [approved] = await sql`
      UPDATE admin_email_campaigns
      SET
        approval_status = 'approved',
        status = 'scheduled',
        scheduled_for = NOW(),
        approved_by = ${auth.adminEmail},
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ${campaign.id}
      RETURNING id
    `

    if (!approved?.id) {
      return NextResponse.json({ error: "Failed to approve campaign before send." }, { status: 500 })
    }

    const broadcastId = await sendNewsletterBroadcast(Number(campaign.id))

    return NextResponse.json({
      success: true,
      campaignId: Number(campaign.id),
      broadcastId,
      subscriberCount,
      message: "Brand Engine broadcast approved and sent.",
    })
  } catch (error) {
    console.error("[Brand Engine Broadcast] send failed:", error)
    return NextResponse.json(
      {
        error: "Failed to approve and send broadcast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
