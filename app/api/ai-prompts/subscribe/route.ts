import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { addContactToSegment, addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { generateAiPromptsDay0DeliveryEmail } from "@/lib/email/templates/ai-prompts-day0-delivery"
import { sendEmail } from "@/lib/email/send-email"
import { normalizeFreebieEmail, resolveAccessToken } from "@/lib/freebie/subscribe-utils"
import { hasResendApiKey } from "@/lib/resend/api-key"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootEmailTags,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"

const DELIVERY_RESEND_COOLDOWN_MINUTES = 15
const SOURCE = "ai-prompts"

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
}

function aiPromptsAccessUrl(accessToken: string): string {
  return `${siteUrl()}/ai-prompts/access/${accessToken}`
}

function firstNameFrom(stored: string | null | undefined, fallback: string): string {
  return (stored || fallback).trim().split(/\s+/)[0] || fallback.trim()
}

function buildEmailTags(existingTags: string[] | null, utmSource: string | null | undefined): string[] {
  const set = new Set<string>(buildAiPhotoshootEmailTags(existingTags, ["curious"]))
  set.add("ai-prompts-subscriber")
  set.add("freebie-subscriber")
  const utm = typeof utmSource === "string" ? utmSource.trim() : ""
  if (utm.length > 0 && /^[a-zA-Z0-9_-]{1,40}$/.test(utm)) {
    set.add(`ai-prompts-source-${utm.toLowerCase()}`)
  } else {
    set.add("ai-prompts-source-direct")
  }
  return Array.from(set)
}

async function addToAiPhotoshootSegment(email: string) {
  const segmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
  if (!segmentId) return

  await addContactToSegment(email, segmentId).catch((error) => {
    console.error("[ai-prompts] Failed to add contact to AI Photoshoot segment:", error)
  })
}

