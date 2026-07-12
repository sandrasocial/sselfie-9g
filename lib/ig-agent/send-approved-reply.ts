import "server-only"

import { sql } from "@/lib/db/client"
import { sendInstagramDm } from "@/lib/ig-agent/send-dm"
import { sendManychatDm } from "@/lib/ig-agent/send-manychat"

export async function sendApprovedInstagramReply(input: {
  conversationId: number
  message: string
  expectedDraft?: string | null
  expectedInboundMessageId?: number | null
}) {
  const message = input.message.trim()
  if (!Number.isSafeInteger(input.conversationId) || input.conversationId <= 0 || !message) {
    throw new Error("A valid conversation and reply are required")
  }

  const rows = await sql`
    SELECT
      c.ig_user_id,
      c.draft_response,
      latest_contact.id AS latest_inbound_message_id
    FROM ig_conversations c
    LEFT JOIN LATERAL (
      SELECT m.id
      FROM ig_messages m
      WHERE m.conversation_id = c.id
        AND m.from_type = 'contact'
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) latest_contact ON TRUE
    WHERE c.id = ${input.conversationId}
    LIMIT 1
  `
  const conversation = rows[0] as {
    ig_user_id?: string
    draft_response?: string | null
    latest_inbound_message_id?: number | string | null
  } | undefined
  const igUserId = conversation?.ig_user_id
  if (!igUserId) throw new Error("Conversation not found")

  const currentDraft = String(conversation?.draft_response || "").trim()
  if (input.expectedDraft != null && currentDraft !== input.expectedDraft.trim()) {
    throw new Error("This reply changed after the approval email was created. Review the newest draft instead.")
  }
  if (
    input.expectedInboundMessageId != null &&
    Number(conversation?.latest_inbound_message_id || 0) !== input.expectedInboundMessageId
  ) {
    throw new Error("The customer sent a newer message. Review the full conversation before replying.")
  }

  const result = igUserId.startsWith("mc:")
    ? await sendManychatDm({
        igUserId,
        message,
        conversationId: input.conversationId,
        fromType: "sandra",
      })
    : await sendInstagramDm({
        igUserId,
        message,
        conversationId: input.conversationId,
        fromType: "sandra",
      })

  await sql`
    UPDATE ig_conversations
    SET status = ${result.sent ? "sandra_replied" : "flagged"},
        flag_reason = ${result.sent ? null : result.reason},
        last_seen_by_sandra = NOW(),
        updated_at = NOW()
    WHERE id = ${input.conversationId}
  `

  if (!result.sent) throw new Error(result.reason || "Instagram reply failed")
  return result
}
