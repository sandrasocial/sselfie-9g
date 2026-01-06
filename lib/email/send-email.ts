// Email sending utilities using Resend
import { Resend } from "resend"
import { checkEmailRateLimit } from "@/lib/rate-limit"
import { neon } from "@neondatabase/serverless"

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  tags?: string[]
  emailType?: string // Optional: type of email for logging (e.g., 'welcome', 'campaign', 'feedback')
  campaignId?: number // Optional: campaign ID for tracking
}

const sql = neon(process.env.DATABASE_URL!)

// Initialize Resend client - will be null if API key is missing
let resend: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  } else {
    console.error("[v0] ⚠️ RESEND_API_KEY environment variable is not set!")
  }
} catch (error) {
  console.error("[v0] ⚠️ Failed to initialize Resend client:", error)
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
      if (!process.env.RESEND_API_KEY) {
        lastError = "RESEND_API_KEY environment variable is not set"
        console.error(`[v0] ❌ Resend API key missing - cannot send email`)
        break
      }

      if (!resend) {
        lastError = "Resend client not initialized"
        console.error(`[v0] ❌ Resend client not initialized - cannot send email`)
        break
      }

      console.log(`[v0] 📧 Attempting to send email via Resend...`)

      const { data, error } = await resend.emails.send({
        from: options.from || "SSelfie <hello@sselfie.ai>",
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags?.map((tag) => ({ name: tag, value: tag })),
      })

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
  status: "sent" | "delivered" | "failed" | "error" | "skipped_disabled" | "skipped_test_mode",
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

export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = Array.isArray(options.to) ? options.to[0] : options.to
  const emailType = options.emailType || "general"

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

  const result = await sendEmailWithRetry(options, 3)

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