async function recentlySentDeliveryEmail(email: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM email_logs
    WHERE LOWER(BTRIM(user_email)) = ${email}
      AND email_type = 'ai_prompts_delivery'
      AND status IN ('sent', 'delivered')
      AND COALESCE(sent_at, created_at) > NOW() - (${`${DELIVERY_RESEND_COOLDOWN_MINUTES} minutes`}::interval)
    LIMIT 1
  `
  return rows.length > 0
}

async function sendDeliveryEmail(input: {
  email: string
  firstName: string
  accessUrl: string
}): Promise<{ emailSent: boolean; emailError: string | null }> {
  if (!hasResendApiKey()) {
    console.log("[ai-prompts/subscribe] RESEND_API_KEY not configured, skipping email")
    return { emailSent: false, emailError: "RESEND_API_KEY not configured" }
  }

  const { html, text, subject } = generateAiPromptsDay0DeliveryEmail({
    firstName: input.firstName,
    accessUrl: input.accessUrl,
  })

  const result = await sendEmail({
    from: "SSELFIE <hello@sselfie.ai>",
    to: input.email,
    replyTo: "hello@sselfie.ai",
    subject,
    html,
    text,
    tags: ["ai-prompts-delivery"],
    emailType: "ai_prompts_delivery",
  })

  if (!result.success) {
    return { emailSent: false, emailError: result.error || "Failed to send email" }
  }
  return { emailSent: true, emailError: null }
}

export async function POST(request: NextRequest) {
  console.log("[ai-prompts/subscribe] POST called")

  try {
    const body = await request.json()
    const { firstName, email, utm_source, utm_medium, utm_campaign } = body

    if (!email || !firstName) {
      return NextResponse.json({ error: "Email and first name are required" }, { status: 400 })
    }

    const normalizedEmail = normalizeFreebieEmail(String(email))
    const trimmedFirstName = String(firstName).trim()

    if (!normalizedEmail || !trimmedFirstName) {
      return NextResponse.json({ error: "Email and first name are required" }, { status: 400 })
    }

    console.log("[ai-prompts/subscribe] processing:", { email: normalizedEmail })

    // -----------------------------------------------------------------------
    // Existing subscriber path
    // -----------------------------------------------------------------------
    const existing = await sql`
      SELECT id, access_token, name, email_tags, resend_contact_id, source
      FROM freebie_subscribers
      WHERE LOWER(BTRIM(email)) = ${normalizedEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existing.length > 0) {
      console.log("[ai-prompts/subscribe] existing subscriber found:", existing[0].id)
      const subscriber = existing[0]
      const { accessToken, wasGenerated } = resolveAccessToken(subscriber.access_token)
      const existingTags = Array.isArray(subscriber.email_tags) ? (subscriber.email_tags as string[]) : null
      const updatedTags = buildEmailTags(existingTags, utm_source)

      const tagsNeedUpdate =
        wasGenerated ||
        updatedTags.some((t) => !(existingTags || []).includes(t))

      if (tagsNeedUpdate) {
        await sql`
          UPDATE freebie_subscribers
          SET access_token = ${accessToken},
              email_tags   = ${updatedTags}::text[],
              updated_at   = NOW()
          WHERE id = ${subscriber.id}
        `
      }

      if (hasResendApiKey()) {
        await addOrUpdateResendContact(normalizedEmail, firstNameFrom(subscriber.name, trimmedFirstName), {
          source: "ai-prompts",
          status: "lead",
          product: "ai-prompts",
          journey: "nurture",
          segment: "ai-photoshoot-audience",
          ...buildAiPhotoshootResendTags("curious"),
          signup_date: new Date().toISOString().split("T")[0],
        })
        await addToAiPhotoshootSegment(normalizedEmail)
      }

      const accessUrl = aiPromptsAccessUrl(accessToken)
      const cooldownActive = await recentlySentDeliveryEmail(normalizedEmail)

      if (cooldownActive) {
        console.log("[ai-prompts/subscribe] cooldown active, skipping resend")
        return NextResponse.json({
          success: true,
          accessUrl,
          emailSent: false,
          emailSkippedReason: "cooldown",
          alreadySubscribed: true,
        })
      }

      let emailSent = false
      let emailError: string | null = null
      try {
        const delivery = await sendDeliveryEmail({
          email: normalizedEmail,
          firstName: firstNameFrom(subscriber.name, trimmedFirstName),
          accessUrl,
        })
        emailSent = delivery.emailSent
        emailError = delivery.emailError
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : "Unknown email error"
      }

      return NextResponse.json({ success: true, accessUrl, emailSent, emailError, alreadySubscribed: true })
    }

    // -----------------------------------------------------------------------
    // New subscriber path
    // -----------------------------------------------------------------------
    const accessToken = crypto.randomUUID()
    const emailTags = buildEmailTags(null, utm_source)

    console.log("[ai-prompts/subscribe] inserting new subscriber")
    const result = await sql`
      INSERT INTO freebie_subscribers (
        email, name, source, access_token,
        utm_source, utm_medium, utm_campaign,
        email_tags, created_at, updated_at,
        guide_access_email_sent, guide_access_email_sent_at
      )
      VALUES (
        ${normalizedEmail},
        ${trimmedFirstName},
        ${SOURCE},
        ${accessToken},
        ${utm_source || null},
        ${utm_medium || null},
        ${utm_campaign || null},
        ${emailTags}::text[],
        NOW(),
        NOW(),
        false,
        NULL
      )
      RETURNING id, access_token
    `

    if (!result || result.length === 0) {
      console.error("[ai-prompts/subscribe] insert returned no rows")
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    const newSubscriber = result[0]
    const resolvedFirstName = firstNameFrom(trimmedFirstName, trimmedFirstName)
    const accessUrl = aiPromptsAccessUrl(accessToken)

    // Sync to Resend audience
    const resendResult = await addOrUpdateResendContact(normalizedEmail, resolvedFirstName, {
      source: "ai-prompts",
      status: "lead",
      product: "ai-prompts",
      journey: "nurture",
      segment: "ai-photoshoot-audience",
      ...buildAiPhotoshootResendTags("curious"),
      signup_date: new Date().toISOString().split("T")[0],
    })
    await addToAiPhotoshootSegment(normalizedEmail)

    if (resendResult.success && resendResult.contactId) {
      await sql`
        UPDATE freebie_subscribers
        SET resend_contact_id = ${resendResult.contactId},
            updated_at        = NOW()
        WHERE id = ${newSubscriber.id}
      `
    } else {
      console.error(`[ai-prompts/subscribe] Resend sync failed for ${normalizedEmail}: ${resendResult.error}`)
    }

    // Send Day 0 delivery email
    let emailSent = false
    let emailError: string | null = null
    try {
      const delivery = await sendDeliveryEmail({
        firstName: resolvedFirstName,
        email: normalizedEmail,
        accessUrl,
      })
      emailSent = delivery.emailSent
      emailError = delivery.emailError

      if (emailSent) {
        await sql`
          UPDATE freebie_subscribers
          SET guide_access_email_sent    = true,
              guide_access_email_sent_at = NOW(),
              updated_at                 = NOW()
          WHERE id = ${newSubscriber.id}
        `
      }
    } catch (err: unknown) {
      emailError = err instanceof Error ? err.message : "Unknown email error"
    }

    // Analytics — fire and forget
    logAnalyticsEvent({
      eventName: "ai_prompts_subscribed",
      path: "/ai-prompts",
      utm: {
        source: utm_source || null,
        medium: utm_medium || null,
        campaign: utm_campaign || null,
      },
      properties: { email: normalizedEmail },
    }).catch((err) => {
      console.error("[ai-prompts/subscribe] analytics error:", err)
    })

    console.log("[ai-prompts/subscribe] complete — emailSent:", emailSent)
    return NextResponse.json({ success: true, accessUrl, emailSent, emailError })
  } catch (error) {
    console.error("[ai-prompts/subscribe] unhandled error:", error)
    return NextResponse.json(
      {
        error: "Failed to process subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
