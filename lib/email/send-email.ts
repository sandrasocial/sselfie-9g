// Email sending utilities using Resend
import { Resend } from "resend"
import { getResendApiKey, hasResendApiKey } from "@/lib/resend/api-key"
import { checkEmailRateLimit } from "@/lib/rate-limit"
import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  addMarketingUnsubscribeFooter,
  buildListUnsubscribeHeaders,
  buildUnsubscribeUrl,
  getMarketingEmailSuppression,
} from "@/lib/email/unsubscribe"

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: string[]
  emailType?: string // Optional: type of email for logging (e.g., 'welcome', 'campaign', 'feedback')
  campaignId?: number // Optional: campaign ID for tracking
  marketing?: boolean
  headers?: Record<string, string>
  idempotencyKey?: string
}


// Initialize Resend client - will be null if API key is missing
let resend: Resend | null = null
try {
  if (hasResendApiKey()) {
    resend = new Resend(getResendApiKey())
  } else {
    console.error("[v0] ⚠️ RESEND_API_KEY environment variable is not set!")
  }
} catch (error) {
  console.error("[v0] ⚠️ Failed to initialize Resend client:", error)
}

function normalizeOutboundRecipient(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/[.,;:]+$/g, "")

  if (!normalized) return null
  if (normalized.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null
  return normalized
}

function normalizeOutboundRecipients(to: string | string[]): {
  recipients: string[]
  invalid: string[]
} {
  const rawRecipients = Array.isArray(to) ? to : [to]
  const recipients: string[] = []
  const invalid: string[] = []

  for (const raw of rawRecipients) {
    const normalized = normalizeOutboundRecipient(raw)
    if (normalized) {
      recipients.push(normalized)
    } else {
      invalid.push(raw)
    }
  }

  return { recipients, invalid }
}

