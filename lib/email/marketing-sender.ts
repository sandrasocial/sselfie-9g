import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import { EMAIL_CONFIG, EMAIL_ENV } from "./config"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"

const resend = new Resend(process.env.RESEND_API_KEY)
const sql = neon(process.env.DATABASE_URL!)

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

const CONTACT_UPDATE_DELAY_MS = 250

function ensureComplianceHtml(html: string): string {
  if (html.includes("RESEND_UNSUBSCRIBE_URL")) {
    return html
  }
  return `${html}\n${EMAIL_CONFIG.compliance.unsubscribeHtml}`
}

function ensureComplianceText(text?: string): string | undefined {
  if (!text) return undefined
  if (text.includes("RESEND_UNSUBSCRIBE_URL")) {
    return text
  }
  return `${text}\n\n${EMAIL_CONFIG.compliance.unsubscribeText}`
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

async function addContactToSegmentById(audienceId: string, contactId: string, segmentId: string) {
  const response = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts/${contactId}/segments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ segment_id: segmentId }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }
}

async function removeContactFromSegmentById(audienceId: string, contactId: string, segmentId: string) {
  const response = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts/${contactId}/segments/${segmentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
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

export async function sendMarketingBroadcast(input: MarketingBroadcastInput) {
  const audienceId = input.audienceId || EMAIL_ENV.resendAudienceId
  const recipientCount = input.estimatedRecipientCount || 0

  if (!input.segmentId && !audienceId) {
    throw new Error("No segmentId or RESEND_AUDIENCE_ID configured for marketing broadcast")
  }

  if (
    recipientCount > 0 &&
    recipientCount > EMAIL_ENV.maxBroadcastRecipients &&
    !EMAIL_ENV.allowLargeBroadcasts
  ) {
    throw new Error(
      `Recipient count (${recipientCount}) exceeds limit (${EMAIL_ENV.maxBroadcastRecipients}). Set EMAIL_ALLOW_LARGE_BROADCASTS=true to override.`,
    )
  }

  const html = ensureComplianceHtml(input.html)
  const text = ensureComplianceText(input.text)

  if (EMAIL_ENV.dryRun) {
    console.log("[v0] [EMAIL_DRY_RUN] Marketing broadcast suppressed:", {
      campaignKey: input.campaignKey,
      recipientCount,
      segmentId: input.segmentId,
      audienceId,
      subject: input.subject,
      htmlLength: html.length,
      textLength: text?.length || 0,
    })
    return { success: true, dryRun: true }
  }

  const broadcast = await resend.broadcasts.create({
    ...(input.segmentId ? { segmentId: input.segmentId } : { audienceId }),
    from: EMAIL_CONFIG.marketing.from,
    reply_to: EMAIL_CONFIG.marketing.replyTo,
    subject: input.subject,
    html,
    ...(text ? { text } : {}),
  })

  if (broadcast.error) {
    await logEmailEvent({
      eventType: "broadcast_failed",
      campaignKey: input.campaignKey,
      status: "failed",
      recipientCount,
      errorMessage: broadcast.error.message,
      metadata: { phase: "create" },
    })
    throw new Error(broadcast.error.message || "Failed to create broadcast")
  }

  const broadcastId = broadcast.data?.id
  await logEmailEvent({
    eventType: "broadcast_created",
    campaignKey: input.campaignKey,
    providerId: broadcastId,
    status: "success",
    recipientCount,
  })

  const sendResult = await resend.broadcasts.send(
    broadcastId!,
    input.scheduledAt ? { scheduledAt: input.scheduledAt } : {},
  )

  if (sendResult.error) {
    await logEmailEvent({
      eventType: "broadcast_failed",
      campaignKey: input.campaignKey,
      providerId: broadcastId,
      status: "failed",
      recipientCount,
      errorMessage: sendResult.error.message,
      metadata: { phase: "send" },
    })
    throw new Error(sendResult.error.message || "Failed to send broadcast")
  }

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

  const audienceContacts =
    input.existingContacts || (await getAudienceContacts(audienceId))
  const contactMap = new Map(
    audienceContacts.map((contact: any) => [
      String(contact.email || "").toLowerCase(),
      {
        id: contact.id,
        tags: contact.tags || [],
      },
    ]),
  )

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const contact of input.contacts) {
    const email = String(contact.email || "").toLowerCase()
    if (!email) continue

    try {
      const existing = contactMap.get(email)
      let contactId = existing?.id
      if (contactId) {
        const tagMap = toTagMap(existing.tags)
        if (tagMap[input.tagKey] === input.tagValue) {
          skipped++
          if (!input.segmentId) {
            continue
          }
        }
        tagMap[input.tagKey] = input.tagValue

        const response = await fetch(
          `https://api.resend.com/audiences/${audienceId}/contacts/${contactId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tags: formatTags(tagMap),
            }),
          },
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Resend API error: ${response.status} ${errorText}`)
        }

        synced++
      } else {
        const { data, error } = await resend.contacts.create({
          audienceId,
          email,
          firstName: contact.firstName || undefined,
          tags: formatTags({ [input.tagKey]: input.tagValue }),
        })

        if (error) {
          throw new Error(error.message || "Failed to create contact")
        }

        contactId = data?.id
        synced++
      }

      if (input.segmentId && contactId) {
        if (input.removeFromSegment) {
          await removeContactFromSegmentById(audienceId, contactId, input.segmentId)
        } else {
          await addContactToSegmentById(audienceId, contactId, input.segmentId)
        }
      }
    } catch (error) {
      errors++
      console.error("[v0] Failed to sync marketing contact:", { email, error })
    }

    await new Promise((resolve) => setTimeout(resolve, CONTACT_UPDATE_DELAY_MS))
  }

  return { success: errors === 0, synced, skipped, errors }
}

