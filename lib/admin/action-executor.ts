import "server-only"

import type { AdminActionRow } from "@/lib/admin/action-queue"
import { requireResendClient } from "@/lib/resend/client"

async function executeResendBroadcast(action: AdminActionRow) {
  const broadcastId = String(action.payload.broadcastId || "").trim()
  if (!broadcastId) throw new Error("Approval is missing its Resend broadcast id")

  const resend = requireResendClient()
  const { data: broadcast, error: getError } = await resend.broadcasts.get(broadcastId)
  if (getError || !broadcast) {
    throw new Error(`Could not verify the Resend draft: ${getError?.message || "not found"}`)
  }

  const status = String((broadcast as { status?: string }).status || "").toLowerCase()
  if (status !== "draft") {
    if (["sent", "scheduled", "sending"].includes(status)) return { sent: true, alreadyHandled: true }
    throw new Error(`Resend broadcast is ${status || "not a draft"}; it was not sent`)
  }

  const { data, error } = await resend.broadcasts.send(broadcastId)
  if (error || !data) throw new Error(`Resend broadcast send failed: ${error?.message || "unknown error"}`)
  return { sent: true, broadcastId: data.id }
}

export async function executeAdminAction(
  action: AdminActionRow,
) {
  if (action.kind === "send_resend_broadcast") {
    return executeResendBroadcast(action)
  }
  throw new Error(`Unsupported admin action: ${action.kind}`)
}