async function sendEmailWithRetry(
  options: EmailOptions,
  maxRetries = 3,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Sending email via Resend (attempt ${attempt}/${maxRetries}):`, {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html,
        hasText: !!options.text,
        htmlLength: options.html?.length || 0,
        textLength: options.text?.length || 0,
      })

      // Validate Resend API key and client
      if (!hasResendApiKey()) {
        lastError = "RESEND_API_KEY environment variable is not set"
        console.error(`[v0] ❌ Resend API key missing - cannot send email`)
        break
      }

      if (!resend) {
        lastError = "Resend client not initialized"
        console.error(`[v0] ❌ Resend client not initialized - cannot send email`)
        break
      }

      const emailType = options.emailType || "general"
      const isMarketing =
        options.tags?.includes("campaign") ||
        emailType.startsWith("campaign") ||
        typeof options.campaignId === "number"

      console.log(`[v0] 📧 Attempting to send email via Resend...`, {
        emailType,
        isMarketing,
      })

      const emailPayload = {
        from: options.from || "SSelfie <hello@sselfie.ai>",
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text ?? "",
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        ...(options.headers ? { headers: options.headers } : {}),
        tags: options.tags?.map((tag) => ({ name: tag, value: tag })),
      }

      const { data, error } = options.idempotencyKey
        ? await resend.emails.send(emailPayload, { idempotencyKey: options.idempotencyKey })
        : await resend.emails.send(emailPayload)

      if (error) {
        lastError = error.message || "Failed to send email"
        console.error(`[v0] Resend error (attempt ${attempt}):`, JSON.stringify(error, null, 2))

        // Don't retry on certain errors
        if (error.message?.includes("Invalid") || error.message?.includes("not found")) {
          break
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
          console.log(`[v0] Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
        continue
      }

      console.log("[v0] ✅ Email sent successfully via Resend:", {
        messageId: data?.id,
        to: options.to,
        subject: options.subject,
      })
      return {
        success: true,
        messageId: data?.id,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Failed to send email"
      console.error(`[v0] Error sending email (attempt ${attempt}):`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // Log error to admin error radar
  if (lastError) {
    const { logAdminError } = await import("@/lib/admin-error-log")
    await logAdminError({
      toolName: "email-send",
      error: new Error(lastError),
      context: {
        to: options.to,
        subject: options.subject,
        emailType: options.emailType,
        campaignId: options.campaignId,
        attempts: maxRetries,
      },
    }).catch(() => {
      // Ignore logging errors
    })
  }

  return {
    success: false,
    error: lastError || "Failed to send email after retries",
  }
}

/**
 * Log email send attempt to email_logs table
 * This is non-blocking - errors are logged but don't affect email sending
 */
async function logEmailSend(
  userEmail: string,
  emailType: string,
  status:
    | "sent"
    | "delivered"
    | "failed"
    | "suppressed"
    | "error"
    | "skipped_disabled"
    | "skipped_test_mode"
    | "skipped_dry_run",
  resendMessageId?: string,
  errorMessage?: string,
  campaignId?: number,
): Promise<void> {
  try {
    await sql`
      INSERT INTO email_logs (
        user_email,
        email_type,
        resend_message_id,
        status,
        error_message,
        campaign_id,
        sent_at
      )
      VALUES (
        ${userEmail},
        ${emailType},
        ${resendMessageId || null},
        ${status},
        ${errorMessage || null},
        ${campaignId || null},
        NOW()
      )
    `
  } catch (error) {
    // Log error but don't throw - email logging should never break email sending
    console.error("[v0] Failed to log email to database:", error)
  }
}

async function getRecipientSuppression(email: string): Promise<{ suppressed: boolean; reason?: string }> {
  try {
    const recent = await sql`
      SELECT status, error_message, sent_at
      FROM email_logs
      WHERE user_email = ${email}
        AND status IN ('complained', 'bounced', 'suppressed')
        AND sent_at > NOW() - INTERVAL '180 days'
      ORDER BY sent_at DESC
      LIMIT 1
    `

    if (!recent || recent.length === 0) {
      return { suppressed: false }
    }

    const row = recent[0] as { status: string; error_message?: string | null; sent_at?: string | null }
    if (row.status === "complained") {
      return { suppressed: true, reason: "recipient complained (spam report)" }
    }

    if (row.status === "bounced") {
      return { suppressed: true, reason: row.error_message || "recipient recently bounced" }
    }

    return { suppressed: false }
  } catch (error) {
    console.warn("[v0] Failed suppression check (continuing send):", error)
    return { suppressed: false }
  }
}

export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalized = normalizeOutboundRecipients(options.to)
  const recipient = normalized.recipients[0] || normalized.invalid[0] || ""
  const emailType = options.emailType || "general"
  let preparedOptions: EmailOptions = {
    ...options,
    to: Array.isArray(options.to) ? normalized.recipients : normalized.recipients[0] || "",
  }

  if (normalized.invalid.length > 0 || normalized.recipients.length === 0) {
    const errorMessage = `Invalid recipient email: ${normalized.invalid.join(", ") || "missing recipient"}`
    await logEmailSend(recipient || "unknown", emailType, "failed", undefined, errorMessage, options.campaignId)
    return {
      success: false,
      error: errorMessage,
    }
  }

  if (!options.subject || options.subject.trim().length === 0) {
    const errorMessage = "Missing subject field"
    await logEmailSend(recipient, emailType, "error", undefined, errorMessage, options.campaignId)
    const { logAdminError } = await import("@/lib/admin-error-log")
    await logAdminError({
      toolName: "email-send",
      error: new Error(errorMessage),
      context: {
        to: options.to,
        subject: options.subject,
        emailType: options.emailType,
        campaignId: options.campaignId,
      },
    }).catch(() => {})
    return {
      success: false,
      error: errorMessage,
    }
  }

  // Check email control flags
  const { isEmailSendingEnabled, isEmailTestMode, isEmailAllowedInTestMode } = await import("./email-control")
  const sendingEnabled = await isEmailSendingEnabled()
  const testMode = await isEmailTestMode()

  // Global kill switch check
  if (!sendingEnabled) {
    console.log(`[v0] Email sending disabled (kill switch). Skipping send to ${recipient}`)
    await logEmailSend(recipient, emailType, "skipped_disabled", undefined, "Email sending disabled", options.campaignId)
    return {
      success: false,
      error: "Email sending is currently disabled",
    }
  }

  // Test mode check
  if (testMode && !(await isEmailAllowedInTestMode(recipient))) {
    console.log(`[v0] Test mode enabled. Skipping send to ${recipient} (not whitelisted)`)
    await logEmailSend(recipient, emailType, "skipped_test_mode", undefined, "Test mode: recipient not whitelisted", options.campaignId)
    return {
      success: false,
      error: "Test mode enabled: recipient not in whitelist",
    }
  }

  // Dry-run mode (no send, log only)
  if (String(process.env.EMAIL_DRY_RUN || "").trim().toLowerCase() === "true") {
    console.log(`[v0] [EMAIL_DRY_RUN] Skipping send to ${recipient}`, {
      subject: options.subject,
      htmlLength: options.html?.length || 0,
      textLength: options.text?.length || 0,
      emailType,
    })
    await logEmailSend(recipient, emailType, "skipped_dry_run", undefined, "Dry run enabled", options.campaignId)
    return {
      success: true,
      messageId: "dry_run",
    }
  }

  if (options.marketing) {
    const marketingSuppression = await getMarketingEmailSuppression(recipient)

    if (marketingSuppression.suppressed) {
      const reason = `Suppressed marketing send: ${marketingSuppression.reason}`
      await logEmailSend(recipient, emailType, "suppressed", undefined, reason, options.campaignId)
      return {
        success: false,
        error: reason,
      }
    }

    const unsubscribeUrl = buildUnsubscribeUrl(recipient)
    const compliantBody = addMarketingUnsubscribeFooter(options.html, options.text, unsubscribeUrl)

    preparedOptions = {
      ...preparedOptions,
      from: options.from || EMAIL_CONFIG.marketing.from,
      replyTo: options.replyTo || EMAIL_CONFIG.marketing.replyTo,
      html: compliantBody.html,
      text: compliantBody.text,
      headers: {
        ...options.headers,
        ...buildListUnsubscribeHeaders(unsubscribeUrl),
      },
    }
  }

  const rateLimit = await checkEmailRateLimit(recipient)

  if (!rateLimit.success) {
    console.log(`[v0] Email rate limit exceeded for ${recipient}, skipping send`)
    // Log rate limit as failed
    await logEmailSend(recipient, emailType, "failed", undefined, "Rate limit exceeded", options.campaignId)
    return {
      success: false,
      error: `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60)} minutes.`,
    }
  }

  const suppression = await getRecipientSuppression(recipient)
  if (suppression.suppressed) {
    const reason = `Suppressed recipient: ${suppression.reason || "recent bounce/complaint"}`
    await logEmailSend(recipient, emailType, "failed", undefined, reason, options.campaignId)
    return {
      success: false,
      error: reason,
    }
  }

  const result = await sendEmailWithRetry(preparedOptions, 3)

  // Log the email send result (non-blocking)
  if (result.success) {
    await logEmailSend(recipient, emailType, "sent", result.messageId, undefined, options.campaignId)
  } else {
    await logEmailSend(recipient, emailType, "failed", undefined, result.error, options.campaignId)
  }

  return result
}

export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string,
  text: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient,
      subject,
      html,
      text,
    })

    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${recipient}: ${result.error}`)
    }

    // Rate limiting: wait 100ms between sends
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}
