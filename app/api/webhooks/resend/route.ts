import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

function resolveBroadcastId(eventData: any): string | null {
  return eventData?.broadcast_id || eventData?.broadcastId || eventData?.broadcast?.id || null
}

function resolveEmailTypeFromTags(eventData: any): string | null {
  const tags = eventData?.tags
  if (!Array.isArray(tags)) return null
  const tag = tags.find((entry) => entry?.name === "type")
  return tag?.value || null
}

function looksLikeEmail(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v.includes("@") && !v.includes(" ") && !v.startsWith("{") && !v.startsWith("[")
}

function normalizeRecipientEmail(raw: any): string | null {
  if (!raw) return null

  if (typeof raw === "string") {
    const s = raw.trim()
    if (looksLikeEmail(s)) return s
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
    if (typeof raw.email === "string" && looksLikeEmail(raw.email)) return raw.email.trim()
    if (typeof raw.address === "string" && looksLikeEmail(raw.address)) return raw.address.trim()
    if (typeof raw.value === "string" && looksLikeEmail(raw.value)) return raw.value.trim()

    const keys = Object.keys(raw)
    if (keys.length === 1 && looksLikeEmail(keys[0])) return keys[0]

    for (const key of keys) {
      const normalized = normalizeRecipientEmail((raw as any)[key])
      if (normalized) return normalized
    }
  }

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

async function updateRecentEmailLogByRecipient(input: {
  recipientEmail: string | null
  messageId: string | null
  emailType?: string | null
  campaignId?: number | null
  status: "sent" | "delivered" | "bounced" | "complained"
  errorMessage?: string | null
}) {
  if (!input.recipientEmail) return [] as any[]
  return await sql`
    WITH target AS (
      SELECT id
      FROM email_logs
      WHERE user_email = ${input.recipientEmail}
        AND resend_message_id IS NULL
        AND sent_at > NOW() - INTERVAL '14 days'
        AND (
          ${input.emailType || null} IS NULL
          OR email_type = ${input.emailType || null}
        )
      ORDER BY sent_at DESC
      LIMIT 1
    )
    UPDATE email_logs
    SET
      resend_message_id = COALESCE(${input.messageId || null}, resend_message_id),
      status = ${input.status},
      error_message = COALESCE(${input.errorMessage || null}, error_message),
      campaign_id = COALESCE(${input.campaignId || null}, campaign_id)
    WHERE id IN (SELECT id FROM target)
    RETURNING id
  `
}

async function ensureEmailLogEntry(params: {
  recipientEmail: string | null
  messageId: string | null
  status: string
  opened?: boolean
  openedAt?: Date
  clicked?: boolean
  clickedAt?: Date
  emailType?: string | null
  campaignId?: number | null
  errorMessage?: string | null
}) {
  if (!params.recipientEmail) return
  await sql`
    INSERT INTO email_logs (
      user_email,
      email_type,
      status,
      resend_message_id,
      opened,
      opened_at,
      clicked,
      clicked_at,
      campaign_id,
      error_message,
      sent_at,
      created_at
    ) VALUES (
      ${params.recipientEmail},
      ${params.emailType || "resend-webhook"},
      ${params.status},
      ${params.messageId},
      ${params.opened || false},
      ${params.openedAt || null},
      ${params.clicked || false},
      ${params.clickedAt || null},
      ${params.campaignId || null},
      ${params.errorMessage || null},
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
  `
}

/**
 * Resend Webhook Handler
 * 
 * Handles Resend webhook events for email tracking:
 * - email.sent: Email was sent
 * - email.delivered: Email was delivered
 * - email.opened: Email was opened
 * - email.clicked: Link in email was clicked
 * - email.bounced: Email bounced
 * - email.complained: User marked as spam
 * 
 * POST /api/webhooks/resend
 * 
 * Webhook URL in Resend: https://sselfie.ai/api/webhooks/resend
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] [Resend Webhook] Event received at:", new Date().toISOString())

    const body = await request.json()
    const eventType = body.type
    const eventData = body.data

    console.log("[v0] [Resend Webhook] Event type:", eventType)
    console.log("[v0] [Resend Webhook] Event data:", JSON.stringify(eventData, null, 2))

    // Verify webhook signature if RESEND_WEBHOOK_SECRET is set
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get("resend-signature")
      if (signature) {
        // Resend uses HMAC SHA256 for webhook signatures
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(body))
          .digest("hex")

        if (signature !== expectedSignature) {
          console.error("[v0] [Resend Webhook] Invalid signature")
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }
        console.log("[v0] [Resend Webhook] ✅ Signature verified")
      }
    } else {
      console.warn("[v0] [Resend Webhook] ⚠️ RESEND_WEBHOOK_SECRET not set - skipping signature verification")
    }

    // Extract email and message ID from event data
    // Resend webhook format: { data: { email_id: "...", email: "...", ... } }
    const recipientEmail =
      normalizeRecipientEmail(eventData?.email) ||
      normalizeRecipientEmail(eventData?.to) ||
      normalizeRecipientEmail(eventData?.recipient) ||
      normalizeRecipientEmail(eventData?.delivered_to)
    const messageId = eventData?.email_id || eventData?.message_id || eventData?.id || body.id
    const broadcastId = resolveBroadcastId(eventData)
    const campaignId = await resolveCampaignId(broadcastId)
    const campaignType = await resolveCampaignTypeById(campaignId)
    const campaignKeyFromEvents = await resolveCampaignKeyByBroadcastId(broadcastId)
    const emailTypeFromTags = resolveEmailTypeFromTags(eventData)
    const resolvedEmailType = emailTypeFromTags || campaignType || campaignKeyFromEvents || null

    console.log("[v0] [Resend Webhook] Extracted:", {
      recipientEmail,
      messageId,
      eventDataKeys: eventData ? Object.keys(eventData) : [],
      bodyKeys: Object.keys(body),
    })

    if (!recipientEmail && !messageId) {
      console.warn("[v0] [Resend Webhook] No email or message ID in event data")
      console.warn("[v0] [Resend Webhook] Full event data:", JSON.stringify(body, null, 2))
      return NextResponse.json({ received: true, warning: "No email or message ID" })
    }

    // Handle different event types
    switch (eventType) {
      case "email.sent":
        // Email was sent (already logged in send-email.ts, but update if needed)
        if (messageId || recipientEmail) {
          let updated = await sql`
            UPDATE email_logs
            SET resend_message_id = ${messageId || null}, status = 'sent'
            WHERE (
              resend_message_id = ${messageId || null}
              OR (user_email = ${recipientEmail || ""} AND resend_message_id IS NULL)
            )
            RETURNING id
          `

          if ((!updated || updated.length === 0) && recipientEmail) {
            updated = await updateRecentEmailLogByRecipient({
              recipientEmail,
              messageId,
              emailType: resolvedEmailType,
              campaignId,
              status: "sent",
            })
          }

          if (!updated || updated.length === 0) {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "sent",
              emailType: resolvedEmailType,
              campaignId,
            })
          }

          console.log(`[v0] [Resend Webhook] ✅ Updated email_logs for sent: ${recipientEmail}`)
        }
        break

      case "email.delivered":
        // Email was delivered successfully
        if (messageId) {
          let delivered = await sql`
            UPDATE email_logs
            SET status = 'delivered'
            WHERE resend_message_id = ${messageId}
            RETURNING id
          `
          if ((!delivered || delivered.length === 0) && recipientEmail) {
            delivered = await updateRecentEmailLogByRecipient({
              recipientEmail,
              messageId,
              emailType: resolvedEmailType,
              campaignId,
              status: "delivered",
            })
          }
          if (!delivered || delivered.length === 0) {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "delivered",
              emailType: resolvedEmailType,
              campaignId,
            })
          }
          console.log(`[v0] [Resend Webhook] ✅ Marked as delivered: ${messageId}`)
        }
        break

      case "email.opened":
        // Email was opened
        if (messageId) {
          const openedAt = eventData?.timestamp ? new Date(eventData.timestamp) : new Date()
          
          // Try to find email by message ID first
          let emailLog = await sql`
            UPDATE email_logs
            SET opened = true, opened_at = ${openedAt}
            WHERE resend_message_id = ${messageId}
            AND opened = false
            RETURNING id, user_email, email_type, campaign_id
          `
          
          // If not found by message ID, try by email (for older emails without resend_message_id)
          if (!emailLog || emailLog.length === 0) {
            console.log(`[v0] [Resend Webhook] Message ID ${messageId} not found, trying by email: ${recipientEmail}`)
            if (recipientEmail) {
              emailLog = await sql`
                UPDATE email_logs
                SET opened = true, opened_at = ${openedAt}, resend_message_id = ${messageId}
                WHERE id IN (
                  SELECT id FROM email_logs
                  WHERE user_email = ${recipientEmail}
                  AND resend_message_id IS NULL
                  AND opened = false
                  ORDER BY sent_at DESC
                  LIMIT 1
                )
                RETURNING id, user_email, email_type, campaign_id
              `
            }
          }
          
          if (emailLog && emailLog.length > 0) {
            console.log(`[v0] [Resend Webhook] ✅ Marked as opened: ${messageId} (email: ${emailLog[0].user_email})`)
          } else {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "delivered",
              opened: true,
              openedAt,
              emailType: resolvedEmailType,
              campaignId,
            })
            console.warn(`[v0] [Resend Webhook] ⚠️ Created email_logs entry for opened event: ${messageId}`)
          }
          
          // Update A/B test results if this is an A/B test email
          if (emailLog && emailLog.length > 0) {
            const log = emailLog[0]
            const emailType = log.email_type as string
            const abTestMatch = emailType.match(/ab_test_(\d+)_variant_([AB])/)
            if (abTestMatch) {
              const testId = parseInt(abTestMatch[1])
              const { updateABTestResults } = await import("@/lib/email/ab-testing")
              await updateABTestResults(testId, log.user_email, "opened")
              console.log(`[v0] [Resend Webhook] ✅ Updated A/B test ${testId} for opened`)
            }
          } else {
            console.warn(`[v0] [Resend Webhook] ⚠️ No email_logs entry updated for opened event`)
          }
        } else {
          console.warn(`[v0] [Resend Webhook] ⚠️ email.opened event received but no messageId:`, eventData)
        }
        break

      case "email.clicked":
        // Link in email was clicked
        if (messageId) {
          const clickedAt = eventData?.timestamp ? new Date(eventData.timestamp) : new Date()
          const clickedUrl = eventData?.link || eventData?.url || null
          
          // Try to find email by message ID first
          let emailLog = await sql`
            UPDATE email_logs
            SET clicked = true, clicked_at = ${clickedAt}
            WHERE resend_message_id = ${messageId}
            AND clicked = false
            RETURNING id, user_email, email_type, campaign_id
          `
          
          // If not found by message ID, try by email
          if (!emailLog || emailLog.length === 0) {
            console.log(`[v0] [Resend Webhook] Message ID ${messageId} not found for click, trying by email: ${recipientEmail}`)
            if (recipientEmail) {
              emailLog = await sql`
                UPDATE email_logs
                SET clicked = true, clicked_at = ${clickedAt}, resend_message_id = ${messageId}
                WHERE id IN (
                  SELECT id FROM email_logs
                  WHERE user_email = ${recipientEmail}
                  AND resend_message_id IS NULL
                  AND clicked = false
                  ORDER BY sent_at DESC
                  LIMIT 1
                )
                RETURNING id, user_email, email_type, campaign_id
              `
            }
          }
          
          if (emailLog && emailLog.length > 0) {
            console.log(`[v0] [Resend Webhook] ✅ Marked as clicked: ${messageId} (email: ${emailLog[0].user_email}, URL: ${clickedUrl})`)
          } else {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "delivered",
              clicked: true,
              clickedAt,
              emailType: resolvedEmailType,
              campaignId,
            })
            console.warn(`[v0] [Resend Webhook] ⚠️ Created email_logs entry for clicked event: ${messageId}`)
          }
          
          // Update A/B test results if this is an A/B test email
          if (emailLog && emailLog.length > 0) {
            const log = emailLog[0]
            const emailType = log.email_type as string
            const abTestMatch = emailType.match(/ab_test_(\d+)_variant_([AB])/)
            if (abTestMatch) {
              const testId = parseInt(abTestMatch[1])
              const { updateABTestResults } = await import("@/lib/email/ab-testing")
              await updateABTestResults(testId, log.user_email, "clicked")
              console.log(`[v0] [Resend Webhook] ✅ Updated A/B test ${testId} for clicked`)
            }
          }
        }
        break

      case "email.bounced":
        // Email bounced (hard or soft bounce)
        if (messageId) {
          const bounceType = eventData?.bounce_type || "hard"
          const bounceReason = eventData?.bounce_reason || "Unknown"
          
          let bounced = await sql`
            UPDATE email_logs
            SET status = 'bounced', error_message = ${`Bounced: ${bounceType} - ${bounceReason}`}
            WHERE resend_message_id = ${messageId}
            RETURNING id
          `
          if ((!bounced || bounced.length === 0) && recipientEmail) {
            bounced = await updateRecentEmailLogByRecipient({
              recipientEmail,
              messageId,
              emailType: resolvedEmailType,
              campaignId,
              status: "bounced",
              errorMessage: `Bounced: ${bounceType} - ${bounceReason}`,
            })
          }
          if (!bounced || bounced.length === 0) {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "bounced",
              emailType: resolvedEmailType,
              campaignId,
              errorMessage: `Bounced: ${bounceType} - ${bounceReason}`,
            })
          }
          console.log(`[v0] [Resend Webhook] ⚠️ Marked as bounced: ${messageId} (${bounceType})`)
        }
        break

      case "email.complained":
        // User marked email as spam
        if (messageId) {
          let complained = await sql`
            UPDATE email_logs
            SET status = 'complained', error_message = 'User marked as spam'
            WHERE resend_message_id = ${messageId}
            RETURNING id
          `
          if ((!complained || complained.length === 0) && recipientEmail) {
            complained = await updateRecentEmailLogByRecipient({
              recipientEmail,
              messageId,
              emailType: resolvedEmailType,
              campaignId,
              status: "complained",
              errorMessage: "User marked as spam",
            })
          }
          if (!complained || complained.length === 0) {
            await ensureEmailLogEntry({
              recipientEmail,
              messageId,
              status: "complained",
              emailType: resolvedEmailType,
              campaignId,
              errorMessage: "User marked as spam",
            })
          }
          console.log(`[v0] [Resend Webhook] ⚠️ Marked as complained (spam): ${messageId}`)
          
          // Also mark in blueprint_subscribers and welcome_back_sequence to stop sending
          if (recipientEmail) {
            await sql`
              UPDATE blueprint_subscribers
              SET converted_to_user = true, updated_at = NOW()
              WHERE email = ${recipientEmail}
            `
            await sql`
              UPDATE welcome_back_sequence
              SET converted = true, updated_at = NOW()
              WHERE user_email = ${recipientEmail}
            `
            console.log(`[v0] [Resend Webhook] ✅ Stopped sequences for ${recipientEmail} (spam complaint)`)
          }
        }
        break

      default:
        console.log(`[v0] [Resend Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true, eventType })
  } catch (error: any) {
    console.error("[v0] [Resend Webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({
    message: "Resend webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
