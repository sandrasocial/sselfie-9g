import "server-only"

import { sql } from "@/lib/db/client"
import { sendInstagramDm } from "@/lib/ig-agent/send-dm"
import { sendManychatDm } from "@/lib/ig-agent/send-manychat"

export async function sendApprovedInstagramReply(input: {
  conversationId: number
  message: string
  expectedDraft?: string | null
}) {
  const message = input.message.trim()
  if (!Number.isSafeInteger(input.conversationId) || input.conversationId <= 0 || !message) {
    throw new Error("A valid conversation and reply are required")
  }

  const rows = await sql`
    SELECT ig_user_id, draft_response
    FROM ig_conversations
    WHERE id = ${input.conversationId}
    LIMIT 1
  `
  const conversation = rows[0] as { ig_user_id?: string; draft_response?: string | null } | undefined
  const igUserId = conversation?.ig_user_id
  if (!igUserId) throw new Error("Conversation not found")

  const currentDraft = String(conversation?.draft_response || "").trim()
  if (input.expectedDraft != null && currentDraft !== input.expectedDraft.trim()) {
    throw new Error("This reply changed after the approval email was created. Review the newest draft instead.")
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

