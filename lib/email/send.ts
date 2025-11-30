/**
 * Global Email Helper
 * Centralized email sending with Resend, error handling, and DB logging
 * 
 * All emails in SSELFIE Studio should use this function.
 */

import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import { checkEmailRateLimit } from "@/lib/rate-limit"

// Lazy Resend client initialization
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Lazy DB connection
let sql: ReturnType<typeof neon> | null = null

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured")
    }
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: string[]
  userId?: string
  emailType?: string
  metadata?: Record<string, any>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Main email sending function
 * Handles Resend client, errors, retries, rate limiting, and DB logging
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const startTime = Date.now()
  const recipient = Array.isArray(options.to) ? options.to[0] : options.to
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  try {
    // Validate required env vars
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    // Rate limiting check
    const rateLimit = await checkEmailRateLimit(recipient)
    if (!rateLimit.success) {
      const errorMsg = `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60)} minutes.`
      await logEmailToDb({
        ...options,
        to: recipient,
        success: false,
        error: errorMsg,
        messageId: undefined,
      })
      return {
        success: false,
        error: errorMsg,
      }
    }

    // Get Resend client
    const resend = getResendClient()

    // Default sender
    const from = options.from || process.env.RESEND_FROM_EMAIL || "Maya @ SSELFIE <maya@sselfie.ai>"

    // Send email with retry logic
    let lastError: string | undefined
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Email] Sending email (attempt ${attempt}/${maxRetries}):`, {
          to: recipient,
          subject: options.subject,
          from,
          hasHtml: !!options.html,
          htmlLength: options.html?.length || 0,
        })

        const { data, error } = await resend.emails.send({
          from,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text || stripHtml(options.html),
          reply_to: options.replyTo || "hello@sselfie.ai",
          tags: options.tags?.map((tag) => ({ name: tag, value: tag })),
        })

        if (error) {
          lastError = error.message || "Failed to send email"
          console.error(`[Email] Resend error (attempt ${attempt}):`, error)

          // Don't retry on certain errors
          if (
            error.message?.includes("Invalid") ||
            error.message?.includes("not found") ||
            error.message?.includes("domain is not verified") ||
            error.message?.includes("unsubscribed")
          ) {
            break
          }

          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
            console.log(`[Email] Retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
          continue
        }

        // Success
        const messageId = data?.id
        const duration = Date.now() - startTime

        console.log(`[Email] Email sent successfully in ${duration}ms:`, messageId)

        // Log to database
        await logEmailToDb({
          ...options,
          to: recipient,
          success: true,
          error: undefined,
          messageId,
        })

        return {
          success: true,
          messageId,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Failed to send email"
        console.error(`[Email] Error sending email (attempt ${attempt}):`, error)

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    const errorMsg = lastError || "Failed to send email after retries"
    await logEmailToDb({
      ...options,
      to: recipient,
      success: false,
      error: errorMsg,
      messageId: undefined,
    })

    return {
      success: false,
      error: errorMsg,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[Email] Unexpected error:", error)

    await logEmailToDb({
      ...options,
      to: recipient,
      success: false,
      error: errorMsg,
      messageId: undefined,
    })

    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Log email to database for tracking and analytics
 */
async function logEmailToDb(
  options: SendEmailOptions & {
    success: boolean
    error?: string
    messageId?: string
  },
): Promise<void> {
  try {
    const db = getDb()
    const recipient = Array.isArray(options.to) ? options.to[0] : options.to

    await db`
      INSERT INTO email_logs (
        user_email,
        email_type,
        status,
        sent_at,
        resend_message_id,
        error_message,
        metadata
      )
      VALUES (
        ${recipient},
        ${options.emailType || "automated"},
        ${options.success ? "sent" : "failed"},
        NOW(),
        ${options.messageId || null},
        ${options.error || null},
        ${options.metadata ? JSON.stringify(options.metadata) : null}
      )
    `
  } catch (error) {
    // Don't throw - email logging failure shouldn't break email sending
    console.error("[Email] Failed to log email to database:", error)
  }
}

/**
 * Strip HTML tags to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
  options?: {
    from?: string
    replyTo?: string
    tags?: string[]
    batchSize?: number
    delayMs?: number
  },
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  const batchSize = options?.batchSize || 10
  const delayMs = options?.delayMs || 200

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (recipient) => {
        const result = await sendEmail({
          to: recipient,
          subject,
          html,
          text,
          from: options?.from,
          replyTo: options?.replyTo,
          tags: options?.tags,
        })

        if (result.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(`${recipient}: ${result.error}`)
        }
      }),
    )

    // Rate limiting between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

