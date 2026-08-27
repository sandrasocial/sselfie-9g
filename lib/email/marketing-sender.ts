import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG, EMAIL_ENV } from "./config"
import { normalizeEmailIdentifier } from "./normalize-identifier"
import { requireResendClient } from "@/lib/resend/client"
import { getResendApiKey } from "@/lib/resend/api-key"
import { applyApprovedEmailPalette } from "./approved-email-palette"

interface MarketingBroadcastInput {
  campaignKey: string
  subject: string
  html: string
  text?: string
  segmentId?: string
  audienceId?: string
  scheduledAt?: string
  estimatedRecipientCount?: number
}

interface ContactSyncInput {
  tagKey: string
  tagValue: string
  contacts: Array<{ email: string; firstName?: string | null }>
  existingContacts?: Array<{ email: string; id: string; tags?: any[] }>
  segmentId?: string
  removeFromSegment?: boolean
}

const CONTACT_UPDATE_DELAY_MS = 650
const RESEND_RETRY_MAX_ATTEMPTS = Number.parseInt(process.env.RESEND_RETRY_MAX_ATTEMPTS || "5", 10)
const RESEND_RETRY_BASE_DELAY_MS = Number.parseInt(
  process.env.RESEND_RETRY_BASE_DELAY_MS || "700",
  10
)

async function sleep(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function isLikelyResendRateLimit(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes("too many requests") || m.includes("rate limit") || m.includes("429")
}

async function withResendRetry<T>(input: {
  label: string
  execute: () => Promise<{ data?: T; error?: { message?: string | null } | null }>
  maxAttempts?: number
  baseDelayMs?: number
}): Promise<{ data?: T; error?: { message?: string | null } | null }> {
  const maxAttempts = Math.max(1, input.maxAttempts || RESEND_RETRY_MAX_ATTEMPTS)
  const baseDelayMs = Math.max(100, input.baseDelayMs || RESEND_RETRY_BASE_DELAY_MS)
  let lastResult: { data?: T; error?: { message?: string | null } | null } | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await input.execute()
    lastResult = result
    const message = String(result.error?.message || "").trim()
    const retryable = !!message && isLikelyResendRateLimit(message)

    if (!retryable || attempt >= maxAttempts) {
      if (retryable && attempt >= maxAttempts) {
        console.warn("[v0] Resend retry exhausted:", {
          label: input.label,
          attempts: maxAttempts,
          message,
        })
      }
      return result
    }

    const backoffMs = Math.min(12_000, baseDelayMs * Math.pow(2, attempt - 1))
    console.warn("[v0] Resend rate limit, retrying:", {
      label: input.label,
      attempt,
      maxAttempts,
      waitMs: backoffMs,
      message,
    })
    await sleep(backoffMs)
  }

  return lastResult || { error: { message: "Unknown Resend retry failure" } }
}

async function resendFetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { maxRetries?: number; baseDelayMs?: number }
): Promise<Response> {
  const maxRetries = opts?.maxRetries ?? 5
  const baseDelayMs = opts?.baseDelayMs ?? 650

  let lastErr: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status !== 429) return res

      const retryAfter = res.headers.get("retry-after")
      const retryAfterMs =
        retryAfter && !Number.isNaN(Number(retryAfter)) ? Number(retryAfter) * 1000 : null
      const backoffMs = Math.min(10_000, retryAfterMs ?? baseDelayMs * Math.pow(2, attempt))
      await sleep(backoffMs)
      continue
    } catch (err) {
      lastErr = err
      const backoffMs = Math.min(10_000, baseDelayMs * Math.pow(2, attempt))
      await sleep(backoffMs)
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Resend fetch failed after retries")
}

function ensureComplianceHtml(html: string): string {
  if (html.includes("RESEND_UNSUBSCRIBE_URL")) {
    // Unsubscribe link already present; still append address if missing
    if (!html.includes("SSELFIE Studio")) {
      return `${html}\n${EMAIL_CONFIG.compliance.addressHtml}`
    }
    return html
  }
  return `${html}\n${EMAIL_CONFIG.compliance.unsubscribeHtml}\n${EMAIL_CONFIG.compliance.addressHtml}`
}

function ensureComplianceText(text?: string): string | undefined {
  if (!text) return undefined
  if (text.includes("RESEND_UNSUBSCRIBE_URL")) {
    if (!text.includes("SSELFIE Studio")) {
      return `${text}\n\n${EMAIL_CONFIG.compliance.addressText}`
    }
    return text
  }
  return `${text}\n\n${EMAIL_CONFIG.compliance.unsubscribeText}\n${EMAIL_CONFIG.compliance.addressText}`
}

function toTagMap(tags: any[] | undefined): Record<string, string> {
  const tagMap: Record<string, string> = {}
  if (!tags) return tagMap
  for (const tag of tags) {
    if (typeof tag === "object" && tag?.name && tag?.value) {
      tagMap[tag.name] = String(tag.value)
    }
  }
  return tagMap
}

