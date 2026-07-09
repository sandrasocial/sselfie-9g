import { after, type NextRequest, NextResponse } from "next/server"
import { processInboundInstagramMessage } from "@/lib/ig-agent/processor"
import { verifyMetaSignature } from "@/lib/ig-agent/webhook-security"
import { sql } from "@/lib/db/client"
import type { IgChannel } from "@/lib/ig-agent/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ExtractedInbound = {
  igUserId: string
  username?: string | null
  fullName?: string | null
  messageId?: string | null
  threadId?: string | null
  channel: IgChannel
  text: string
  timestamp?: number | null
  rawPayload?: unknown
}

type MetaWebhookPayload = {
  entry?: Array<{
    messaging?: Array<{
      sender?: { id?: string | number }
      message?: { text?: string; mid?: string; is_echo?: boolean }
      postback?: { title?: string; mid?: string }
      timestamp?: number
    }>
    changes?: Array<{
      field?: string
      value?: {
        from?: { id?: string | number; username?: string; name?: string }
        text?: string
        message?: string
        comment?: string
        caption?: string
        from_id?: string | number
        sender_id?: string | number
        username?: string
        id?: string
        comment_id?: string
        timestamp?: string | number
      }
    }>
  }>
}

function extractInboundMessages(payload: MetaWebhookPayload): ExtractedInbound[] {
  const items: ExtractedInbound[] = []

  for (const entry of payload?.entry || []) {
    for (const event of entry.messaging || []) {
      const text = event.message?.text || event.postback?.title
      const senderId = event.sender?.id
      if (!text || !senderId || event.message?.is_echo) continue

      items.push({
        igUserId: String(senderId),
        messageId: event.message?.mid || event.postback?.mid || null,
        threadId: `dm:${senderId}`,
        channel: "dm",
        text: String(text),
        timestamp: event.timestamp || null,
        rawPayload: event,
      })
    }

    for (const change of entry.changes || []) {
      const field = String(change.field || "")
      const value = change.value || {}
      const from = value.from || {}
      const text = value.text || value.message || value.comment || value.caption
      const fromId = from.id || value.from_id || value.sender_id
      if (!text || !fromId) continue

      const channel: IgChannel = field.includes("mention") ? "mention" : "comment"
      items.push({
        igUserId: String(fromId),
        username: from.username || value.username || null,
        fullName: from.name || null,
        messageId: value.id || value.comment_id || null,
        threadId: `${channel}:${value.id || value.comment_id || fromId}`,
        channel,
        text: String(text),
        timestamp: value.timestamp ? Number(value.timestamp) : null,
        rawPayload: change,
      })
    }
  }

  return items
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  return new Response("Forbidden", { status: 403 })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")

  const validSignature = [process.env.INSTAGRAM_APP_SECRET, process.env.INSTAGRAM_LOGIN_APP_SECRET]
    .filter(Boolean)
    .some((appSecret) => verifyMetaSignature({ body, signature, appSecret }))

  // TEMP diagnostics (2026-07-09): live customer traffic is landing in ManyChat's
  // own separate Instagram subscription but not showing up in ig_messages via
  // this app's webhook. Record every hit (valid or not) so we can see whether
  // Meta is even calling us, and if so, why it's being rejected before
  // processing. Drop table + this block once inbound capture is confirmed working.
  try {
    await sql`INSERT INTO ig_webhook_hits (signature_present, signature_valid, entry_summary) VALUES (
      ${Boolean(signature)}, ${validSignature}, ${body.slice(0, 500)}
    )`
  } catch {}

  if (!validSignature) {
    return new Response("Forbidden", { status: 403 })
  }

  let payload: MetaWebhookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const messages = extractInboundMessages(payload)

  try {
    await sql`UPDATE ig_webhook_hits SET extracted_count = ${messages.length} WHERE id = (SELECT MAX(id) FROM ig_webhook_hits)`
  } catch {}

  after(async () => {
    for (const message of messages) {
      try {
        await processInboundInstagramMessage(message)
      } catch (error) {
        console.error("[ig-agent] Failed to process inbound webhook message:", error)
        try {
          await sql`UPDATE ig_webhook_hits SET process_error = ${error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)} WHERE id = (SELECT MAX(id) FROM ig_webhook_hits)`
        } catch {}
      }
    }
  })

  return NextResponse.json({ received: true, queued: messages.length })
}
