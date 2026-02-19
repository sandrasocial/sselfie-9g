import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"
import {
  BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME,
  BRAND_ENGINE_BROADCAST_PREVIEW,
  BRAND_ENGINE_BROADCAST_SUBJECT,
  BRAND_ENGINE_BROADCAST_CTA_URL,
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

type SqlClient = ReturnType<typeof getDb>

async function getCampaignColumnSet(sql: SqlClient) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_email_campaigns'
  `
  return new Set(rows.map((row: any) => String(row.column_name)))
}

async function getCampaignById(sql: SqlClient, campaignId: number) {
  const rows = await sql`
    SELECT *
    FROM admin_email_campaigns
    WHERE id = ${campaignId}
    LIMIT 1
  `
  return rows[0] || null
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const sql = getDb()
    const [campaign] = await sql`
      SELECT *
      FROM admin_email_campaigns
      WHERE campaign_name = ${BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const subscriberCount = await loadSubscriberCount().catch(() => 0)
    const [dbCountRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM freebie_subscribers
      WHERE email IS NOT NULL
        AND BTRIM(email) <> ''
    `
    const dbSubscriberCount = Number(dbCountRow?.count || 0)

    return NextResponse.json({
      success: true,
      campaign: campaign || null,
      subscriberCount,
      dbSubscriberCount,
      audienceMismatch: dbSubscriberCount > 0 && subscriberCount > 0 && subscriberCount < Math.ceil(dbSubscriberCount * 0.5),
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
    const columnSet = await getCampaignColumnSet(sql)
    const bodyHtml = getBrandEngineBroadcastHtml()
    const bodyText =
      [
        "Hey [first_name]",
        "",
        "Let me be really honest for a second.",
        "",
        "I built an app from EUR12. Learned to code. Grew to 180K followers.",
        "Did it all as a single mom with two boys and my own ADHD to manage.",
        "",
        "And I still doubted myself every single day.",
        "",
        "In January I hit a wall. Not burnout. More like I couldn't celebrate what I'd built because I was already chasing the next thing.",
        "",
        "So I took my boys to the mountains. No wifi. No electricity. No running water. Just a fireplace, red wine and quiet.",
        "",
        "This chapter I'm doing things differently.",
        "And I'm ready to help a small group of women do the same.",
        "",
        "I'm opening Brand Engine in March — 6 weeks where we build your entire personal brand together using AI.",
        "Not a course. Not theory. Actually built.",
        "",
        "THE COHORT — EUR2,497",
        "THE VIP — EUR4,997",
        "",
        "Apply for Brand Engine:",
        BRAND_ENGINE_BROADCAST_CTA_URL,
        "",
        "Sandra",
      ].join("\n")
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
      const setClauses: string[] = []
      const values: Array<string | null> = []
      const pushSet = (column: string, value: string | null, asJsonb = false) => {
        values.push(value)
        const index = values.length
        setClauses.push(`${column} = $${index}${asJsonb ? "::jsonb" : ""}`)
      }

      pushSet("campaign_type", "broadcast")
      pushSet("subject_line", BRAND_ENGINE_BROADCAST_SUBJECT)
      if (columnSet.has("preview_text")) pushSet("preview_text", BRAND_ENGINE_BROADCAST_PREVIEW)
      if (columnSet.has("body_html")) pushSet("body_html", bodyHtml)
      if (columnSet.has("body_text")) pushSet("body_text", bodyText)
      pushSet("status", "draft")
      if (columnSet.has("approval_status")) pushSet("approval_status", "pending")
      if (columnSet.has("target_segment")) pushSet("target_segment", "all_subscribers")
      if (columnSet.has("target_audience")) pushSet("target_audience", targetAudience, true)
      if (columnSet.has("scheduled_for")) setClauses.push("scheduled_for = NULL")
      if (columnSet.has("resend_broadcast_id")) setClauses.push("resend_broadcast_id = NULL")
      if (columnSet.has("sent_at")) setClauses.push("sent_at = NULL")
      if (columnSet.has("approved_at")) setClauses.push("approved_at = NULL")
      if (columnSet.has("updated_at")) setClauses.push("updated_at = NOW()")

      values.push(String(campaignId))
      const campaignIdIndex = values.length
      const updateSql = `UPDATE admin_email_campaigns SET ${setClauses.join(", ")} WHERE id = $${campaignIdIndex}`
      await sql.query(updateSql, values)
    } else {
      const insertColumns: string[] = []
      const placeholders: string[] = []
      const values: Array<string | null> = []
      const pushInsert = (column: string, value: string | null, asJsonb = false) => {
        values.push(value)
        insertColumns.push(column)
        const index = values.length
        placeholders.push(`${asJsonb ? `$${index}::jsonb` : `$${index}`}`)
      }

      pushInsert("campaign_name", BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME)
      pushInsert("campaign_type", "broadcast")
      pushInsert("subject_line", BRAND_ENGINE_BROADCAST_SUBJECT)
      if (columnSet.has("preview_text")) pushInsert("preview_text", BRAND_ENGINE_BROADCAST_PREVIEW)
      if (columnSet.has("body_html")) pushInsert("body_html", bodyHtml)
      if (columnSet.has("body_text")) pushInsert("body_text", bodyText)
      pushInsert("status", "draft")
      if (columnSet.has("approval_status")) pushInsert("approval_status", "pending")
      if (columnSet.has("target_segment")) pushInsert("target_segment", "all_subscribers")
      if (columnSet.has("target_audience")) pushInsert("target_audience", targetAudience, true)
      if (columnSet.has("scheduled_for")) pushInsert("scheduled_for", null)
      if (columnSet.has("created_by")) pushInsert("created_by", auth.adminEmail)
      if (columnSet.has("created_at")) {
        insertColumns.push("created_at")
        placeholders.push("NOW()")
      }
      if (columnSet.has("updated_at")) {
        insertColumns.push("updated_at")
        placeholders.push("NOW()")
      }

      const insertSql = `INSERT INTO admin_email_campaigns (${insertColumns.join(", ")}) VALUES (${placeholders.join(
        ", ",
      )}) RETURNING id`
      const [createdRow] = await sql.query(insertSql, values)
      campaignId = Number(createdRow.id)
    }

    const campaign = await getCampaignById(sql, campaignId)

    const subscriberCount = await loadSubscriberCount().catch(() => 0)
    const [dbCountRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM freebie_subscribers
      WHERE email IS NOT NULL
        AND BTRIM(email) <> ''
    `
    const dbSubscriberCount = Number(dbCountRow?.count || 0)

    return NextResponse.json({
      success: true,
      campaign,
      subscriberCount,
      dbSubscriberCount,
      audienceMismatch: dbSubscriberCount > 0 && subscriberCount > 0 && subscriberCount < Math.ceil(dbSubscriberCount * 0.5),
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
