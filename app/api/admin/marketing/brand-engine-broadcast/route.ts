import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"
import {
  BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME,
  BRAND_ENGINE_BROADCAST_PREVIEW,
  BRAND_ENGINE_BROADCAST_SUBJECT,
  getBrandEngineBroadcastHtml,
} from "@/lib/email/templates/brand-engine-broadcast-feb-2026"

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

async function loadSubscriberCount() {
  const audienceId = String(process.env.RESEND_AUDIENCE_ID || "").trim()
  if (!audienceId) return 0
  return getAudienceContactCount(audienceId)
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const sql = getDb()
    const [campaign] = await sql`
      SELECT
        id,
        campaign_name,
        campaign_type,
        subject_line,
        preview_text,
        body_html,
        status,
        approval_status,
        target_segment,
        scheduled_for,
        resend_broadcast_id,
        approved_at,
        sent_at,
        created_at,
        updated_at
      FROM admin_email_campaigns
      WHERE campaign_name = ${BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const subscriberCount = await loadSubscriberCount().catch(() => 0)

    return NextResponse.json({
      success: true,
      campaign: campaign || null,
      subscriberCount,
    })
  } catch (error) {
    console.error("[Brand Engine Broadcast] GET failed:", error)
    return NextResponse.json(
      {
        error: "Failed to load Brand Engine broadcast state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const sql = getDb()
    const bodyHtml = getBrandEngineBroadcastHtml()
    const targetAudience = JSON.stringify({ segment: "all_subscribers" })

    const [existing] = await sql`
      SELECT id, status, approval_status
      FROM admin_email_campaigns
      WHERE campaign_name = ${BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `

    let campaignId: number
    if (existing && existing.id) {
      campaignId = Number(existing.id)
      await sql`
        UPDATE admin_email_campaigns
        SET
          campaign_type = 'broadcast',
          subject_line = ${BRAND_ENGINE_BROADCAST_SUBJECT},
          preview_text = ${BRAND_ENGINE_BROADCAST_PREVIEW},
          body_html = ${bodyHtml},
          status = 'draft',
          approval_status = 'pending',
          target_segment = 'all_subscribers',
          target_audience = ${targetAudience}::jsonb,
          scheduled_for = NULL,
          resend_broadcast_id = NULL,
          sent_at = NULL,
          approved_at = NULL,
          updated_at = NOW()
        WHERE id = ${campaignId}
      `
    } else {
      const [created] = await sql`
        INSERT INTO admin_email_campaigns (
          campaign_name,
          campaign_type,
          subject_line,
          preview_text,
          body_html,
          status,
          approval_status,
          target_segment,
          target_audience,
          scheduled_for,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          ${BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME},
          'broadcast',
          ${BRAND_ENGINE_BROADCAST_SUBJECT},
          ${BRAND_ENGINE_BROADCAST_PREVIEW},
          ${bodyHtml},
          'draft',
          'pending',
          'all_subscribers',
          ${targetAudience}::jsonb,
          NULL,
          ${auth.adminEmail},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      campaignId = Number(created.id)
    }

    const [campaign] = await sql`
      SELECT
        id,
        campaign_name,
        campaign_type,
        subject_line,
        preview_text,
        body_html,
        status,
        approval_status,
        target_segment,
        scheduled_for,
        resend_broadcast_id,
        approved_at,
        sent_at,
        created_at,
        updated_at
      FROM admin_email_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `

    const subscriberCount = await loadSubscriberCount().catch(() => 0)

    return NextResponse.json({
      success: true,
      campaign,
      subscriberCount,
      message: "Draft campaign is ready for preview and approval.",
    })
  } catch (error) {
    console.error("[Brand Engine Broadcast] POST failed:", error)
    return NextResponse.json(
      {
        error: "Failed to bootstrap Brand Engine broadcast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
