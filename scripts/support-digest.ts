/**
 * Daily support digest (read-only).
 *
 * Purpose: give you a single place to see what support/reliability work is needed.
 * Output: output/automation/support-digest-YYYY-MM-DD.md
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

function iso(x: any) {
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
}

function outPath(now: Date) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `support-digest-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

async function main() {
  const now = new Date()
  const hours = Number(process.env.SUPPORT_DIGEST_WINDOW_HOURS || 24)

  const newUsers = await sql`
    SELECT id, email, plan, created_at, last_login_at
    FROM users
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 50
  `

  const subscriptionChanges = await sql`
    SELECT user_id, plan, status, created_at, updated_at, stripe_subscription_id, product_type
    FROM subscriptions
    WHERE updated_at > NOW() - ${hours} * INTERVAL '1 hour'
    ORDER BY updated_at DESC
    LIMIT 50
  `

  const cronFailures = await sql`
    SELECT job_name, started_at, error_id
    FROM admin_cron_runs
    WHERE status = 'failed'
      AND started_at > NOW() - ${hours} * INTERVAL '1 hour'
    ORDER BY started_at DESC
    LIMIT 50
  `

  const topErrors = await sql`
    SELECT tool_name, COUNT(*)::int AS count, MAX(created_at) AS last_seen
    FROM admin_email_errors
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    GROUP BY tool_name
    ORDER BY count DESC, last_seen DESC
    LIMIT 25
  `

  const genErrors = await sql`
    SELECT id, tool_name, error_message, created_at
    FROM admin_email_errors
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND (
        tool_name ILIKE '%replicate%'
        OR tool_name ILIKE '%generation%'
        OR tool_name ILIKE '%nano%'
        OR tool_name ILIKE '%stella%'
        OR tool_name ILIKE '%maya%'
      )
    ORDER BY created_at DESC
    LIMIT 25
  `

  const emailStats = await sql`
    SELECT email_type, status, COUNT(*)::int AS count, MAX(sent_at) AS last_sent
    FROM email_logs
    WHERE sent_at > NOW() - ${hours} * INTERVAL '1 hour'
    GROUP BY email_type, status
    ORDER BY count DESC
    LIMIT 50
  `

  const lines: string[] = []
  lines.push(`# Support digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  lines.push(`## New users`)
  lines.push(`Count: ${(newUsers as any[]).length}`)
  for (const u of newUsers as any[]) {
    lines.push(`- ${u.email || "(no email)"} (plan: ${u.plan || "n/a"}) created: ${iso(u.created_at)} last_login: ${u.last_login_at ? iso(u.last_login_at) : "n/a"}`)
  }
  lines.push(``)

  lines.push(`## Subscription updates`)
  lines.push(`Count: ${(subscriptionChanges as any[]).length}`)
  for (const s of subscriptionChanges as any[]) {
    lines.push(`- user_id=${s.user_id} plan=${s.plan || "n/a"} product=${s.product_type || "n/a"} status=${s.status} updated=${iso(s.updated_at)} stripe_sub=${s.stripe_subscription_id || "n/a"}`)
  }
  lines.push(``)

  lines.push(`## Cron failures`)
  if ((cronFailures as any[]).length === 0) {
    lines.push(`No failed cron runs found.`)
  } else {
    for (const f of cronFailures as any[]) {
      lines.push(`- ${f.job_name} @ ${iso(f.started_at)} (error_id: ${f.error_id ?? "n/a"})`)
    }
  }
  lines.push(``)

  lines.push(`## Top admin errors`)
  if ((topErrors as any[]).length === 0) {
    lines.push(`No admin errors found.`)
  } else {
    for (const e of topErrors as any[]) {
      lines.push(`- ${e.tool_name}: ${e.count} (last: ${iso(e.last_seen)})`)
    }
  }
  lines.push(``)

  lines.push(`## Generation-related admin errors`)
  if ((genErrors as any[]).length === 0) {
    lines.push(`No generation-related errors found.`)
  } else {
    for (const e of genErrors as any[]) {
      const msg = String(e.error_message || "").replace(/\s+/g, " ").slice(0, 240)
      lines.push(`- ${e.tool_name} @ ${iso(e.created_at)} (id: ${e.id}): ${msg}`)
    }
  }
  lines.push(``)

  lines.push(`## Email logs (by type/status)`)
  if ((emailStats as any[]).length === 0) {
    lines.push(`No email logs found.`)
  } else {
    for (const row of emailStats as any[]) {
      lines.push(`- ${row.email_type} / ${row.status}: ${row.count} (last: ${iso(row.last_sent)})`)
    }
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[support-digest] wrote ${path}`)
}

main().catch((err) => {
  console.error("[support-digest] failed:", err)
  process.exitCode = 1
})
