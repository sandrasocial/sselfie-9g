import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { sql } from "@/lib/db/client"

const WEBHOOK_EVENT_TYPES = new Set([
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.delivery_delayed",
  "email.suppressed",
  "email.scheduled",
])

type EmailLogStatus =
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "delivery_delayed"
  | "suppressed"
  | "scheduled"

interface ResendEventContext {
  body: any
  eventType: string
  eventData: any
  recipientEmail: string | null
  messageId: string | null
  broadcastId: string | null
  campaignId: number | null
  resolvedEmailType: string | null
  resendEventId: string | null
  eventTimestamp: Date
}

function resolveBroadcastId(eventData: any): string | null {
  return eventData?.broadcast_id || eventData?.broadcastId || eventData?.broadcast?.id || null
}

function resolveEmailTypeFromTags(eventData: any): string | null {
  const tags = eventData?.tags
  if (!Array.isArray(tags)) return null

  const typeTag = tags.find((entry) => entry?.name === "type")
  if (typeTag?.value) return String(typeTag.value)

  // Most app sends currently pass tags as { name: tag, value: tag }. Prefer the
  // lifecycle-looking tag when present so fallback matching is as narrow as possible.
  const lifecycleTag = tags.find((entry) => typeof entry?.name === "string" && entry.name.includes("-"))
  return lifecycleTag?.name || null
}

function slugifyEmailSubject(subject: string | null): string {
  if (!subject) return ""
  return subject
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function resolveBroadcastEmailType(eventData: any, broadcastId: string | null): string | null {
  if (!broadcastId) return null

  const idPart = broadcastId.slice(0, 8)
  const subjectSlug = slugifyEmailSubject(typeof eventData?.subject === "string" ? eventData.subject : null)
  const base = subjectSlug ? `broadcast-${idPart}-${subjectSlug}` : `broadcast-${idPart}`

  return base.slice(0, 50)
}

function looksLikeEmail(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v.includes("@") && !v.includes(" ") && !v.startsWith("{") && !v.startsWith("[")
}

function normalizeRecipientEmail(raw: any): string | null {
  if (!raw) return null

  if (typeof raw === "string") {
    const s = raw.trim()
    if (looksLikeEmail(s)) return s.toLowerCase()
    if ((s.startsWith("{") || s.startsWith("[")) && s.length < 512) {
      try {
        return normalizeRecipientEmail(JSON.parse(s))
      } catch {
        return null
      }
    }
    return null
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const normalized = normalizeRecipientEmail(entry)
      if (normalized) return normalized
    }
    return null
  }

  if (typeof raw === "object") {
    if (typeof raw.email === "string" && looksLikeEmail(raw.email)) return raw.email.trim().toLowerCase()
    if (typeof raw.address === "string" && looksLikeEmail(raw.address)) return raw.address.trim().toLowerCase()
    if (typeof raw.value === "string" && looksLikeEmail(raw.value)) return raw.value.trim().toLowerCase()

    const keys = Object.keys(raw)
    if (keys.length === 1 && looksLikeEmail(keys[0])) return keys[0].toLowerCase()

    for (const key of keys) {
      const normalized = normalizeRecipientEmail((raw as any)[key])
      if (normalized) return normalized
    }
  }

  return null
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.toLowerCase().split("@")
  if (!domain) return "***"
  return `${local.slice(0, 2)}***@${domain}`
}

function resolveMessageId(eventData: any, body: any): string | null {
  return eventData?.email_id || eventData?.message_id || eventData?.id || body?.email_id || body?.message_id || null
}

function resolveResendEventId(body: any): string | null {
  return body?.id || body?.event_id || body?.eventId || null
}

function resolveEventTimestamp(eventData: any, body: any): Date {
  const raw =
    eventData?.timestamp ||
    eventData?.open?.timestamp ||
    eventData?.click?.timestamp ||
    eventData?.bounce?.timestamp ||
    eventData?.created_at ||
    body?.created_at ||
    body?.timestamp
  if (raw) {
    const parsed = new Date(raw)
    if (Number.isFinite(parsed.getTime())) return parsed
  }
  return new Date()
}