function formatTags(tags: Record<string, string>): Array<{ name: string; value: string }> {
  return Object.entries(tags).map(([name, value]) => ({ name, value }))
}

async function addContactToSegmentById(contactId: string, segmentId: string, _email?: string) {
  const resend = requireResendClient()
  const { error } = await resend.contacts.segments.add({
    contactId,
    segmentId,
  })

  if (error) {
    throw new Error(error.message || "Failed to add contact to segment")
  }
}

async function removeContactFromSegmentById(contactId: string, segmentId: string, _email?: string) {
  const resend = requireResendClient()
  const { error } = await resend.contacts.segments.remove({
    contactId,
    segmentId,
  })

  if (error) {
    throw new Error(error.message || "Failed to remove contact from segment")
  }
}

async function logEmailEvent(input: {
  eventType: "broadcast_created" | "broadcast_sent" | "broadcast_failed"
  campaignKey: string
  providerId?: string
  status: "success" | "failed"
  recipientCount?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await sql`
      INSERT INTO email_events (
        email_type,
        event_type,
        campaign_key,
        provider_broadcast_id,
        recipient_count,
        status,
        error_message,
        metadata,
        created_at
      )
      VALUES (
        ${input.campaignKey},
        ${input.eventType},
        ${input.campaignKey},
        ${input.providerId || null},
        ${input.recipientCount || null},
        ${input.status},
        ${input.errorMessage || null},
        ${JSON.stringify(input.metadata || {})},
        NOW()
      )
    `
  } catch (error) {
    console.error("[v0] Failed to log email event:", error)
  }
}

type ExistingBroadcast = {
  id: string
  name: string
  status: "draft" | "sent" | "queued"
  created_at: string
}

async function findExistingBroadcastByCampaignKey(
  resend: ReturnType<typeof requireResendClient>,
  campaignKey: string
): Promise<{ broadcast: ExistingBroadcast; matchCount: number } | null> {
  let after: string | undefined

  do {
    const listed = await withResendRetry({
      label: "broadcast.list.idempotency",
      execute: () => resend.broadcasts.list({ limit: 100, ...(after ? { after } : {}) }),
    })
    if (listed.error) {
      throw new Error(
        listed.error.message || "Could not verify existing Resend broadcasts; send aborted"
      )
    }

    const page = listed.data as { data?: ExistingBroadcast[]; has_more?: boolean } | undefined
    const broadcasts = page?.data || []
    const matches = broadcasts
      .filter(broadcast => broadcast.name === campaignKey)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const alreadyAccepted = matches.find(
      broadcast => broadcast.status === "sent" || broadcast.status === "queued"
    )

    if (alreadyAccepted) {
      return { broadcast: alreadyAccepted, matchCount: matches.length }
    }
    if (matches.length > 0) {
      throw new Error(
        `Resend already contains a draft for ${campaignKey}; send aborted for manual review`
      )
    }

    if (!page?.has_more || broadcasts.length === 0) return null
    after = broadcasts[broadcasts.length - 1]?.id
  } while (after)

  return null
}

