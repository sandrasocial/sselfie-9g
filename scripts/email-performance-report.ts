/**
 * Email performance report (DB-based, read-only).
 *
 * - Aggregates email_logs by type/status
 * - Highlights failures and "queued" backlog
 * - If admin_email_campaigns exists, links campaign_id -> campaign metadata (best-effort)
 *
 * Writes: output/automation/email-performance-YYYY-MM-DD.md
 */
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function outPath(now: Date) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `email-performance-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function iso(x: any) {
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() }
  } catch (err: any) {
    return { ok: false, error: `${label}: ${err?.message || String(err)}` }
  }
}

async function main() {
  const now = new Date()
  const hours = Number(process.env.EMAIL_REPORT_WINDOW_HOURS || 24)

  const byType = await safe("email_logs_by_type", async () => {
    return await sql`
      SELECT email_type, status, COUNT(*)::int AS count, MAX(sent_at) AS last_sent
      FROM email_logs
      WHERE sent_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY email_type, status
      ORDER BY email_type, status
    `
  })

  const queuedBacklog = await safe("queued_backlog", async () => {
    return await sql`
      SELECT email_type, COUNT(*)::int AS count, MIN(sent_at) AS oldest
      FROM email_logs
      WHERE status = 'queued'
        AND sent_at < NOW() - INTERVAL '30 minutes'
      GROUP BY email_type
      ORDER BY count DESC
      LIMIT 25
    `
  })

  const recentFailures = await safe("recent_failures", async () => {
    return await sql`
      SELECT email_type, COUNT(*)::int AS count, MAX(sent_at) AS last_seen
      FROM email_logs
      WHERE status IN ('failed', 'error')
        AND sent_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY email_type
      ORDER BY count DESC, last_seen DESC
      LIMIT 25
    `
  })

  const campaigns = await safe("campaigns_due", async () => {
    return await sql`
      SELECT id, campaign_name, campaign_type, status, approval_status, scheduled_for, resend_broadcast_id
      FROM admin_email_campaigns
      WHERE scheduled_for IS NOT NULL
        AND scheduled_for <= NOW()
        AND status IN ('scheduled', 'sending', 'failed')
      ORDER BY scheduled_for ASC
      LIMIT 25
    `
  })

  const lines: string[] = []
  lines.push(`# Email performance`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  lines.push(`## Recent failures (by type)`)
  if (recentFailures.ok) {
    if ((recentFailures.value as any[]).length === 0) {
      lines.push(`No failures found.`)
    } else {
      for (const r of recentFailures.value as any[]) {
        lines.push(`- ${r.email_type}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
    }
  } else {
    lines.push(`- Error: ${recentFailures.error}`)
  }
  lines.push(``)

  lines.push(`## Queued backlog (>30m, by type)`)
  if (queuedBacklog.ok) {
    if ((queuedBacklog.value as any[]).length === 0) {
      lines.push(`No queued backlog found.`)
    } else {
      for (const r of queuedBacklog.value as any[]) {
        lines.push(`- ${r.email_type}: ${r.count} (oldest: ${iso(r.oldest)})`)
      }
    }
  } else {
    lines.push(`- Error: ${queuedBacklog.error}`)
  }
  lines.push(``)

  lines.push(`## Sends (by type/status)`)
  if (byType.ok) {
    if ((byType.value as any[]).length === 0) {
      lines.push(`No email logs found.`)
    } else {
      for (const r of byType.value as any[]) {
        lines.push(`- ${r.email_type} / ${r.status}: ${r.count} (last: ${iso(r.last_sent)})`)
      }
    }
  } else {
    lines.push(`- Error: ${byType.error}`)
  }
  lines.push(``)

  lines.push(`## Campaigns due/sending/failed (best-effort)`)
  if (campaigns.ok) {
    if ((campaigns.value as any[]).length === 0) {
      lines.push(`No due/sending/failed campaigns found.`)
    } else {
      for (const c of campaigns.value as any[]) {
        lines.push(
          `- ${c.id}: ${c.campaign_name} (${c.campaign_type}) status=${c.status} approval=${c.approval_status ?? "n/a"} scheduled_for=${c.scheduled_for ? iso(c.scheduled_for) : "n/a"} resend_broadcast_id=${c.resend_broadcast_id || "n/a"}`,
        )
      }
    }
  } else {
    lines.push(`- Error: ${campaigns.error}`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[email-performance] wrote ${path}`)
}

main().catch((err) => {
  console.error("[email-performance] failed:", err)
  process.exitCode = 1
})

