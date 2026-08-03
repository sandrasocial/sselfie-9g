import { sql } from "@/lib/db/client"
import { EMAIL_CONFIG, EMAIL_ENV } from "./config"
import { requireResendClient } from "@/lib/resend/client"
import { hasResendApiKey } from "@/lib/resend/api-key"

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
  if (!hasResendApiKey()) {
    throw new Error("RESEND_API_KEY not configured")
  }

  const resend = requireResendClient()

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

  const MAX_ATTEMPTS = 3
  const BACKOFF_MS = [1000, 2000, 4000]
  let lastResult: Awaited<ReturnType<typeof resend.emails.send>> | undefined
  let lastError: string | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      lastResult = await resend.emails.send({
        from: input.from || EMAIL_CONFIG.transactional.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo || EMAIL_CONFIG.transactional.replyTo,
        tags: [{ name: "type", value: input.emailType }],
      })

      if (lastResult?.error) {
        lastError = lastResult.error.message || "Resend error"
        const isRetryable =
          lastError.includes("rate") ||
          lastError.includes("429") ||
          lastError.includes("timeout") ||
          lastError.includes("network")
        if (isRetryable && attempt < MAX_ATTEMPTS) {
          console.warn(`[v0] [transactional] Attempt ${attempt} failed (retryable): ${lastError}`)
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]))
          continue
        }
        break
      }

      // Success
      lastError = undefined
      break
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[v0] [transactional] Attempt ${attempt} threw: ${lastError}`)
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]))
      }
    }
  }

  const result = lastResult

  try {
    await sql`
      INSERT INTO email_events (
        email_type,
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
        ${input.emailType},
        'transactional_sent',
        ${input.emailType},
        ${result?.data?.id || null},
        1,
        ${result?.error || lastError ? "failed" : "success"},
        ${result?.error?.message || lastError || null},
        ${JSON.stringify({ to: input.to, subject: input.subject })},
        NOW()
      )
    `
  } catch (error) {
    console.error("[v0] Failed to log transactional email event:", error)
  }

  return result
}