function eventErrorMessage(eventType: string, eventData: any): string | null {
  if (eventType === "email.bounced") {
    const bounceType = eventData?.bounce_type || eventData?.type || "unknown"
    const bounceReason = eventData?.bounce_reason || eventData?.reason || eventData?.message || "Unknown bounce reason"
    return `Bounced: ${bounceType} - ${bounceReason}`
  }

  if (eventType === "email.complained") return "User marked email as spam"
  if (eventType === "email.failed") return eventData?.reason || eventData?.message || eventData?.error || "Resend marked email as failed"
  if (eventType === "email.delivery_delayed") return eventData?.reason || eventData?.message || "Delivery delayed"
  if (eventType === "email.suppressed") return eventData?.reason || eventData?.message || "Recipient suppressed by Resend"
  return null
}

async function resolveCampaignId(broadcastId: string | null): Promise<number | null> {
  if (!broadcastId) return null
  const campaign = await sql`
    SELECT id FROM admin_email_campaigns
    WHERE resend_broadcast_id = ${broadcastId}
    LIMIT 1
  `
  return campaign?.[0]?.id || null
}

async function resolveCampaignTypeById(campaignId: number | null): Promise<string | null> {
  if (!campaignId) return null
  const rows = await sql`
    SELECT campaign_type
    FROM admin_email_campaigns
    WHERE id = ${campaignId}
    LIMIT 1
  `
  return String(rows?.[0]?.campaign_type || "").trim() || null
}

async function resolveCampaignKeyByBroadcastId(broadcastId: string | null): Promise<string | null> {
  if (!broadcastId) return null
  const rows = await sql`
    SELECT campaign_key
    FROM email_events
    WHERE provider_broadcast_id = ${broadcastId}
      AND campaign_key IS NOT NULL
      AND campaign_key != ''
    ORDER BY created_at DESC
    LIMIT 1
  `
  return String(rows?.[0]?.campaign_key || "").trim() || null
}

async function persistEmailEvent(context: ResendEventContext): Promise<number | null> {
  const metadata = {
    provider: "resend",
    resend_event_id: context.resendEventId,
    resend_message_id: context.messageId,
    recipient_email: context.recipientEmail,
    recipient_masked: maskEmail(context.recipientEmail),
    event_type: context.eventType,
    event_data: context.eventData,
    raw_event: context.body,
    received_at: new Date().toISOString(),
  }

  if (context.resendEventId) {
    const existing = await sql`
      SELECT id
      FROM email_events
      WHERE metadata->>'resend_event_id' = ${context.resendEventId}
      LIMIT 1
    `
    if (existing.length > 0) return Number(existing[0].id)
  }

  const inserted = await sql`
    INSERT INTO email_events (
      email_type,
      campaign_id,
      status,
      metadata,
      created_at,
      campaign_key,
      provider_broadcast_id,
      recipient_count,
      event_type
    ) VALUES (
      ${context.resolvedEmailType || context.eventType},
      ${context.campaignId},
      'received',
      ${metadata}::jsonb,
      NOW(),
      ${context.resolvedEmailType || null},
      ${context.broadcastId},
      ${context.recipientEmail ? 1 : null},
      ${context.eventType}
    )
    RETURNING id
  `

  return inserted?.[0]?.id ? Number(inserted[0].id) : null
}

async function updateEmailEventStatus(eventRowId: number | null, status: string, errorMessage?: string | null) {
  if (!eventRowId) return
  await sql`
    UPDATE email_events
    SET status = ${status},
        error_message = ${errorMessage || null},
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ processed_at: new Date().toISOString() })}::jsonb
    WHERE id = ${eventRowId}
  `
}

function emailLogStatusSql(status: EmailLogStatus | undefined) {
  return status || null
}

