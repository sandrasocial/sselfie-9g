// Email sending utilities using Resend
import { Resend } from "resend"

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

export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log("[v0] Sending email via Resend:", { to: options.to, subject: options.subject })

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
      console.error("[v0] Resend error:", error)
      return {
        success: false,
        error: error.message || "Failed to send email",
      }
    }

    console.log("[v0] Email sent successfully:", data?.id)
    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
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
