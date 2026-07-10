import "server-only"

import { createHash } from "node:crypto"
import {
  approvalUrlForAction,
  queueAdminAction,
  type AdminActionRow,
  type ApprovalActionSummary,
} from "@/lib/admin/action-queue"
import { sql } from "@/lib/db/client"
import { requireResendClient } from "@/lib/resend/client"

type FlaggedConversation = {
  id: number
  username: string | null
  ig_user_id: string
  draft_response: string
  updated_at: Date | string
}

function short(value: string, max = 240): string {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 20)
}

function summaryFor(action: AdminActionRow): ApprovalActionSummary | null {
  if (action.status !== "pending" || new Date(action.expires_at).getTime() <= Date.now()) return null
  return {
    kind: action.kind,
    title: action.title,
    summary: action.summary,
    approvalUrl: approvalUrlForAction(action),
    source: action.source,
  }
}

async function syncDmActions(): Promise<ApprovalActionSummary[]> {
  await sql`
    UPDATE admin_action_queue a
    SET status = 'dismissed', acted_at = NOW(),
        review_note = 'Conversation no longer needs a founder decision', updated_at = NOW()
    WHERE a.kind = 'send_ig_reply'
      AND a.status = 'pending'
      AND NOT EXISTS (
        SELECT 1
        FROM ig_conversations c
        WHERE c.id = NULLIF(a.payload->>'conversationId', '')::int
          AND c.status = 'flagged'
          AND c.channel = 'dm'
          AND NULLIF(TRIM(c.draft_response), '') IS NOT NULL
      )
  `

  const conversations = (await sql`
    SELECT c.id, c.ig_user_id, c.draft_response, c.updated_at, ct.username
    FROM ig_conversations c
    JOIN ig_contacts ct ON ct.ig_user_id = c.ig_user_id
    WHERE c.status = 'flagged'
      AND c.channel = 'dm'
      AND NULLIF(TRIM(c.draft_response), '') IS NOT NULL
    ORDER BY c.updated_at DESC
    LIMIT 5
  `) as FlaggedConversation[]

  const actions = await Promise.all(
    conversations.map(async (conversation) => {
      const draft = conversation.draft_response.trim()
      const action = await queueAdminAction({
        kind: "send_ig_reply",
        title: `Reply to @${conversation.username || conversation.ig_user_id}`,
        summary: short(draft),
        source: "ig_conversations",
        idempotencyKey: `ig-reply/${conversation.id}/${digest(draft)}`,
        payload: {
          conversationId: conversation.id,
          draft,
        },
      })
      await sql`
        UPDATE admin_action_queue
        SET status = 'dismissed', acted_at = NOW(), updated_at = NOW()
        WHERE kind = 'send_ig_reply'
          AND status = 'pending'
          AND id <> ${action.id}
          AND payload->>'conversationId' = ${String(conversation.id)}
      `
      return summaryFor(action)
    }),
  )
  return actions.filter((action): action is ApprovalActionSummary => Boolean(action))
}

async function syncBroadcastActions(): Promise<ApprovalActionSummary[]> {
  const resend = requireResendClient()
  const { data, error } = await resend.broadcasts.list()
  if (error) throw new Error(`Could not list Resend broadcasts: ${error.message}`)

  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
  const broadcasts = (((data as any)?.data || []) as Array<Record<string, unknown>>)
    .filter((broadcast) => String(broadcast.status || "").toLowerCase() === "draft")
    .filter((broadcast) => String(broadcast.name || "").startsWith("Story ·"))
    .filter((broadcast) => {
      const createdAt = new Date(String(broadcast.created_at || 0)).getTime()
      return Number.isFinite(createdAt) && createdAt >= cutoff
    })
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 3)

  const actions = await Promise.all(
    broadcasts.map(async (broadcast) => {
      const broadcastId = String(broadcast.id || "")
      if (!broadcastId) return null
      const title = String(broadcast.name || broadcast.subject || "Daily email draft")
      const action = await queueAdminAction({
        kind: "send_resend_broadcast",
        title,
        summary: "Review the preview, then confirm the send to the broadcast audience.",
        source: "Resend broadcasts",
        idempotencyKey: `resend-broadcast/${broadcastId}`,
        payload: { broadcastId },
      })
      return summaryFor(action)
    }),
  )
  return actions.filter((action): action is ApprovalActionSummary => Boolean(action))
}

export async function syncApprovalActions(): Promise<ApprovalActionSummary[]> {
  const [dmActions, broadcastActions] = await Promise.all([
    syncDmActions().catch((error) => {
      console.error("[approval-actions] DM sync failed:", error)
      return []
    }),
    syncBroadcastActions().catch((error) => {
      console.error("[approval-actions] Resend sync failed:", error)
      return []
    }),
  ])

  return [...dmActions, ...broadcastActions].slice(0, 5)
}
