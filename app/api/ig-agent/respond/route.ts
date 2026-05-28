import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { generateSandraDraft } from "@/lib/ig-agent/responder"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const internalSecret = request.headers.get("x-internal-secret")
  if (process.env.CRON_SECRET && internalSecret === process.env.CRON_SECRET) return true

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const conversationId = Number(body.conversationId)
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 })
  }

  const rows = await sql`
    SELECT c.id, c.ig_user_id, m.content
    FROM ig_conversations c
    JOIN LATERAL (
      SELECT content
      FROM ig_messages
      WHERE conversation_id = c.id AND from_type = 'contact'
      ORDER BY sent_at DESC
      LIMIT 1
    ) m ON TRUE
    WHERE c.id = ${conversationId}
    LIMIT 1
  `
  const row = rows[0] as { ig_user_id: string; content: string } | undefined
  if (!row) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const draft = await generateSandraDraft({
    igUserId: row.ig_user_id,
    latestMessage: row.content,
  })

  await sql`
    UPDATE ig_conversations
    SET draft_response = ${draft.response},
        draft_generated_at = NOW(),
        agent_confidence = ${draft.confidence},
        flag_reason = CASE WHEN ${draft.confidence} < 0.8 THEN COALESCE(flag_reason, 'low_confidence') ELSE flag_reason END,
        status = CASE WHEN ${draft.confidence} < 0.8 THEN 'flagged' ELSE status END,
        updated_at = NOW()
    WHERE id = ${conversationId}
  `

  return NextResponse.json(draft)
}

