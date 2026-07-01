import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { addContactToSegment, addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { generateAiPromptsDay0DeliveryEmail } from "@/lib/email/templates/ai-prompts-day0-delivery"
import { generateAiPromptsSinglePromptDeliveryEmail } from "@/lib/email/templates/ai-prompts-single-prompt-delivery"
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

function safeAttribution(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
}

function aiPromptsAccessUrl(accessToken: string): string {
  return `${siteUrl()}/ai-prompts/access/${accessToken}`
}

function siteHref(value?: string | null): string | null {
  const clean = value?.trim()
  if (!clean) return null

  if (clean.startsWith("/")) return `${siteUrl()}${clean}`

  try {
    const url = new URL(clean)
    if (url.hostname === "sselfie.ai" || url.hostname === "www.sselfie.ai") {
      url.protocol = "https:"
      url.hostname = "www.sselfie.ai"
      return url.toString()
    }
  } catch {
    return null
  }

  return null
}

function firstNameFrom(stored: string | null | undefined, fallback: string): string {
  return (stored || fallback).trim().split(/\s+/)[0] || fallback.trim()
}

function buildEmailTags(
  existingTags: string[] | null,
  utmSource: string | null | undefined,
  promptNumber?: string | null,
  promptIntent?: string | null,
): string[] {
  const set = new Set<string>(buildAiPhotoshootEmailTags(existingTags, ["curious"]))
  set.add("ai-prompts-subscriber")
  set.add("freebie-subscriber")
  const utm = typeof utmSource === "string" ? utmSource.trim() : ""
  if (utm.length > 0 && /^[a-zA-Z0-9_-]{1,40}$/.test(utm)) {
    set.add(`ai-prompts-source-${utm.toLowerCase()}`)
  } else {
    set.add("ai-prompts-source-direct")
  }
  const cleanPromptNumber = safeAttribution(promptNumber, 40)
  if (cleanPromptNumber && /^\d+$/.test(cleanPromptNumber)) {
    set.add("prompt-requester")
    set.add(`prompt-${cleanPromptNumber}`)
  }
  const cleanPromptIntent = safeAttribution(promptIntent, 40)
  if (cleanPromptIntent && /^[a-z0-9_-]+$/.test(cleanPromptIntent)) {
    set.add(`prompt-intent-${cleanPromptIntent.toLowerCase()}`)
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

async function recentlySentDeliveryEmail(
  email: string,
  emailType = "ai_prompts_delivery",
): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM email_logs
    WHERE LOWER(BTRIM(user_email)) = ${email}
      AND email_type = ${emailType}
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
  deliveryContext?: "prompt_pack" | "single_prompt"
  promptNumber?: string | null
  promptTitle?: string | null
  promptUrl?: string | null
  promptCheckoutUrl?: string | null
  promptIntent?: string | null
}): Promise<{ emailSent: boolean; emailError: string | null }> {
  if (!hasResendApiKey()) {
    console.log("[ai-prompts/subscribe] RESEND_API_KEY not configured, skipping email")
    return { emailSent: false, emailError: "RESEND_API_KEY not configured" }
  }

  const isSinglePrompt =
    input.deliveryContext === "single_prompt" &&
    Boolean(input.promptNumber?.trim()) &&
    Boolean(input.promptTitle?.trim()) &&
    Boolean(input.promptUrl?.trim())
  const { html, text, subject } = isSinglePrompt
    ? generateAiPromptsSinglePromptDeliveryEmail({
        firstName: input.firstName,
        promptNumber: input.promptNumber!.trim(),
        promptTitle: input.promptTitle!.trim(),
        promptUrl: siteHref(input.promptUrl) || input.promptUrl!.trim(),
        promptCheckoutUrl: siteHref(input.promptCheckoutUrl) || undefined,
        promptIntent: input.promptIntent?.trim() || undefined,
      })
    : generateAiPromptsDay0DeliveryEmail({
        firstName: input.firstName,
        recipientEmail: input.email,
        accessUrl: input.accessUrl,
      })

  const result = await sendEmail({
    from: "SSELFIE <hello@sselfie.ai>",
    to: input.email,
    replyTo: "hello@sselfie.ai",
    subject,
    html,
    text,
    tags: isSinglePrompt ? ["ai-prompts", "single-prompt-delivery"] : ["ai-prompts-delivery"],
    emailType: isSinglePrompt ? "ai_prompts_single_prompt_delivery" : "ai_prompts_delivery",
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
    const {
      firstName,
      email,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      checkout_source,
      cta_keyword,
      entry_post_slug,
      landing_path,
      referrer,
      prompt_number,
      prompt_title,
      prompt_page_url,
      prompt_checkout_url,
      prompt_intent,
      quiz_result,
      delivery_context,
    } = body

    const promptNumber = safeAttribution(prompt_number, 40)
    const promptTitle = safeAttribution(prompt_title, 160)
    const promptPageUrl = safeAttribution(prompt_page_url, 500)
    const promptCheckoutUrl = safeAttribution(prompt_checkout_url, 500)
    const promptIntent = safeAttribution(prompt_intent || quiz_result, 40)
    const deliveryContext =
      delivery_context === "single_prompt" && promptNumber && promptTitle && promptPageUrl
        ? "single_prompt"
        : "prompt_pack"

    if (!email || (!firstName && deliveryContext !== "single_prompt")) {
      return NextResponse.json({ error: "Email and first name are required" }, { status: 400 })
    }

    const normalizedEmail = normalizeFreebieEmail(String(email))
    const trimmedFirstName = String(firstName || "there").trim()

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
      const updatedTags = buildEmailTags(existingTags, utm_source, promptNumber, promptIntent)

      const tagsNeedUpdate =
        wasGenerated ||
        updatedTags.some((t) => !(existingTags || []).includes(t))

      if (tagsNeedUpdate) {
        await sql`
          UPDATE freebie_subscribers
          SET access_token = ${accessToken},
              email_tags   = ${updatedTags}::text[],
              utm_source = COALESCE(utm_source, ${safeAttribution(utm_source, 120)}),
              utm_medium = COALESCE(utm_medium, ${safeAttribution(utm_medium, 120)}),
              utm_campaign = COALESCE(utm_campaign, ${safeAttribution(utm_campaign, 160)}),
              utm_content = COALESCE(utm_content, ${safeAttribution(utm_content, 160)}),
              checkout_source = COALESCE(checkout_source, ${safeAttribution(checkout_source, 120)}),
              cta_keyword = COALESCE(cta_keyword, ${safeAttribution(cta_keyword, 80)}),
              entry_post_slug = COALESCE(entry_post_slug, ${safeAttribution(entry_post_slug, 160)}),
              landing_path = COALESCE(landing_path, ${safeAttribution(landing_path, 500)}),
              referrer = COALESCE(referrer, ${safeAttribution(referrer, 500)}),
              updated_at   = NOW()
          WHERE id = ${subscriber.id}
        `
      } else {
        await sql`
          UPDATE freebie_subscribers
          SET
            utm_source = COALESCE(utm_source, ${safeAttribution(utm_source, 120)}),
            utm_medium = COALESCE(utm_medium, ${safeAttribution(utm_medium, 120)}),
            utm_campaign = COALESCE(utm_campaign, ${safeAttribution(utm_campaign, 160)}),
            utm_content = COALESCE(utm_content, ${safeAttribution(utm_content, 160)}),
            checkout_source = COALESCE(checkout_source, ${safeAttribution(checkout_source, 120)}),
            cta_keyword = COALESCE(cta_keyword, ${safeAttribution(cta_keyword, 80)}),
            entry_post_slug = COALESCE(entry_post_slug, ${safeAttribution(entry_post_slug, 160)}),
            landing_path = COALESCE(landing_path, ${safeAttribution(landing_path, 500)}),
            referrer = COALESCE(referrer, ${safeAttribution(referrer, 500)}),
            updated_at = NOW()
          WHERE id = ${subscriber.id}
        `
      }

      if (hasResendApiKey()) {
        await addOrUpdateResendContact(normalizedEmail, firstNameFrom(subscriber.name, trimmedFirstName), {
          source: "ai-prompts",
          status: "lead",
          journey: "nurture",
          prompt_intent: promptIntent || undefined,
          ...buildAiPhotoshootResendTags("curious"),
          signup_date: new Date().toISOString().split("T")[0],
        })
        await addToAiPhotoshootSegment(normalizedEmail)
      }

      const accessUrl = aiPromptsAccessUrl(accessToken)
      const cooldownActive = await recentlySentDeliveryEmail(
        normalizedEmail,
        deliveryContext === "single_prompt" ? "ai_prompts_single_prompt_delivery" : "ai_prompts_delivery",
      )

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
          deliveryContext,
          promptNumber,
          promptTitle,
          promptUrl: promptPageUrl,
          promptCheckoutUrl,
          promptIntent,
        })
        emailSent = delivery.emailSent
        emailError = delivery.emailError
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : "Unknown email error"
      }

      logAnalyticsEvent({
        eventName: "ai_prompts_subscribed",
        path: landing_path || (deliveryContext === "single_prompt" && promptNumber ? `/p/${promptNumber}` : "/ai-prompts"),
        utm: {
          source: utm_source || null,
          medium: utm_medium || null,
          campaign: utm_campaign || null,
        },
        properties: {
          email: normalizedEmail,
          prompt_number: promptNumber || null,
          prompt_title: promptTitle || null,
          prompt_intent: promptIntent || null,
          quiz_result: promptIntent || null,
          delivery_context: deliveryContext,
          cta_keyword: safeAttribution(cta_keyword, 80),
          entry_post_slug: safeAttribution(entry_post_slug, 160),
          checkout_source: safeAttribution(checkout_source, 120),
          landing_path: safeAttribution(landing_path, 500),
        },
      }).catch((err) => {
        console.error("[ai-prompts/subscribe] analytics error:", err)
      })

      return NextResponse.json({ success: true, accessUrl, emailSent, emailError, alreadySubscribed: true })
    }

    // -----------------------------------------------------------------------
    // New subscriber path
    // -----------------------------------------------------------------------
    const accessToken = crypto.randomUUID()
    const emailTags = buildEmailTags(null, utm_source, promptNumber, promptIntent)

    console.log("[ai-prompts/subscribe] inserting new subscriber")
    const result = await sql`
      INSERT INTO freebie_subscribers (
        email, name, source, access_token,
        utm_source, utm_medium, utm_campaign, utm_content,
        checkout_source, cta_keyword, entry_post_slug, landing_path, referrer,
        email_tags, created_at, updated_at,
        guide_access_email_sent, guide_access_email_sent_at
      )
      VALUES (
        ${normalizedEmail},
        ${trimmedFirstName},
        ${SOURCE},
        ${accessToken},
        ${safeAttribution(utm_source, 120)},
        ${safeAttribution(utm_medium, 120)},
        ${safeAttribution(utm_campaign, 160)},
        ${safeAttribution(utm_content, 160)},
        ${safeAttribution(checkout_source, 120)},
        ${safeAttribution(cta_keyword, 80)},
        ${safeAttribution(entry_post_slug, 160)},
        ${safeAttribution(landing_path, 500)},
        ${safeAttribution(referrer, 500)},
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
      journey: "nurture",
      prompt_intent: promptIntent || undefined,
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
        deliveryContext,
        promptNumber,
        promptTitle,
        promptUrl: promptPageUrl,
        promptCheckoutUrl,
        promptIntent,
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

    // Analytics - fire and forget
    logAnalyticsEvent({
      eventName: "ai_prompts_subscribed",
      path: landing_path || (deliveryContext === "single_prompt" && promptNumber ? `/p/${promptNumber}` : "/ai-prompts"),
      utm: {
        source: utm_source || null,
        medium: utm_medium || null,
        campaign: utm_campaign || null,
      },
      properties: {
        email: normalizedEmail,
        prompt_number: promptNumber || null,
        prompt_title: promptTitle || null,
        prompt_intent: promptIntent || null,
        quiz_result: promptIntent || null,
        delivery_context: deliveryContext,
        cta_keyword: safeAttribution(cta_keyword, 80),
        entry_post_slug: safeAttribution(entry_post_slug, 160),
        checkout_source: safeAttribution(checkout_source, 120),
        landing_path: safeAttribution(landing_path, 500),
      },
    }).catch((err) => {
      console.error("[ai-prompts/subscribe] analytics error:", err)
    })

    console.log("[ai-prompts/subscribe] complete - emailSent:", emailSent)
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
