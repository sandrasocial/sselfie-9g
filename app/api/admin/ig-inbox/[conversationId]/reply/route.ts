import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { addAdminMemoryNote } from "@/lib/app-v3/maya/admin-memory-store"
import { sendApprovedInstagramReply } from "@/lib/ig-agent/send-approved-reply"

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
    SELECT ig_user_id, draft_response
    FROM ig_conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `
  const conversation = rows[0] as { ig_user_id?: string; draft_response?: string | null } | undefined
  if (!conversation?.ig_user_id) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const draft = String(conversation?.draft_response || "").trim()
  if (draft && draft !== message) {
    await addAdminMemoryNote({
      adminUserId: ADMIN_EMAIL,
      kind: "voice",
      sourceType: "manual",
      sourceId: conversationId,
      sourceTitle: "IG inbox reply edit",
      note: `Sandra edited a DM reply. Original: "${draft.slice(0, 280)}" Edited: "${message.slice(0, 280)}"`,
      metadata: { conversationId, originalLength: draft.length, editedLength: message.length },
    }).catch((error) => console.error("[ig-inbox] failed to store voice memory:", error))
  }

  const result = await sendApprovedInstagramReply({ conversationId, message })

  return NextResponse.json({
    success: true,
    result,
    error: null,
  })
}
