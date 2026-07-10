import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

type InboxConversationRow = {
  id: number
}

type IngestionStatusRow = {
  total_conversations: string | number
  manychat_conversations: string | number
  latest_received_at: string | null
  latest_manychat_received_at: string | null
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "flagged"
  const conversationId = Number(searchParams.get("conversation") || searchParams.get("id") || 0)
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100)
  const offset = Math.max(Number(searchParams.get("page") || 0), 0) * limit

  const conversations = conversationId
    ? await sql`
        SELECT
          c.*,
          ct.username,
          ct.full_name,
          ct.profile_pic_url,
          ct.is_icelandic,
          ct.is_verified_friend,
          ct.tags,
          ct.notes,
          latest.content AS latest_message,
          latest.from_type AS latest_from_type
        FROM ig_conversations c
        JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
        LEFT JOIN LATERAL (
          SELECT content, from_type
          FROM ig_messages
          WHERE conversation_id = c.id
          ORDER BY sent_at DESC, id DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE c.id = ${conversationId}
      `
    : status === "all"
      ? await sql`
          SELECT
            c.*,
            ct.username,
            ct.full_name,
            ct.profile_pic_url,
            ct.is_icelandic,
            ct.is_verified_friend,
            ct.tags,
            ct.notes,
            latest.content AS latest_message,
            latest.from_type AS latest_from_type
          FROM ig_conversations c
          JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
          LEFT JOIN LATERAL (
            SELECT content, from_type
            FROM ig_messages
            WHERE conversation_id = c.id
            ORDER BY sent_at DESC, id DESC
            LIMIT 1
          ) latest ON TRUE
          ORDER BY (c.status = 'flagged') DESC, c.last_message_at DESC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT
            c.*,
            ct.username,
            ct.full_name,
            ct.profile_pic_url,
            ct.is_icelandic,
            ct.is_verified_friend,
            ct.tags,
            ct.notes,
            latest.content AS latest_message,
            latest.from_type AS latest_from_type
          FROM ig_conversations c
          JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
          LEFT JOIN LATERAL (
            SELECT content, from_type
            FROM ig_messages
            WHERE conversation_id = c.id
            ORDER BY sent_at DESC, id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE c.status = ${status}
            AND (${status} <> 'flagged' OR c.channel = 'dm')
          ORDER BY (c.status = 'flagged') DESC, c.last_message_at DESC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}
        `

  const selectedId = conversationId || Number((conversations as InboxConversationRow[])[0]?.id || 0)
  const messages = selectedId
    ? await sql`
        SELECT id, from_type, content, ai_generated, ai_confidence, ai_intent, growth_tags, send_status, sent_at, delivered
        FROM ig_messages
        WHERE conversation_id = ${selectedId}
        ORDER BY sent_at ASC, id ASC
    `
    : []

  const ingestionRows = await sql`
    SELECT
      COUNT(*) AS total_conversations,
      COUNT(*) FILTER (WHERE ig_user_id LIKE 'mc:%' OR ig_thread_id LIKE 'mc-%') AS manychat_conversations,
      MAX(last_message_at) AS latest_received_at,
      MAX(last_message_at) FILTER (WHERE ig_user_id LIKE 'mc:%' OR ig_thread_id LIKE 'mc-%') AS latest_manychat_received_at
    FROM ig_conversations
  `
  const ingestion = ingestionRows[0] as IngestionStatusRow | undefined

  return NextResponse.json({
    conversations,
    selectedConversationId: selectedId || null,
    messages,
    ingestion: {
      bridgeConfigured: Boolean(process.env.MANYCHAT_BRIDGE_SECRET?.trim()),
      totalConversations: Number(ingestion?.total_conversations || 0),
      manychatConversations: Number(ingestion?.manychat_conversations || 0),
      latestReceivedAt: ingestion?.latest_received_at || null,
      latestManychatReceivedAt: ingestion?.latest_manychat_received_at || null,
    },
  })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const conversationId = Number(body.conversationId)
  const action = String(body.action || "")
  if (!conversationId || !action) {
    return NextResponse.json({ error: "conversationId and action required" }, { status: 400 })
  }

  if (action === "mark_handled") {
    await sql`UPDATE ig_conversations SET status = 'closed', last_seen_by_sandra = NOW(), updated_at = NOW() WHERE id = ${conversationId}`
  } else if (action === "snooze") {
    await sql`UPDATE ig_conversations SET status = 'snoozed', snoozed_until = NOW() + INTERVAL '24 hours', last_seen_by_sandra = NOW(), updated_at = NOW() WHERE id = ${conversationId}`
  } else if (action === "tag_contact") {
    const tag = String(body.tag || "").trim().toLowerCase()
    if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 })
    await sql`
      UPDATE ig_contacts
      SET tags = ARRAY(SELECT DISTINCT UNNEST(COALESCE(tags, '{}') || ARRAY[${tag}]::text[])),
          is_verified_friend = CASE WHEN ${tag} IN ('friend', 'family') THEN TRUE ELSE is_verified_friend END,
          updated_at = NOW()
      WHERE ig_user_id = (SELECT ig_user_id FROM ig_conversations WHERE id = ${conversationId})
    `
  } else if (action === "save_notes") {
    await sql`
      UPDATE ig_contacts
      SET notes = ${String(body.notes || "")},
          updated_at = NOW()
      WHERE ig_user_id = (SELECT ig_user_id FROM ig_conversations WHERE id = ${conversationId})
    `
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
