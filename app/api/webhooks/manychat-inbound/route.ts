// DM-RELIEF-01 Layer 2 — ManyChat inbound bridge.
//
// Why this exists: Meta only delivers Instagram DMs to the subscribed app, and that app is
// ManyChat. Polling the mailbox via the Graph API times out (the inbox is too large), and our
// own /api/webhooks/instagram receiver needs Meta dashboard config that competes with
// ManyChat. So ManyChat itself becomes the feed: a "Default Reply" automation (fires for
// every DM that matches no keyword) makes one External Request to this endpoint, and the
// message flows into the EXISTING ig-agent pipeline (triage -> voice-drafted reply -> waits
// for Sandra's approval in /admin/ig-inbox). Nothing is ever auto-sent.
//
// ManyChat External Request setup (one-time, in the ManyChat editor):
//   POST https://www.sselfie.ai/api/webhooks/manychat-inbound
//   Header: x-bridge-secret = MANYCHAT_BRIDGE_SECRET (or include bridge_secret in the JSON body)
//   Body (JSON):
//     {
//       "subscriber_id": "{{user_id}}",
//       "username": "{{ig_username}}",
//       "full_name": "{{full_name}}",
//       "text": "{{last_text_input}}"
//     }

import { after, type NextRequest, NextResponse } from "next/server"
import { getManychatInboundBridgeSecret, normalizeManychatInboundPayload } from "@/lib/ig-agent/manychat-inbound"
import { processInboundInstagramMessage } from "@/lib/ig-agent/processor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function POST(request: NextRequest) {
  const secret = process.env.MANYCHAT_BRIDGE_SECRET?.trim()
  if (!secret) {
    // Ships dark until the env is set — same kill-switch pattern as every other system.
    return NextResponse.json({ error: "Bridge not enabled" }, { status: 503 })
  }
  const body = await request.json().catch(() => null)
  const normalized = normalizeManychatInboundPayload(body)
  const provided = request.headers.get("x-bridge-secret")?.trim() || getManychatInboundBridgeSecret(body)
  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!normalized.ok) {
    if (normalized.status === 200) {
      return NextResponse.json({ version: "v2", content: { messages: [] }, skipped: normalized.skipped })
    }
    return NextResponse.json({ error: normalized.error }, { status: normalized.status })
  }

  const inbound = normalized.value
  after(async () => {
    try {
      await processInboundInstagramMessage({
        igUserId: `mc:${inbound.subscriberId}`,
        username: inbound.username,
        fullName: inbound.fullName,
        messageId: inbound.messageId ? `mc:${inbound.messageId}` : null,
        threadId: `mc-${inbound.channel}:${inbound.subscriberId}`,
        channel: inbound.channel,
        text: inbound.text,
        timestamp: inbound.timestamp,
        rawPayload: {
          source: "manychat_bridge",
          manychat_subscriber_id: inbound.subscriberId,
          inbound_channel: inbound.channel,
        },
      })
    } catch (error) {
      console.error("[manychat-bridge] Failed to process inbound DM:", error)
    }
  })

  // ManyChat dynamic-block response: empty messages = no visible auto-reply (the voice draft
  // waits for Sandra's approval in /admin/ig-inbox instead).
  return NextResponse.json({ version: "v2", content: { messages: [] } })
}
