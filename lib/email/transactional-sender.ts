import { Resend } from "resend"
import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG, EMAIL_ENV } from "./config"

const resend = new Resend(process.env.RESEND_API_KEY)

interface TransactionalEmailInput {
  to: string
  subject: string
  html: string
  text: string
  emailType: string
  from?: string
  replyTo?: string
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured")
  }

  if (EMAIL_ENV.dryRun) {
    console.log("[v0] [EMAIL_DRY_RUN] Transactional email suppressed:", {
      to: input.to,
      subject: input.subject,
      emailType: input.emailType,
      htmlLength: input.html.length,
      textLength: input.text.length,
    })
    return { success: true, dryRun: true }
  }

  const result = await resend.emails.send({
    from: input.from || EMAIL_CONFIG.transactional.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.replyTo || EMAIL_CONFIG.transactional.replyTo,
    tags: [{ name: "type", value: input.emailType }],
  })

  try {
    await sql`
      INSERT INTO email_events (
        event_type,
        campaign_key,
        provider_broadcast_id,
        recipient_count,
        status,
        error_message,
        metadata,
        created_at
      )
      VALUES (
        'transactional_sent',
        ${input.emailType},
        ${result?.data?.id || null},
        1,
        ${result?.error ? "failed" : "success"},
        ${result?.error?.message || null},
        ${JSON.stringify({ to: input.to, subject: input.subject })},
        NOW()
      )
    `
  } catch (error) {
    console.error("[v0] Failed to log transactional email event:", error)
  }

  return result
}

