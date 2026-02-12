/**
 * Retry failed blueprint follow-up emails for a targeted recipient set.
 *
 * This sends direct one-off retries (not a broadcast) to recipients from the
 * latest failed Day 3 / Day 14 runs where the failure was Resend rate limiting.
 *
 * Usage:
 *   pnpm retry-blueprint-followups           # dry run
 *   APPLY=1 pnpm retry-blueprint-followups   # send retries
 */
import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { generateBlueprintFollowupDay3Email } from "@/lib/email/templates/blueprint-followup-day-3"
import { generateBlueprintFollowupDay14Email } from "@/lib/email/templates/blueprint-followup-day-14"
import { EMAIL_CONFIG } from "@/lib/email/config"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required")

const APPLY = process.env.APPLY === "1"
const LOOKBACK_DAYS = Number.parseInt(process.env.BLUEPRINT_RETRY_LOOKBACK_DAYS || "7", 10)
const RETRY_ATTEMPTS = Number.parseInt(process.env.BLUEPRINT_RETRY_ATTEMPTS || "5", 10)
const BASE_BACKOFF_MS = Number.parseInt(process.env.BLUEPRINT_RETRY_BASE_BACKOFF_MS || "800", 10)
const SEND_DELAY_MS = Number.parseInt(process.env.BLUEPRINT_RETRY_SEND_DELAY_MS || "700", 10)

const resend = new Resend(process.env.RESEND_API_KEY)
const sql = neon(process.env.DATABASE_URL)

type Candidate = {
  email_type: "blueprint-followup-day-3" | "blueprint-followup-day-14"
  email: string
  first_name: string | null
  failed_run_id: string
  failed_run_created_at: string
}

type SendResult = {
  emailType: string
  email: string
  status: "sent" | "failed" | "skipped"
  messageId: string | null
  error: string | null
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function outputPath(now: Date) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `retry-blueprint-followups-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}-${APPLY ? "apply" : "dry"}.md`
  return resolve(dir, name)
}

function iso(v: unknown) {
  try {
    return new Date(String(v)).toISOString()
  } catch {
    return String(v ?? "")
  }
}

function isRateLimitError(message: string) {
  const m = message.toLowerCase()
  return m.includes("too many requests") || m.includes("rate limit") || m.includes("429")
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(input: {
  to: string
  subject: string
  html: string
  text: string
  emailType: string
}) {
  let lastError = "Unknown email send failure"

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: [
        { name: "sequence", value: input.emailType },
        { name: "source", value: "blueprint-retry-script" },
      ],
    })

    if (!error) {
      return { success: true, messageId: data?.id || null, error: null }
    }

    lastError = error.message || "Resend send failed"
    if (!isRateLimitError(lastError) || attempt >= RETRY_ATTEMPTS) {
      return { success: false, messageId: null, error: lastError }
    }

    const backoff = Math.min(12_000, BASE_BACKOFF_MS * Math.pow(2, attempt - 1))
    await sleep(backoff)
  }

  return { success: false, messageId: null, error: lastError }
}

async function insertEmailLog(input: {
  email: string
  emailType: string
  status: "sent" | "failed"
  messageId?: string | null
  errorMessage?: string | null
}) {
  await sql`
    INSERT INTO email_logs (user_email, email_type, resend_message_id, status, error_message, sent_at)
    VALUES (
      ${input.email},
      ${input.emailType},
      ${input.messageId || null},
      ${input.status},
      ${input.errorMessage || null},
      NOW()
    )
  `
}

