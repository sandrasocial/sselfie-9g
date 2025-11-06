// Email sending utilities using Resend
import { Resend } from "resend"
import { checkEmailRateLimit } from "@/lib/rate-limit"

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  tags?: string[]
}

const resend = new Resend(process.env.RESEND_API_KEY)

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
        console.error(`[v0] Resend error (attempt ${attempt}):`, error)

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

      console.log("[v0] Email sent successfully:", data?.id)
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

  return {
    success: false,
    error: lastError || "Failed to send email after retries",
  }
}

export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = Array.isArray(options.to) ? options.to[0] : options.to
  const rateLimit = await checkEmailRateLimit(recipient)

  if (!rateLimit.success) {
    console.log(`[v0] Email rate limit exceeded for ${recipient}, skipping send`)
    return {
      success: false,
      error: `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60)} minutes.`,
    }
  }

  return sendEmailWithRetry(options, 3)
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