async function updateByMessageId(input: {
  messageId: string
  status?: EmailLogStatus
  campaignId?: number | null
  errorMessage?: string | null
  openedAt?: Date | null
  clickedAt?: Date | null
}) {
  return await sql`
    UPDATE email_logs
    SET
      status = CASE
        WHEN status IN ('bounced', 'complained', 'failed', 'suppressed')
          AND ${emailLogStatusSql(input.status)} IN ('sent', 'delivered', 'scheduled', 'delivery_delayed')
        THEN status
        WHEN status = 'delivered'
          AND ${emailLogStatusSql(input.status)} IN ('sent', 'scheduled', 'delivery_delayed')
        THEN status
        ELSE COALESCE(${emailLogStatusSql(input.status)}, status)
      END,
      campaign_id = COALESCE(${input.campaignId || null}, campaign_id),
      error_message = COALESCE(${input.errorMessage || null}, error_message),
      opened = CASE WHEN ${input.openedAt || null}::timestamptz IS NULL THEN opened ELSE true END,
      opened_at = COALESCE(opened_at, ${input.openedAt || null}),
      clicked = CASE WHEN ${input.clickedAt || null}::timestamptz IS NULL THEN clicked ELSE true END,
      clicked_at = COALESCE(clicked_at, ${input.clickedAt || null})
    WHERE resend_message_id = ${input.messageId}
    RETURNING id, user_email, email_type, campaign_id
  `
}

async function updateUniqueRecentLogByRecipient(input: {
  recipientEmail: string | null
  messageId: string | null
  emailType?: string | null
  campaignId?: number | null
  status?: EmailLogStatus
  errorMessage?: string | null
  openedAt?: Date | null
  clickedAt?: Date | null
}) {
  if (!input.recipientEmail) return [] as any[]

  const candidates = input.emailType
    ? await sql`
        SELECT id
        FROM email_logs
        WHERE LOWER(BTRIM(user_email)) = ${input.recipientEmail}
          AND resend_message_id IS NULL
          AND sent_at > NOW() - INTERVAL '14 days'
          AND email_type = ${input.emailType}
        ORDER BY sent_at DESC
        LIMIT 2
      `
    : await sql`
        SELECT id
        FROM email_logs
        WHERE LOWER(BTRIM(user_email)) = ${input.recipientEmail}
          AND resend_message_id IS NULL
          AND sent_at > NOW() - INTERVAL '14 days'
        ORDER BY sent_at DESC
        LIMIT 2
      `

  if (candidates.length !== 1) return [] as any[]

  return await sql`
    UPDATE email_logs
    SET
      resend_message_id = COALESCE(${input.messageId || null}, resend_message_id),
      status = CASE
        WHEN status IN ('bounced', 'complained', 'failed', 'suppressed')
          AND ${emailLogStatusSql(input.status)} IN ('sent', 'delivered', 'scheduled', 'delivery_delayed')
        THEN status
        WHEN status = 'delivered'
          AND ${emailLogStatusSql(input.status)} IN ('sent', 'scheduled', 'delivery_delayed')
        THEN status
        ELSE COALESCE(${emailLogStatusSql(input.status)}, status)
      END,
      campaign_id = COALESCE(${input.campaignId || null}, campaign_id),
      error_message = COALESCE(${input.errorMessage || null}, error_message),
      opened = CASE WHEN ${input.openedAt || null}::timestamptz IS NULL THEN opened ELSE true END,
      opened_at = COALESCE(opened_at, ${input.openedAt || null}),
      clicked = CASE WHEN ${input.clickedAt || null}::timestamptz IS NULL THEN clicked ELSE true END,
      clicked_at = COALESCE(clicked_at, ${input.clickedAt || null})
    WHERE id = ${candidates[0].id}
    RETURNING id, user_email, email_type, campaign_id
  `
}

