/**
 * Subscription data audit (DB-based, read-only).
 *
 * JS version of scripts/audit-subscription-data.ts so automations can run it with plain `node`.
 *
 * Writes: output/automation/subscription-audit-YYYY-MM-DD.md
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

function outPath(now) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `subscription-audit-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

async function main() {
  const now = new Date()
  const lines = []

  lines.push(`# Subscription data audit`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(``)

  const totalUsers = await sql`SELECT COUNT(*)::int AS count FROM users`
  lines.push(`## Users`)
  lines.push(`- Total users: ${totalUsers[0]?.count ?? 0}`)

  try {
    const usersByTestMode = await sql`
      SELECT is_test_mode, COUNT(*)::int AS count
      FROM users
      GROUP BY is_test_mode
      ORDER BY is_test_mode
    `
    lines.push(`- Users by test mode:`)
    for (const row of usersByTestMode) {
      lines.push(`  - ${(row.is_test_mode ? "test" : "live")}: ${row.count}`)
    }
  } catch {
    lines.push(`- Users by test mode: not available (users.is_test_mode missing)`)
  }

  const totalSubs = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`
  lines.push(``)
  lines.push(`## Subscriptions`)
  lines.push(`- Total subscriptions: ${totalSubs[0]?.count ?? 0}`)

  try {
    const subsByStatus = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `
    lines.push(`- Subscriptions by status:`)
    for (const row of subsByStatus) {
      lines.push(`  - ${row.status || "NULL"}: ${row.count}`)
    }
  } catch {
    lines.push(`- Subscriptions by status: not available (subscriptions.status missing)`)
  }

  try {
    const subsByTestMode = await sql`
      SELECT is_test_mode, COUNT(*)::int AS count
      FROM subscriptions
      GROUP BY is_test_mode
      ORDER BY is_test_mode
    `
    lines.push(`- Subscriptions by test mode:`)
    for (const row of subsByTestMode) {
      lines.push(`  - ${(row.is_test_mode ? "test" : "live")}: ${row.count}`)
    }
  } catch {
    lines.push(`- Subscriptions by test mode: not available (subscriptions.is_test_mode missing)`)
  }

  try {
    const cancelled = await sql`SELECT COUNT(*)::int AS count FROM subscriptions WHERE cancelled_at IS NOT NULL`
    lines.push(`- Cancelled subscriptions: ${cancelled[0]?.count ?? 0}`)
  } catch {
    lines.push(`- Cancelled subscriptions: not available (subscriptions.cancelled_at missing)`)
  }

  try {
    const activeStatus = await sql`
      SELECT is_active, COUNT(*)::int AS count
      FROM subscriptions
      GROUP BY is_active
      ORDER BY is_active
    `
    lines.push(`- Subscriptions by is_active:`)
    for (const row of activeStatus) {
      lines.push(`  - ${(row.is_active ? "active" : "inactive")}: ${row.count}`)
    }
  } catch {
    lines.push(`- Subscriptions by is_active: not available (subscriptions.is_active missing)`)
  }

  const withStripeId = await sql`
    SELECT COUNT(*)::int AS count
    FROM subscriptions
    WHERE stripe_subscription_id IS NOT NULL
  `
  lines.push(`- Subscriptions with Stripe subscription id: ${withStripeId[0]?.count ?? 0}`)

  const usersWithSubs = await sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM subscriptions`
  lines.push(`- Unique users with any subscription row: ${usersWithSubs[0]?.count ?? 0}`)
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[audit-subscriptions] wrote ${path}`)
}

main().catch((err) => {
  console.error("[audit-subscriptions] failed:", err)
  process.exitCode = 1
})

