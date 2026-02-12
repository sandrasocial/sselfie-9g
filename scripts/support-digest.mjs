/**
 * JS version of scripts/support-digest.ts.
 *
 * Why this exists:
 * - Codex automations sometimes hit `tsx listen EPERM` (IPC pipe) on macOS.
 * - Plain `node` execution avoids that class of failures.
 *
 * Output: output/automation/support-digest-YYYY-MM-DD.md
 */
import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

const sql = neon(process.env.DATABASE_URL)

function pad2(n) {
  return String(n).padStart(2, "0")
}

function iso(x) {
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
}

function outPath(now) {
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
    SELECT status, COUNT(*)::int AS count
    FROM subscriptions
    WHERE COALESCE(is_test_mode, FALSE) = FALSE
    GROUP BY status
    ORDER BY count DESC
  `

  const subscriptionUpdateTouches = await sql`
    SELECT
      DATE_TRUNC('minute', updated_at) AS minute_bucket,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'canceled')::int AS canceled_count,
      COUNT(*) FILTER (WHERE status = 'past_due')::int AS past_due_count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count
    FROM subscriptions
    WHERE updated_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND COALESCE(is_test_mode, FALSE) = FALSE
    GROUP BY minute_bucket
    ORDER BY minute_bucket DESC
    LIMIT 5
  `

  const atRiskSubscriptionTouches = await sql`
    SELECT user_id, plan, status, updated_at, stripe_subscription_id, product_type
    FROM subscriptions
    WHERE updated_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND COALESCE(is_test_mode, FALSE) = FALSE
      AND status IN ('canceled', 'past_due')
    ORDER BY updated_at DESC
    LIMIT 20
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
      AND (
        user_email IS NULL
        OR (
          LOWER(user_email) NOT LIKE '%@playwright.test%'
          AND LOWER(user_email) NOT LIKE '%@example.com%'
          AND user_email NOT LIKE '{%'
          AND user_email NOT LIKE '[%'
        )
      )
    GROUP BY email_type, status
    ORDER BY count DESC
    LIMIT 50
  `

  const testEmailStats = await sql`
    SELECT email_type, status, COUNT(*)::int AS count, MAX(sent_at) AS last_sent
    FROM email_logs
    WHERE sent_at > NOW() - ${hours} * INTERVAL '1 hour'
      AND user_email IS NOT NULL
      AND (
        LOWER(user_email) LIKE '%@playwright.test%'
        OR LOWER(user_email) LIKE '%@example.com%'
        OR user_email LIKE '{%'
        OR user_email LIKE '[%'
      )
    GROUP BY email_type, status
    ORDER BY count DESC
    LIMIT 25
  `

  const lines = []
  lines.push(`# Support digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  lines.push(`## New users`)
  lines.push(`Count: ${newUsers.length}`)
  for (const u of newUsers) {
    lines.push(`- ${u.email || "(no email)"} (plan: ${u.plan || "n/a"}) created: ${iso(u.created_at)} last_login: ${u.last_login_at ? iso(u.last_login_at) : "n/a"}`)
  }
  lines.push(``)

  lines.push(`## Subscription health`)
  lines.push(`Current snapshot (non-test):`)
  for (const s of subscriptionChanges) {
    lines.push(`- ${s.status}: ${s.count}`)
  }
  lines.push(``)

  const touchesTotal = subscriptionUpdateTouches.reduce((sum, row) => sum + Number(row.count || 0), 0)
  const likelyBulkReconcile =
    subscriptionUpdateTouches.length > 0 &&
    Number(subscriptionUpdateTouches[0].count || 0) === touchesTotal &&
    touchesTotal >= 20
  lines.push(`Recent sync touches (updated_at writes, not direct churn events): ${touchesTotal}`)
  for (const t of subscriptionUpdateTouches) {
    lines.push(
      `- minute=${iso(t.minute_bucket)} total=${t.count} (active=${t.active_count}, past_due=${t.past_due_count}, canceled=${t.canceled_count})`,
    )
  }
  lines.push(``)

  if (likelyBulkReconcile) {
    lines.push(
      `At-risk rows touched in window: ${atRiskSubscriptionTouches.length} (bulk reconcile pattern detected; treat as state refresh, not churn spike).`,
    )
  } else {
    lines.push(`At-risk subscription rows touched in window (status canceled/past_due): ${atRiskSubscriptionTouches.length}`)
    for (const s of atRiskSubscriptionTouches) {
      lines.push(
        `- user_id=${s.user_id} plan=${s.plan || "n/a"} product=${s.product_type || "n/a"} status=${s.status} updated=${iso(s.updated_at)} stripe_sub=${s.stripe_subscription_id || "n/a"}`,
      )
    }
  }
  lines.push(``)

  lines.push(`## Cron failures`)
  if (cronFailures.length === 0) {
    lines.push(`No failed cron runs found.`)
  } else {
    for (const f of cronFailures) {
      lines.push(`- ${f.job_name} @ ${iso(f.started_at)} (error_id: ${f.error_id ?? "n/a"})`)
    }
  }
  lines.push(``)

  lines.push(`## Top admin errors`)
  if (topErrors.length === 0) {
    lines.push(`No admin errors found.`)
  } else {
    for (const e of topErrors) {
      lines.push(`- ${e.tool_name}: ${e.count} (last: ${iso(e.last_seen)})`)
    }
  }
  lines.push(``)

  lines.push(`## Generation-related admin errors`)
  if (genErrors.length === 0) {
    lines.push(`No generation-related errors found.`)
  } else {
    for (const e of genErrors) {
      const msg = String(e.error_message || "").replace(/\s+/g, " ").slice(0, 240)
      lines.push(`- ${e.tool_name} @ ${iso(e.created_at)} (id: ${e.id}): ${msg}`)
    }
  }
  lines.push(``)

  lines.push(`## Email logs (by type/status)`)
  if (emailStats.length === 0) {
    lines.push(`No non-test email logs found.`)
  } else {
    for (const row of emailStats) {
      lines.push(`- ${row.email_type} / ${row.status}: ${row.count} (last: ${iso(row.last_sent)})`)
    }
  }
  lines.push(``)

  lines.push(`## Email logs (test/synthetic addresses)`)
  if (testEmailStats.length === 0) {
    lines.push(`No test/synthetic email logs found.`)
  } else {
    for (const row of testEmailStats) {
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
