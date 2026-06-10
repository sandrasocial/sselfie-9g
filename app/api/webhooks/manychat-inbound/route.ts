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
//   Header: x-bridge-secret = MANYCHAT_BRIDGE_SECRET (set the same value in Vercel env)
//   Body (JSON):
//     {
//       "subscriber_id": "{{user_id}}",
//       "username": "{{ig_username}}",
//       "full_name": "{{full_name}}",
//       "text": "{{last_text_input}}"
//     }

import { after, type NextRequest, NextResponse } from "next/server"
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
  const provided = request.headers.get("x-bridge-secret")?.trim() || ""
  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as {
    subscriber_id?: string | number
    username?: string
    full_name?: string
    text?: string
    channel?: string
  } | null

  // Same bridge serves comment triggers later: add "channel": "comment" in the ManyChat body.
  const channel = body?.channel === "comment" ? "comment" : body?.channel === "story_reply" ? "story_reply" : "dm"

  const subscriberId = body?.subscriber_id ? String(body.subscriber_id) : ""
  const text = (body?.text || "").trim()
  if (!subscriberId || !text) {
    return NextResponse.json({ error: "subscriber_id and text required" }, { status: 400 })
  }
  // Guardrails: ManyChat templates can leak literal placeholders when a field is empty.
  if (text.startsWith("{{") || text.length > 4000) {
    // Unsubstituted placeholder or oversized — acknowledge in ManyChat's dynamic format, send nothing.
    return NextResponse.json({ version: "v2", content: { messages: [] }, skipped: "placeholder_or_oversized" })
  }

  after(async () => {
    try {
      await processInboundInstagramMessage({
        igUserId: `mc:${subscriberId}`,
        username: body?.username?.replace(/^\{\{.*\}\}$/, "") || null,
        fullName: body?.full_name?.replace(/^\{\{.*\}\}$/, "") || null,
        messageId: null,
        threadId: `mc-${channel}:${subscriberId}`,
        channel,
        text,
        timestamp: Date.now(),
        rawPayload: { source: "manychat_bridge", manychat_subscriber_id: subscriberId },
      })
    } catch (error) {
      console.error("[manychat-bridge] Failed to process inbound DM:", error)
    }
  })

  // ManyChat dynamic-block response: empty messages = no visible auto-reply (the voice draft
  // waits for Sandra's approval in /admin/ig-inbox instead).
  return NextResponse.json({ version: "v2", content: { messages: [] } })
}
