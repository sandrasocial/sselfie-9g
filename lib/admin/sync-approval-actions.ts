import "server-only"

import {
  approvalUrlForAction,
  queueAdminAction,
  type AdminActionRow,
  type ApprovalActionSummary,
} from "@/lib/admin/action-queue"
import { requireResendClient } from "@/lib/resend/client"

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
  return syncBroadcastActions().catch((error) => {
    console.error("[approval-actions] Resend sync failed:", error)
    return []
  })
}
