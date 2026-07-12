// ManyChat vault-step email capture bridge.
//
// Why this exists: when an Instagram DM lead reaches the Prompt Vault step in the ManyChat
// flow and hands over their email, ManyChat fires an "External Request" action to this
// endpoint. We sync that lead into Resend (audience + AI Photoshoot segment) and record a
// minimal row in freebie_subscribers so the marketing/nurture can reach them. These leads
// already received the prompts inside the DM, so we deliberately DO NOT send any delivery
// email here.
//
// ManyChat External Request setup (one-time, in the ManyChat editor):
//   POST https://www.sselfie.ai/api/manychat/email-capture
//   Header: x-bridge-secret = MANYCHAT_BRIDGE_SECRET (or include bridge_secret in the JSON body)
//   Body (JSON):
//     {
//       "email": "{{email}}",
//       "first_name": "{{first_name}}",
//       "subscriber_id": "{{user_id}}",
//       "source": "vault_keyword"
//     }
//
// Always returns 200 with { success: true } (or a skipped marker) on handled-but-invalid input
// so ManyChat's request never error-loops. Rejects only on a missing/invalid shared secret (401).

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { addContactToSegment, addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { normalizeFreebieEmail } from "@/lib/freebie/subscribe-utils"
import { hasResendApiKey } from "@/lib/resend/api-key"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SOURCE = "manychat-vault-dm"

// Same email shape check used across the freebie funnel: must look like a real address.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function pickString(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const raw = body[field]
    if (typeof raw !== "string" && typeof raw !== "number") continue
    const text = String(raw).trim()
    // Ignore unresolved ManyChat placeholders like {{email}}.
    if (!text || /^\{\{[^}]+\}\}$/.test(text)) continue
    return text
  }
  return null
}

function firstNameFrom(value: string | null): string | null {
  if (!value) return null
  const first = value.trim().split(/\s+/)[0]
  return first || null
}

async function addToAiPhotoshootSegment(email: string) {
  const segmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
  if (!segmentId) return

  await addContactToSegment(email, segmentId).catch((error) => {
    console.error("[manychat/email-capture] Failed to add contact to AI Photoshoot segment:", error)
  })
}

export async function POST(request: NextRequest) {
  // --- Shared secret for the acquisition endpoints ---
  const secret = process.env.MANYCHAT_BRIDGE_SECRET?.trim()
  if (!secret) {
    // This acquisition endpoint stays disabled until its dedicated shared secret is configured.
    return NextResponse.json({ error: "Bridge not enabled" }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const provided =
    request.headers.get("x-bridge-secret")?.trim() ||
    (body
      ? pickString(body, [
          "bridge_secret",
          "bridgeSecret",
          "secret",
          "manychat_bridge_secret",
          "manychatBridgeSecret",
        ])
      : null)
  if (!provided || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 })
  }

  try {
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: true, skipped: "no_body" })
    }

    const rawEmail = pickString(body, ["email", "Email", "user_email", "userEmail"])
    if (!rawEmail) {
      return NextResponse.json({ success: true, skipped: "missing_email" })
    }

    const normalizedEmail = normalizeFreebieEmail(rawEmail)
    if (!normalizedEmail || !EMAIL_SHAPE.test(normalizedEmail)) {
      return NextResponse.json({ success: true, skipped: "invalid_email" })
    }

    const firstName = firstNameFrom(pickString(body, ["first_name", "firstName", "name"]))
    const subscriberId = pickString(body, ["subscriber_id", "subscriberId", "user_id", "userId"])
    const source = pickString(body, ["source"]) // optional, free-form ManyChat label
    const rawPromptNumber = pickString(body, ["prompt_number", "promptNumber", "prompt_n"])
    const promptNumber = rawPromptNumber && /^\d{1,6}$/.test(rawPromptNumber) ? rawPromptNumber : null
    const ctaKeyword = promptNumber && /^\d+$/.test(promptNumber) ? promptNumber : "VAULT"
    const signupDate = new Date().toISOString().split("T")[0]

    // --- Resend audience + AI Photoshoot segment (no delivery email) ---
    if (hasResendApiKey()) {
      await addOrUpdateResendContact(normalizedEmail, firstName, {
        source: SOURCE,
        status: "lead",
        journey: "nurture",
        // "curious" is the closest valid AiPhotoshootIntent - these are warm DM leads but
        // not yet buyers; the valid intents are curious/activated/buyer/powerUser/abandoned.
        ...buildAiPhotoshootResendTags("curious"),
        signup_date: signupDate,
      })
      await addToAiPhotoshootSegment(normalizedEmail)
    }

    // --- Minimal freebie_subscribers record (idempotent upsert by email) ---
    const existing = await sql`
      SELECT id
      FROM freebie_subscribers
      WHERE LOWER(BTRIM(email)) = ${normalizedEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existing.length > 0) {
      // Already a known lead - top up attribution without clobbering existing values.
      await sql`
        UPDATE freebie_subscribers
        SET
          name         = COALESCE(name, ${firstName}),
          utm_source   = COALESCE(utm_source, 'instagram'),
          utm_medium   = COALESCE(utm_medium, 'manychat'),
          utm_campaign = COALESCE(utm_campaign, 'vault_keyword'),
          cta_keyword  = COALESCE(cta_keyword, ${ctaKeyword}),
          email_tags   = ARRAY(
            SELECT DISTINCT tag FROM unnest(
              COALESCE(email_tags, ARRAY[]::text[]) ||
              ARRAY['prompt-requester']::text[] ||
              CASE WHEN ${promptNumber} IS NOT NULL THEN ARRAY[${`prompt-${promptNumber}`}]::text[] ELSE ARRAY[]::text[] END
            ) AS tag
          ),
          updated_at   = NOW()
        WHERE id = ${existing[0].id}
      `
    } else {
      const accessToken = crypto.randomUUID()
      await sql`
        INSERT INTO freebie_subscribers (
          email, name, source, access_token,
          utm_source, utm_medium, utm_campaign, cta_keyword,
          email_tags,
          created_at, updated_at,
          guide_access_email_sent, guide_access_email_sent_at
        )
        VALUES (
          ${normalizedEmail},
          ${firstName},
          ${SOURCE},
          ${accessToken},
          'instagram',
          'manychat',
          'vault_keyword',
          ${ctaKeyword},
          ${promptNumber ? ["prompt-requester", `prompt-${promptNumber}`] : ["prompt-requester"]}::text[],
          NOW(),
          NOW(),
          false,
          NULL
        )
      `
    }

    // --- Analytics - fire and forget (behavior only) ---
    logAnalyticsEvent({
      eventName: "manychat_vault_email_captured",
      path: "/api/manychat/email-capture",
      utm: { source: "instagram", medium: "manychat", campaign: "vault_keyword" },
      properties: {
        email: normalizedEmail,
        manychat_subscriber_id: subscriberId,
        manychat_source: source,
        prompt_number: promptNumber,
      },
    }).catch((err) => {
      console.error("[manychat/email-capture] analytics error:", err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Never 500 on a handled-but-bad input - ManyChat would error-loop the request.
    console.error("[manychat/email-capture] unhandled error:", error)
    return NextResponse.json({ success: true, skipped: "error" })
  }
}
