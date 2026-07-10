import "server-only"

import { addAdminMemoryNote } from "@/lib/app-v3/maya/admin-memory-store"
import type { AdminActionRow } from "@/lib/admin/action-queue"
import { sendApprovedInstagramReply } from "@/lib/ig-agent/send-approved-reply"
import { requireResendClient } from "@/lib/resend/client"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

async function executeInstagramReply(action: AdminActionRow, editedMessage?: string | null) {
  const conversationId = Number(action.payload.conversationId)
  const expectedDraft = String(action.payload.draft || "").trim()
  const message = String(editedMessage || expectedDraft).trim()
  if (!conversationId || !expectedDraft || !message) throw new Error("Approval is missing its DM reply")

  if (message !== expectedDraft) {
    await addAdminMemoryNote({
      adminUserId: ADMIN_EMAIL,
      kind: "voice",
      sourceType: "manual",
      sourceId: conversationId,
      sourceTitle: "Email approval reply edit",
      note: `Sandra edited a DM reply. Original: "${expectedDraft.slice(0, 280)}" Edited: "${message.slice(0, 280)}"`,
      metadata: { conversationId, originalLength: expectedDraft.length, editedLength: message.length },
    }).catch((error) => console.error("[admin-action] failed to store voice memory:", error))
  }

  return sendApprovedInstagramReply({ conversationId, message, expectedDraft })
}

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
  input: { editedMessage?: string | null } = {},
) {
  if (action.kind === "send_ig_reply") {
    return executeInstagramReply(action, input.editedMessage)
  }
  if (action.kind === "send_resend_broadcast") {
    return executeResendBroadcast(action)
  }
  throw new Error(`Unsupported admin action: ${action.kind}`)
}