export async function sendMarketingBroadcast(input: MarketingBroadcastInput) {
  const resend = requireResendClient()
  const audienceId = normalizeEmailIdentifier(input.audienceId || EMAIL_ENV.resendAudienceId)
  const segmentId = normalizeEmailIdentifier(input.segmentId)
  const recipientCount = input.estimatedRecipientCount || 0

  if (!segmentId && !audienceId) {
    throw new Error("No segmentId or RESEND_AUDIENCE_ID configured for marketing broadcast")
  }

  if (
    recipientCount > 0 &&
    recipientCount > EMAIL_ENV.maxBroadcastRecipients &&
    !EMAIL_ENV.allowLargeBroadcasts
  ) {
    throw new Error(
      `Recipient count (${recipientCount}) exceeds limit (${EMAIL_ENV.maxBroadcastRecipients}). Set EMAIL_ALLOW_LARGE_BROADCASTS=true to override.`
    )
  }

  const html = applyApprovedEmailPalette(ensureComplianceHtml(input.html))
  const text = ensureComplianceText(input.text)

  if (EMAIL_ENV.dryRun) {
    console.log("[v0] [EMAIL_DRY_RUN] Marketing broadcast suppressed:", {
      campaignKey: input.campaignKey,
      recipientCount,
      segmentId,
      audienceId,
      subject: input.subject,
      htmlLength: html.length,
      textLength: text?.length || 0,
    })
    return { success: true, dryRun: true }
  }

  // Database observability is useful, but provider state is the final send truth.
  // Fail closed if Resend already accepted this deterministic campaign key.
  const existing = await findExistingBroadcastByCampaignKey(resend, input.campaignKey)
  if (existing) {
    await logEmailEvent({
      eventType: "broadcast_sent",
      campaignKey: input.campaignKey,
      providerId: existing.broadcast.id,
      status: "success",
      recipientCount,
      metadata: {
        source: "provider_idempotency_guard",
        providerStatus: existing.broadcast.status,
        providerMatchCount: existing.matchCount,
      },
    })
    return {
      success: true,
      broadcastId: existing.broadcast.id,
      alreadySent: true,
    }
  }

  const broadcastCreateIdempotencyKey = `broadcast:${input.campaignKey}:create-and-send`

  const broadcast = await withResendRetry({
    label: "broadcast.create-and-send",
    execute: () =>
      resend.broadcasts.create(
        {
          ...(segmentId ? { segmentId } : { audienceId }),
          name: input.campaignKey,
          from: EMAIL_CONFIG.marketing.from,
          replyTo: EMAIL_CONFIG.marketing.replyTo,
          subject: input.subject,
          html,
          ...(text ? { text } : {}),
          send: true,
          ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        },
        {
          headers: { "Idempotency-Key": broadcastCreateIdempotencyKey },
        }
      ),
  })

  if (broadcast.error) {
    const errorMessage = broadcast.error.message || "Failed to create broadcast"
    await logEmailEvent({
      eventType: "broadcast_failed",
      campaignKey: input.campaignKey,
      status: "failed",
      recipientCount,
      errorMessage,
      metadata: {
        phase: "create",
        segmentId: segmentId || null,
        audienceId: audienceId || null,
      },
    })
    throw new Error(errorMessage)
  }

  const broadcastId = broadcast.data?.id
  await logEmailEvent({
    eventType: "broadcast_created",
    campaignKey: input.campaignKey,
    providerId: broadcastId,
    status: "success",
    recipientCount,
  })

  await logEmailEvent({
    eventType: "broadcast_sent",
    campaignKey: input.campaignKey,
    providerId: broadcastId,
    status: "success",
    recipientCount,
  })

  return { success: true, broadcastId }
}

export async function syncMarketingContacts(input: ContactSyncInput) {
  const resend = requireResendClient()
  const audienceId = EMAIL_ENV.resendAudienceId
  if (!audienceId) {
    throw new Error("RESEND_AUDIENCE_ID not configured for marketing sync")
  }

  if (EMAIL_ENV.dryRun) {
    console.log("[v0] [EMAIL_DRY_RUN] Marketing contact sync suppressed:", {
      tagKey: input.tagKey,
      tagValue: input.tagValue,
      segmentId: input.segmentId,
      removeFromSegment: input.removeFromSegment,
      contacts: input.contacts.length,
    })
    return { success: true, synced: 0, skipped: input.contacts.length, errors: 0 }
  }

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const contact of input.contacts) {
    const email = String(contact.email || "").toLowerCase()
    if (!email) continue

    try {
      // Avoid loading the full audience contact list (large + frequently 429s).
      // Instead, best-effort upsert by email, then add/remove the segment membership by email.
      //
      // We intentionally do not try to mutate tags for existing contacts here; the primary objective
      // is reliable segment-based delivery without exceeding Resend's strict rate limits.
      const created = await resend.contacts.create({
        audienceId,
        email,
        firstName: contact.firstName || undefined,
      })

      if (created?.error) {
        const msg = String(created.error.message || "")
        // Ignore "already exists" style errors, otherwise count it.
        if (!/already/i.test(msg) && !/exist/i.test(msg) && !/409/.test(msg)) {
          errors++
          console.error("[v0] Failed to upsert marketing contact:", { email, error: msg })
        } else {
          skipped++
        }
      } else {
        synced++
      }

      await sleep(CONTACT_UPDATE_DELAY_MS)

      if (input.segmentId) {
        const segId = normalizeEmailIdentifier(input.segmentId)
        if (segId) {
          if (input.removeFromSegment) {
            // Resend API supports identifier=contactId OR email.
            const res = await resendFetchWithRetry(
              `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segId)}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${getResendApiKey()}`,
                  "Content-Type": "application/json",
                },
              }
            )
            if (!res.ok) {
              const text = await res.text().catch(() => "")
              errors++
              console.error("[v0] Failed to remove contact from segment:", {
                email,
                segmentId: segId,
                status: res.status,
                text: text.slice(0, 240),
              })
            }
          } else {
            const res = await resendFetchWithRetry(
              `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segId)}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${getResendApiKey()}`,
                  "Content-Type": "application/json",
                },
              }
            )
            if (!res.ok) {
              const text = await res.text().catch(() => "")
              errors++
              console.error("[v0] Failed to add contact to segment:", {
                email,
                segmentId: segId,
                status: res.status,
                text: text.slice(0, 240),
              })
            }
          }

          await sleep(CONTACT_UPDATE_DELAY_MS)
        }
      }
    } catch (error) {
      errors++
      console.error("[v0] Failed to sync marketing contact:", { email, error })
    }
  }

  return { success: errors === 0, synced, skipped, errors }
}
