// DM-RELIEF-01 — outbound sender for bridge-originated contacts (ig_user_id = "mc:<id>").
// These conversations arrived via the ManyChat inbound bridge, so ManyChat (the app Meta
// actually delivers DMs to) is also the reliable send path: api.manychat.com sendContent.
//
// Send policy:
// - fromType "sandra" = a human approved this exact text in /admin/ig-inbox -> SEND.
// - fromType "agent" = automated -> only sends when IG_AGENT_AUTO_SEND_ENABLED === "true"
//   (same kill-switch the Graph sender uses); otherwise it is stored as a draft.
// ManyChat enforces Instagram's 24h messaging window server-side; outside it the API returns
// an error which we surface as a flagged failure instead of throwing.

import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"

export type SendManychatDmResult = { sent: boolean; reason?: string }

export async function sendManychatDm(params: {
  igUserId: string // "mc:<subscriber_id>"
  message: string
  conversationId: number
  fromType?: "agent" | "sandra"
}): Promise<SendManychatDmResult> {
  const fromType = params.fromType || "agent"
  const subscriberId = params.igUserId.replace(/^mc:/, "")
  const apiKey = process.env.MANYCHAT_API_KEY?.trim()

  const record = async (sendStatus: string, delivered: boolean) => {
    await sql`
      INSERT INTO ig_messages (
        conversation_id, from_type, content, ai_generated, send_status, delivered, sent_at
      ) VALUES (
        ${params.conversationId}, ${fromType}, ${params.message},
        ${fromType !== "sandra"}, ${sendStatus}, ${delivered}, NOW()
      )
    `
  }

  if (fromType !== "sandra" && !envFlag("IG_AGENT_AUTO_SEND_ENABLED")) {
    await record("draft", false)
    return { sent: false, reason: "auto_send_disabled" }
  }
  // Fail closed until Sandra's dedicated ManyChat token has been verified against
  // @sandra.social. The previously shared token resolved to a stale account.
  if (!envFlag("MANYCHAT_OUTBOUND_ENABLED")) {
    await record("blocked", false)
    return { sent: false, reason: "manychat_outbound_disabled_pending_account_verification" }
  }
  if (!apiKey) {
    await record("failed", false)
    return { sent: false, reason: "manychat_api_key_missing" }
  }

  try {
    const res = await fetch("https://api.manychat.com/fb/sending/sendContent", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriber_id: Number(subscriberId) || subscriberId,
        data: {
          version: "v2",
          content: {
            type: "instagram",
            messages: [{ type: "text", text: params.message }],
          },
        },
      }),
    })
    const data = (await res.json().catch(() => null)) as { status?: string; details?: unknown } | null
    if (res.ok && data?.status === "success") {
      await record("sent", true)
      return { sent: true }
    }
    const reason = `manychat_send_failed: ${JSON.stringify(data).slice(0, 160)}`
    await record("failed", false)
    return { sent: false, reason }
  } catch (error) {
    await record("failed", false)
    return { sent: false, reason: `manychat_send_error: ${error instanceof Error ? error.message : "unknown"}` }
  }
}
