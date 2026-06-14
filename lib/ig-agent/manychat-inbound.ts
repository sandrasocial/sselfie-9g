import type { IgChannel } from "@/lib/ig-agent/types"

const SUBSCRIBER_ID_FIELDS = [
  "subscriber_id",
  "subscriberId",
  "manychat_subscriber_id",
  "manychatSubscriberId",
  "user_id",
  "userId",
  "id",
]

const USERNAME_FIELDS = ["username", "ig_username", "igUsername", "instagram_username", "instagramUsername"]
const FULL_NAME_FIELDS = ["full_name", "fullName", "name", "display_name", "displayName"]
const TEXT_FIELDS = [
  "text",
  "message",
  "dm_text",
  "dmText",
  "ig_message",
  "instagram_message",
  "last_text_input",
  "lastTextInput",
  "last_input",
  "lastInput",
  "last_user_input",
  "lastUserInput",
]
const SECRET_FIELDS = ["bridge_secret", "bridgeSecret", "secret", "manychat_bridge_secret", "manychatBridgeSecret"]
const MESSAGE_ID_FIELDS = ["message_id", "messageId", "mid", "external_id", "externalId"]
const TIMESTAMP_FIELDS = ["timestamp", "created_at", "createdAt", "sent_at", "sentAt"]

export type NormalizedManychatInbound = {
  subscriberId: string
  username: string | null
  fullName: string | null
  text: string
  channel: IgChannel
  bridgeSecret: string
  messageId: string | null
  timestamp: number
}

type NormalizeResult =
  | { ok: true; value: NormalizedManychatInbound }
  | { ok: false; error: string; status: number; skipped?: string }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPlaceholder(value: string) {
  return /^\s*\{\{[^}]+\}\}\s*$/.test(value)
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const text = String(value).trim()
  if (!text || isPlaceholder(text)) return null
  return text
}

function pickString(body: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = cleanString(body[field])
    if (value) return value
  }
  return null
}

export function getManychatInboundBridgeSecret(body: unknown) {
  return isObject(body) ? pickString(body, SECRET_FIELDS) || "" : ""
}

function pickFullName(body: Record<string, unknown>) {
  const direct = pickString(body, FULL_NAME_FIELDS)
  if (direct) return direct

  const firstName = cleanString(body.first_name) || cleanString(body.firstName) || ""
  const lastName = cleanString(body.last_name) || cleanString(body.lastName) || ""
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null
}

function normalizeChannel(value: unknown): IgChannel {
  const channel = cleanString(value)?.toLowerCase()
  if (channel === "comment" || channel === "story_reply") return channel
  return "dm"
}

function normalizeTimestamp(value: string | null) {
  if (!value) return Date.now()

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric < 1000000000000 ? numeric * 1000 : numeric
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

export function normalizeManychatInboundPayload(body: unknown): NormalizeResult {
  if (!isObject(body)) {
    return { ok: false, error: "JSON body required", status: 400 }
  }

  const subscriberId = pickString(body, SUBSCRIBER_ID_FIELDS)
  const text = pickString(body, TEXT_FIELDS)
  if (!subscriberId || !text) {
    return { ok: false, error: "subscriber_id and text required", status: 400 }
  }

  if (text.length > 4000) {
    return { ok: false, error: "Message skipped", status: 200, skipped: "oversized" }
  }

  const username = pickString(body, USERNAME_FIELDS)?.replace(/^@+/, "") || null
  const fullName = pickFullName(body)
  const messageId = pickString(body, MESSAGE_ID_FIELDS)
  const timestamp = normalizeTimestamp(pickString(body, TIMESTAMP_FIELDS))

  return {
    ok: true,
    value: {
      subscriberId,
      username,
      fullName,
      text,
      channel: normalizeChannel(body.channel),
      bridgeSecret: pickString(body, SECRET_FIELDS) || "",
      messageId,
      timestamp,
    },
  }
}
