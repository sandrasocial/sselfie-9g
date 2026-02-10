/**
 * Lightweight ops triage for cron + email pipeline health.
 *
 * Read-only: queries DB tables and writes a markdown report.
 */
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

function formatIso(ts: any): string {
  try {
    return new Date(ts).toISOString()
  } catch {
    return String(ts ?? "")
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function reportPath(now = new Date()) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `triage-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(
    now.getHours(),
  )}.md`
  return resolve(dir, name)
}

async function main() {
  const now = new Date()
  const hours = Number(process.env.TRIAGE_WINDOW_HOURS || 2)
  const expiredPrefix = "Expired:"
  const closedPrefix = "Closed:"
  const resetPrefix = "Reset:"

  const failedCrons = await sql`
    SELECT job_name, started_at, error_id
    FROM admin_cron_runs
    WHERE status = 'failed'
      AND started_at > NOW() - ${hours} * INTERVAL '1 hour'
    ORDER BY started_at DESC
    LIMIT 50
  `

  const recentErrors = await sql`
    SELECT id, tool_name, error_message, created_at
    FROM admin_email_errors
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 50
  `

  const emailStats = await sql`
    SELECT email_type, status, COUNT(*)::int AS count, MAX(sent_at) AS last_sent
    FROM email_logs
    WHERE sent_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND NOT (
        status IN ('failed', 'error')
        AND error_message IS NOT NULL
        AND (
          error_message LIKE ${expiredPrefix + "%"}
          OR error_message LIKE ${closedPrefix + "%"}
          OR error_message LIKE ${resetPrefix + "%"}
        )
      )
    GROUP BY email_type, status
    ORDER BY email_type, status
  `

  const emailCleanup = await sql`
    SELECT
      CASE
        WHEN error_message LIKE ${expiredPrefix + "%"} THEN 'expired'
        WHEN error_message LIKE ${closedPrefix + "%"} THEN 'closed_run'
        WHEN error_message LIKE ${resetPrefix + "%"} THEN 'reset'
        ELSE 'other'
      END AS kind,
      COUNT(*)::int AS count,
      MAX(sent_at) AS last_seen
    FROM email_logs
    WHERE sent_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND status IN ('failed', 'error')
      AND error_message IS NOT NULL
      AND (
        error_message LIKE ${expiredPrefix + "%"}
        OR error_message LIKE ${closedPrefix + "%"}
        OR error_message LIKE ${resetPrefix + "%"}
      )
    GROUP BY 1
    ORDER BY count DESC
  `

  const lines: string[] = []
  lines.push(`# Ops triage`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  lines.push(`## Failed crons`)
  if ((failedCrons as any[]).length === 0) {
    lines.push(`No failed cron runs found.`)
  } else {
    for (const row of failedCrons as any[]) {
      lines.push(`- ${row.job_name} @ ${formatIso(row.started_at)} (error_id: ${row.error_id ?? "n/a"})`)
    }
  }
  lines.push(``)

  lines.push(`## Recent admin errors`)
  if ((recentErrors as any[]).length === 0) {
    lines.push(`No admin errors found.`)
  } else {
    for (const row of recentErrors as any[]) {
      const msg = String(row.error_message || "").replace(/\s+/g, " ").slice(0, 240)
      lines.push(`- ${row.tool_name} @ ${formatIso(row.created_at)} (id: ${row.id}): ${msg}`)
    }
  }
  lines.push(``)

  lines.push(`## Email cleanup actions (automated)`)
  if ((emailCleanup as any[]).length === 0) {
    lines.push(`No cleanup actions recorded.`)
  } else {
    for (const row of emailCleanup as any[]) {
      lines.push(`- ${row.kind}: ${row.count} (last: ${formatIso(row.last_seen)})`)
    }
  }
  lines.push(``)

  lines.push(`## Email sends (by type/status)`)
  if ((emailStats as any[]).length === 0) {
    lines.push(`No email sends logged.`)
  } else {
    for (const row of emailStats as any[]) {
      lines.push(`- ${row.email_type} / ${row.status}: ${row.count} (last: ${formatIso(row.last_sent)})`)
    }
  }
  lines.push(``)

  const outPath = reportPath(now)
  writeFileSync(outPath, lines.join("\n"), "utf8")
  console.log(`[triage-hourly] wrote ${outPath}`)
}

main().catch((err) => {
  console.error("[triage-hourly] failed:", err)
  process.exitCode = 1
})