async function upsertBroadcastEmailLog(input: {
  recipientEmail: string | null
  messageId: string | null
  emailType: string | null
  campaignId?: number | null
  status?: EmailLogStatus
  errorMessage?: string | null
  openedAt?: Date | null
  clickedAt?: Date | null
  sentAt?: Date | null
}) {
  if (!input.recipientEmail || !input.emailType) return [] as any[]

  const candidates = input.messageId
    ? await sql`
        SELECT id
        FROM email_logs
        WHERE resend_message_id = ${input.messageId}
        LIMIT 1
      `
    : []

  const fallbackCandidates =
    candidates.length > 0
      ? candidates
      : await sql`
          SELECT id
          FROM email_logs
          WHERE LOWER(BTRIM(user_email)) = ${input.recipientEmail}
            AND email_type = ${input.emailType}
            AND sent_at > NOW() - INTERVAL '30 days'
          ORDER BY sent_at DESC
          LIMIT 1
        `

  if (fallbackCandidates.length > 0) {
    return await sql`
      UPDATE email_logs
      SET
        resend_message_id = COALESCE(${input.messageId || null}, resend_message_id),
        status = CASE
          WHEN status IN ('bounced', 'complained', 'failed', 'suppressed')
            AND ${emailLogStatusSql(input.status)} IN ('sent', 'delivered', 'scheduled', 'delivery_delayed')
          THEN status
          WHEN status = 'delivered'
            AND ${emailLogStatusSql(input.status)} IN ('sent', 'scheduled', 'delivery_delayed')
          THEN status
          ELSE COALESCE(${emailLogStatusSql(input.status)}, status)
        END,
        campaign_id = COALESCE(${input.campaignId || null}, campaign_id),
        error_message = COALESCE(${input.errorMessage || null}, error_message),
        opened = CASE WHEN ${input.openedAt || null}::timestamptz IS NULL THEN opened ELSE true END,
        opened_at = COALESCE(opened_at, ${input.openedAt || null}),
        clicked = CASE WHEN ${input.clickedAt || null}::timestamptz IS NULL THEN clicked ELSE true END,
        clicked_at = COALESCE(clicked_at, ${input.clickedAt || null})
      WHERE id = ${fallbackCandidates[0].id}
      RETURNING id, user_email, email_type, campaign_id
    `
  }

  return await sql`
    INSERT INTO email_logs (
      user_email,
      email_type,
      resend_message_id,
      status,
      error_message,
      sent_at,
      timestamp,
      campaign_id,
      opened,
      opened_at,
      clicked,
      clicked_at
    ) VALUES (
      ${input.recipientEmail},
      ${input.emailType},
      ${input.messageId || null},
      ${input.status || "sent"},
      ${input.errorMessage || null},
      ${input.sentAt || new Date()},
      ${input.sentAt || new Date()},
      ${input.campaignId || null},
      ${Boolean(input.openedAt)},
      ${input.openedAt || null},
      ${Boolean(input.clickedAt)},
      ${input.clickedAt || null}
    )
    RETURNING id, user_email, email_type, campaign_id
  `
}

async function updateEmailLog(context: ResendEventContext) {
  const errorMessage = eventErrorMessage(context.eventType, context.eventData)
  const openedAt = context.eventType === "email.opened" ? context.eventTimestamp : null
  const clickedAt = context.eventType === "email.clicked" ? context.eventTimestamp : null
  const statusByEvent: Record<string, EmailLogStatus | undefined> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.opened": "delivered",
    "email.clicked": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
    "email.delivery_delayed": "delivery_delayed",
    "email.suppressed": "suppressed",
    "email.scheduled": "scheduled",
  }

  const status = statusByEvent[context.eventType]
  if (!status && !openedAt && !clickedAt) return { matched: false, matchCount: 0, rows: [] as any[] }

  let rows: any[] = []
  if (context.messageId) {
    rows = await updateByMessageId({
      messageId: context.messageId,
      status,
      campaignId: context.campaignId,
      errorMessage,
      openedAt,
      clickedAt,
    })
  }

  if (rows.length === 0) {
    rows = await updateUniqueRecentLogByRecipient({
      recipientEmail: context.recipientEmail,
      messageId: context.messageId,
      emailType: context.resolvedEmailType,
      campaignId: context.campaignId,
      status,
      errorMessage,
      openedAt,
      clickedAt,
    })
  }

  if (rows.length === 0 && context.broadcastId) {
    rows = await upsertBroadcastEmailLog({
      recipientEmail: context.recipientEmail,
      messageId: context.messageId,
      emailType: context.resolvedEmailType,
      campaignId: context.campaignId,
      status,
      errorMessage,
      openedAt,
      clickedAt,
      sentAt: context.eventTimestamp,
    })
  }

  return { matched: rows.length > 0, matchCount: rows.length, rows }
}

async function updateABTestIfNeeded(rows: any[], eventType: string) {
  if (eventType !== "email.opened" && eventType !== "email.clicked") return
  const abEvent = eventType === "email.opened" ? "opened" : "clicked"

  for (const row of rows) {
    const emailType = String(row.email_type || "")
    const abTestMatch = emailType.match(/ab_test_(\d+)_variant_([AB])/)
    if (!abTestMatch) continue

    const testId = parseInt(abTestMatch[1], 10)
    const { updateABTestResults } = await import("@/lib/email/ab-testing")
    await updateABTestResults(testId, row.user_email, abEvent)
  }
}

