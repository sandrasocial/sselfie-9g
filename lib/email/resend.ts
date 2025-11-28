import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Sends an email via Resend
 * Used by marketing automation agents
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: params.from || "SSelfie <hello@sselfie.ai>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    })

    if (error) {
      console.error("[Resend] Email send error:", error)
      return {
        success: false,
        error: error.message || "Failed to send email",
      }
    }

    console.log("[Resend] Email sent successfully:", data?.id)
    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error("[Resend] Unexpected error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
