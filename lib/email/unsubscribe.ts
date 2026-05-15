import { createHmac, timingSafeEqual } from "crypto"
import { sql } from "@/lib/db/client"
import { getResendApiKey, hasResendApiKey } from "@/lib/resend/api-key"

const UNSUBSCRIBE_TOKEN_VERSION = "v1"
const CANONICAL_SITE_URL = "https://www.sselfie.ai"
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"

type SuppressionResult =
  | { suppressed: true; reason: string }
  | { suppressed: false }

const resendUnsubscribeCache = new Map<string, { expiresAt: number; unsubscribed: boolean }>()

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase()
}

export function canonicalSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || CANONICAL_SITE_URL
  const normalized = configured.replace(/\/+$/, "")

  return normalized === "https://sselfie.ai" ? CANONICAL_SITE_URL : normalized
}

function unsubscribeSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.RESEND_WEBHOOK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.RESEND_API_KEY

  if (secret) return secret

  if (process.env.NODE_ENV !== "production") {
    return "dev-unsubscribe-secret"
  }

  throw new Error("UNSUBSCRIBE_SECRET or RESEND_WEBHOOK_SECRET is required for unsubscribe links")
}

export function emailUnsubscribeHash(email: string): string {
  return createHmac("sha256", unsubscribeSecret())
    .update(`email:${normalizeEmailAddress(email)}`)
    .digest("hex")
}

function signUnsubscribeHash(emailHash: string): string {
  return createHmac("sha256", unsubscribeSecret())
    .update(`unsubscribe:${emailHash}`)
    .digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) return false

  return timingSafeEqual(aBuffer, bBuffer)
}

export function createUnsubscribeToken(email: string): string {
  const emailHash = emailUnsubscribeHash(email)
  return `${UNSUBSCRIBE_TOKEN_VERSION}.${emailHash}.${signUnsubscribeHash(emailHash)}`
}

export function verifyUnsubscribeToken(token: string | null): { valid: true; emailHash: string } | { valid: false } {
  if (!token) return { valid: false }

  const [version, emailHash, signature] = token.split(".")
  if (version !== UNSUBSCRIBE_TOKEN_VERSION || !emailHash || !signature) {
    return { valid: false }
  }

  const expectedSignature = signUnsubscribeHash(emailHash)
  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false }
  }

  return { valid: true, emailHash }
}