async function main() {
  const now = new Date()
  const lines: string[] = []

  const candidates = (await sql`
    WITH latest_failed AS (
      SELECT
        r.run_id,
        r.email_type,
        r.created_at,
        ROW_NUMBER() OVER (PARTITION BY r.email_type ORDER BY r.created_at DESC) AS run_rank
      FROM marketing_send_runs r
      WHERE r.email_type IN ('blueprint-followup-day-3', 'blueprint-followup-day-14')
        AND r.status = 'failed'
        AND r.error_message ILIKE '%too many requests%'
        AND r.created_at > NOW() - make_interval(days => ${LOOKBACK_DAYS})
    ),
    target_runs AS (
      SELECT run_id, email_type, created_at
      FROM latest_failed
      WHERE run_rank = 1
    )
    SELECT
      tr.email_type,
      q.email,
      q.first_name,
      tr.run_id AS failed_run_id,
      tr.created_at AS failed_run_created_at
    FROM target_runs tr
    JOIN marketing_send_queue q ON q.run_id = tr.run_id
    WHERE q.status = 'failed'
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(q.email)
          AND el.email_type = tr.email_type
          AND el.status IN ('sent', 'delivered')
          AND el.sent_at > tr.created_at
      )
    ORDER BY tr.email_type, LOWER(q.email)
  `) as Candidate[]

  lines.push("# Retry blueprint follow-up failures")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Mode: ${APPLY ? "APPLY (send retries)" : "DRY RUN"}`)
  lines.push(`- Lookback days: ${LOOKBACK_DAYS}`)
  lines.push(`- Candidate recipients: ${candidates.length}`)
  lines.push("")

  if (candidates.length > 0) {
    lines.push("## Candidate list")
    for (const row of candidates) {
      lines.push(`- ${row.email_type}: ${row.email} (failed_run=${row.failed_run_id}, failed_at=${iso(row.failed_run_created_at)})`)
    }
    lines.push("")
  }

  const sendResults: SendResult[] = []

  for (const row of candidates) {
    if (!APPLY) {
      sendResults.push({
        emailType: row.email_type,
        email: row.email,
        status: "skipped",
        messageId: null,
        error: null,
      })
      continue
    }

    const firstName = row.first_name?.trim() || undefined

    let subject = ""
    let html = ""
    let text = ""

    if (row.email_type === "blueprint-followup-day-3") {
      const content = generateBlueprintFollowupDay3Email({
        firstName,
        email: row.email,
      })
      subject = "3 Ways to Use Your Blueprint This Week"
      html = content.html
      text = content.text
    } else {
      const content = generateBlueprintFollowupDay14Email({
        firstName,
        email: row.email,
      })
      subject = "Still thinking about it? Here's $10 off 💕"
      html = content.html
      text = content.text
    }

    const sent = await sendWithRetry({
      to: row.email,
      subject,
      html,
      text,
      emailType: row.email_type,
    })

    if (sent.success) {
      await insertEmailLog({
        email: row.email,
        emailType: row.email_type,
        status: "sent",
        messageId: sent.messageId,
      })
      sendResults.push({
        emailType: row.email_type,
        email: row.email,
        status: "sent",
        messageId: sent.messageId,
        error: null,
      })
    } else {
      await insertEmailLog({
        email: row.email,
        emailType: row.email_type,
        status: "failed",
        errorMessage: sent.error || "Retry send failed",
      })
      sendResults.push({
        emailType: row.email_type,
        email: row.email,
        status: "failed",
        messageId: null,
        error: sent.error || "Retry send failed",
      })
    }

    await sleep(SEND_DELAY_MS)
  }

  const sentCount = sendResults.filter((r) => r.status === "sent").length
  const failedCount = sendResults.filter((r) => r.status === "failed").length

  lines.push("## Send results")
  lines.push(`- Sent: ${sentCount}`)
  lines.push(`- Failed: ${failedCount}`)
  lines.push("")

  if (sendResults.length > 0) {
    for (const r of sendResults) {
      lines.push(
        `- ${r.emailType} | ${r.email} | status=${r.status}${r.messageId ? ` | message_id=${r.messageId}` : ""}${r.error ? ` | error=${r.error}` : ""}`,
      )
    }
    lines.push("")
  }

  const path = outputPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[retry-blueprint-followups] wrote ${path}`)
}

main().catch((err) => {
  console.error("[retry-blueprint-followups] failed:", err)
  process.exitCode = 1
})

