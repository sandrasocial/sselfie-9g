import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { sendInstagramDm } from "@/lib/ig-agent/send-dm"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { conversationId: rawConversationId } = await params
  const conversationId = Number(rawConversationId)
  const body = await request.json().catch(() => ({}))
  const message = String(body.message || "").trim()

  if (!conversationId || !message) {
    return NextResponse.json({ error: "conversationId and message required" }, { status: 400 })
  }

  const rows = await sql`
    SELECT ig_user_id
    FROM ig_conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `
  const igUserId = (rows[0] as { ig_user_id?: string } | undefined)?.ig_user_id
  if (!igUserId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const result = await sendInstagramDm({
    igUserId,
    message,
    conversationId,
    fromType: "sandra",
  })

  await sql`
    UPDATE ig_conversations
    SET status = ${result.sent ? "sandra_replied" : "flagged"},
        flag_reason = ${result.sent ? null : result.reason},
        last_seen_by_sandra = NOW(),
        updated_at = NOW()
    WHERE id = ${conversationId}
  `

  return NextResponse.json({ success: true, result })
}