export function buildUnsubscribeUrl(email: string): string {
  const token = createUnsubscribeToken(email)
  return `${canonicalSiteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
}

export function buildListUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}

export function addMarketingUnsubscribeFooter(
  html: string,
  text: string | undefined,
  unsubscribeUrl: string
): { html: string; text?: string } {
  const replacedHtml = html.replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", unsubscribeUrl)
  const replacedText = (text || "").replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", unsubscribeUrl)
  const hasVisibleUnsubscribe = /unsubscribe/i.test(replacedHtml)
  const hasAddress = /Fauskevegen 121/i.test(replacedHtml)
  const footerHtml = `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e0d7;color:#7c7068;font-size:12px;line-height:1.6;">
      ${hasVisibleUnsubscribe ? "" : `<p style="margin:0 0 8px;"><a href="${unsubscribeUrl}" style="color:#7c7068;text-decoration:underline;">Unsubscribe</a></p>`}
      ${hasAddress ? "" : '<p style="margin:0;">SSELFIE Studio, Fauskevegen 121, 6230 Sykkylven, Norway</p>'}
    </div>`

  const footerText = [
    hasVisibleUnsubscribe ? "" : `Unsubscribe: ${unsubscribeUrl}`,
    "SSELFIE Studio, Fauskevegen 121, 6230 Sykkylven, Norway",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    html: hasVisibleUnsubscribe && hasAddress ? replacedHtml : `${replacedHtml}${footerHtml}`,
    text: replacedText
      ? `${replacedText}${footerText ? `\n\n${footerText}` : ""}`
      : footerText || undefined,
  }
}

export async function recordEmailUnsubscribe(
  token: string | null,
  source: string,
  userAgent?: string | null
): Promise<{ success: true } | { success: false; reason: string }> {
  const verified = verifyUnsubscribeToken(token)

  if (!verified.valid) {
    return { success: false, reason: "invalid_token" }
  }

  await sql`
    INSERT INTO email_events (
      event_type,
      email_type,
      status,
      metadata,
      created_at
    )
    VALUES (
      'email.unsubscribed',
      'unsubscribe',
      'processed',
      ${JSON.stringify({
        email_hash: verified.emailHash,
        source,
        user_agent: userAgent || null,
        processed_at: new Date().toISOString(),
      })}::jsonb,
      NOW()
    )
  `

  return { success: true }
}

export async function isAppUnsubscribed(email: string): Promise<boolean> {
  const emailHash = emailUnsubscribeHash(email)

  const rows = (await sql`
    SELECT EXISTS (
      SELECT 1
      FROM email_events
      WHERE event_type = 'email.unsubscribed'
        AND status = 'processed'
        AND metadata->>'email_hash' = ${emailHash}
      LIMIT 1
    ) AS exists
  `) as Array<{ exists: boolean }>

  return rows[0]?.exists === true
}

async function isSuppressedByEmailEvents(email: string): Promise<SuppressionResult> {
  const normalizedEmail = normalizeEmailAddress(email)

  const rows = (await sql`
    SELECT event_type
    FROM email_events
    WHERE event_type IN ('email.bounced', 'email.complained', 'email.suppressed')
      AND LOWER(metadata->>'recipient_email') = ${normalizedEmail}
    ORDER BY created_at DESC
    LIMIT 1
  `) as Array<{ event_type: string }>

  const eventType = rows[0]?.event_type
  if (!eventType) return { suppressed: false }

  return { suppressed: true, reason: eventType.replace("email.", "") }
}

async function isSuppressedByEmailLogs(email: string): Promise<SuppressionResult> {
  const normalizedEmail = normalizeEmailAddress(email)

  const rows = (await sql`
    SELECT status, error_message
    FROM email_logs
    WHERE LOWER(TRIM(user_email)) = ${normalizedEmail}
      AND (
        status IN ('complained', 'bounced', 'suppressed')
        OR (status = 'failed' AND error_message ILIKE '%suppressed%')
      )
    ORDER BY created_at DESC
    LIMIT 1
  `) as Array<{ status: string; error_message: string | null }>

  const row = rows[0]
  if (!row) return { suppressed: false }

  return { suppressed: true, reason: row.status }
}

async function isResendAudienceUnsubscribed(email: string): Promise<boolean> {
  if (!RESEND_AUDIENCE_ID || !hasResendApiKey()) {
    return false
  }

  const normalizedEmail = normalizeEmailAddress(email)
  const cached = resendUnsubscribeCache.get(normalizedEmail)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.unsubscribed
  }

  try {
    const response = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(normalizedEmail)}`,
      {
        headers: {
          Authorization: `Bearer ${getResendApiKey()}`,
        },
      }
    )

    if (response.status === 404) {
      resendUnsubscribeCache.set(normalizedEmail, { expiresAt: Date.now() + 5 * 60 * 1000, unsubscribed: false })
      return false
    }

    if (!response.ok) {
      console.warn("[Email] Could not verify Resend unsubscribe status", {
        status: response.status,
      })
      return false
    }

    const payload = await response.json()
    const contact = payload?.data || payload
    const unsubscribed = contact?.unsubscribed === true

    resendUnsubscribeCache.set(normalizedEmail, { expiresAt: Date.now() + 5 * 60 * 1000, unsubscribed })
    return unsubscribed
  } catch (error) {
    console.warn("[Email] Resend unsubscribe lookup failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    })
    return false
  }
}

export async function getMarketingEmailSuppression(email: string): Promise<SuppressionResult> {
  if (await isAppUnsubscribed(email)) {
    return { suppressed: true, reason: "unsubscribed" }
  }

  if (await isResendAudienceUnsubscribed(email)) {
    return { suppressed: true, reason: "resend_unsubscribed" }
  }

  const eventSuppression = await isSuppressedByEmailEvents(email)
  if (eventSuppression.suppressed) {
    return eventSuppression
  }

  const logSuppression = await isSuppressedByEmailLogs(email)
  if (logSuppression.suppressed) {
    return logSuppression
  }

  return { suppressed: false }
}