async function buildContext(body: any): Promise<ResendEventContext> {
  const eventType = String(body?.type || "unknown")
  const eventData = body?.data || {}
  const recipientEmail =
    normalizeRecipientEmail(eventData?.email) ||
    normalizeRecipientEmail(eventData?.to) ||
    normalizeRecipientEmail(eventData?.recipient) ||
    normalizeRecipientEmail(eventData?.delivered_to)
  const messageId = resolveMessageId(eventData, body)
  const broadcastId = resolveBroadcastId(eventData)
  const campaignId = await resolveCampaignId(broadcastId)
  const campaignType = await resolveCampaignTypeById(campaignId)
  const campaignKeyFromEvents = await resolveCampaignKeyByBroadcastId(broadcastId)
  const emailTypeFromTags = resolveEmailTypeFromTags(eventData)
  const broadcastEmailType = resolveBroadcastEmailType(eventData, broadcastId)
  const resolvedEmailType = emailTypeFromTags || campaignType || campaignKeyFromEvents || broadcastEmailType || null

  return {
    body,
    eventType,
    eventData,
    recipientEmail,
    messageId,
    broadcastId,
    campaignId,
    resolvedEmailType,
    resendEventId: resolveResendEventId(body),
    eventTimestamp: resolveEventTimestamp(eventData, body),
  }
}

function verifyWebhook(request: NextRequest, payload: string) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

  if (!webhookSecret) {
    if (isProduction) {
      throw new Error("RESEND_WEBHOOK_SECRET is required in production")
    }

    console.warn("[v0] [Resend Webhook] RESEND_WEBHOOK_SECRET not set; parsing unverified webhook in non-production")
    return JSON.parse(payload)
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix signature headers")
  }

  const resend = new Resend(process.env.RESEND_API_KEY || "re_webhook_verification")
  return resend.webhooks.verify({
    payload,
    headers: {
      id: svixId,
      timestamp: svixTimestamp,
      signature: svixSignature,
    },
    webhookSecret,
  })
}

/**
 * Resend Webhook Handler
 *
 * Webhook URL in Resend: https://sselfie.ai/api/webhooks/resend
 */
export async function POST(request: NextRequest) {
  const receivedAt = new Date().toISOString()
  let eventRowId: number | null = null

  try {
    const payload = await request.text()
    let body: any

    try {
      body = verifyWebhook(request, payload)
    } catch (error) {
      console.error("[v0] [Resend Webhook] Signature verification failed:", error instanceof Error ? error.message : "unknown")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const context = await buildContext(body)

    console.log("[v0] [Resend Webhook] Event received", {
      eventType: context.eventType,
      messageId: context.messageId,
      recipient: maskEmail(context.recipientEmail),
      receivedAt,
    })

    eventRowId = await persistEmailEvent(context)
    console.log("[v0] [Resend Webhook] Event persisted", {
      eventType: context.eventType,
      eventRowId,
      messageId: context.messageId,
    })

    if (!WEBHOOK_EVENT_TYPES.has(context.eventType)) {
      await updateEmailEventStatus(eventRowId, "ignored")
      console.log("[v0] [Resend Webhook] Unknown event ignored", { eventType: context.eventType, eventRowId })
      return NextResponse.json({ received: true, eventType: context.eventType, ignored: true })
    }

    const result = await updateEmailLog(context)
    await updateABTestIfNeeded(result.rows, context.eventType)

    const eventStatus = result.matched ? "processed" : "unmatched"
    await updateEmailEventStatus(eventRowId, eventStatus)

    console.log("[v0] [Resend Webhook] Event processed", {
      eventType: context.eventType,
      eventRowId,
      matched: result.matched,
      matchCount: result.matchCount,
      messageId: context.messageId,
      recipient: maskEmail(context.recipientEmail),
    })

    return NextResponse.json({
      received: true,
      eventType: context.eventType,
      matched: result.matched,
      eventStatus,
    })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[v0] [Resend Webhook] Error processing webhook:", message)
    await updateEmailEventStatus(eventRowId, "failed", message).catch(() => {})
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Handle GET requests for webhook verification and operational health checks.
export async function GET() {
  return NextResponse.json({
    message: "Resend webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
