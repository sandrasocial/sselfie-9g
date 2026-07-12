import "server-only"

import type { AdminActionRow } from "@/lib/admin/action-queue"
import { sql } from "@/lib/db/client"

export type DmApprovalContext = {
  conversationId: number
  username: string
  inboundMessageId: number
  customerMessage: string
  receivedAt: Date | string
}

type DmApprovalContextRow = {
  conversation_id: number | string
  username: string | null
  inbound_message_id: number | string
  customer_message: string
  received_at: Date | string
}

function positiveSafeInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function mapContext(row: DmApprovalContextRow | undefined): DmApprovalContext | null {
  if (!row) return null
  const conversationId = positiveSafeInteger(row.conversation_id)
  const inboundMessageId = positiveSafeInteger(row.inbound_message_id)
  const customerMessage = String(row.customer_message || "").trim()
  if (!conversationId || !inboundMessageId || !customerMessage) return null

  return {
    conversationId,
    username: String(row.username || "unknown"),
    inboundMessageId,
    customerMessage,
    receivedAt: row.received_at,
  }
}

/** Resolve the exact customer message a founder-approved DM reply answers.
 *  New actions carry an immutable inbound message id. Older signed links fall back to the
 *  contact message immediately before the stored agent draft (or the action creation time).
 */
export async function getDmApprovalContext(
  action: Pick<AdminActionRow, "kind" | "payload" | "created_at">,
): Promise<DmApprovalContext | null> {
  if (action.kind !== "send_ig_reply") return null

  const conversationId = positiveSafeInteger(action.payload.conversationId)
  if (!conversationId) return null

  const inboundMessageId = positiveSafeInteger(action.payload.inboundMessageId)
  if (inboundMessageId) {
    const rows = (await sql`
      SELECT
        c.id AS conversation_id,
        COALESCE(NULLIF(ct.username, ''), c.ig_user_id) AS username,
        m.id AS inbound_message_id,
        m.content AS customer_message,
        m.sent_at AS received_at
      FROM ig_conversations c
      JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
      JOIN ig_messages m ON m.conversation_id = c.id
      WHERE c.id = ${conversationId}
        AND m.id = ${inboundMessageId}
        AND m.from_type = 'contact'
      LIMIT 1
    `) as DmApprovalContextRow[]
    return mapContext(rows[0])
  }

  const actionCreatedAt = new Date(action.created_at)
  if (Number.isNaN(actionCreatedAt.getTime())) return null
  const expectedDraft = String(action.payload.draft || "").trim()
  const rows = (await sql`
    SELECT
      c.id AS conversation_id,
      COALESCE(NULLIF(ct.username, ''), c.ig_user_id) AS username,
      latest_contact.id AS inbound_message_id,
      latest_contact.content AS customer_message,
      latest_contact.sent_at AS received_at
    FROM ig_conversations c
    JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
    JOIN LATERAL (
      SELECT m.id, m.content, m.sent_at
      FROM ig_messages m
      WHERE m.conversation_id = c.id
        AND m.from_type = 'contact'
        AND m.created_at <= COALESCE(
          (
            SELECT draft_message.created_at
            FROM ig_messages draft_message
            WHERE draft_message.conversation_id = c.id
              AND draft_message.from_type = 'agent'
              AND draft_message.send_status = 'draft'
              AND draft_message.content = ${expectedDraft}
              AND draft_message.created_at <= ${actionCreatedAt}::timestamptz + INTERVAL '1 minute'
            ORDER BY draft_message.created_at DESC, draft_message.id DESC
            LIMIT 1
          ),
          ${actionCreatedAt}::timestamptz
        )
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) latest_contact ON TRUE
    WHERE c.id = ${conversationId}
    LIMIT 1
  `) as DmApprovalContextRow[]
  return mapContext(rows[0])
}
