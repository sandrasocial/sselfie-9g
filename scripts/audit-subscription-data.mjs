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

async function getColumns(tableName) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `
  return new Set(rows.map((r) => r.column_name))
}

async function main() {
  const now = new Date()
  const lines = []
  const userCols = await getColumns("users")
  const subCols = await getColumns("subscriptions")

  lines.push(`# Subscription data audit`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(``)

  const totalUsers = await sql`SELECT COUNT(*)::int AS count FROM users`
  lines.push(`## Users`)
  lines.push(`- Total users: ${totalUsers[0]?.count ?? 0}`)

  if (userCols.has("is_test_mode")) {
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
  } else {
    lines.push(`- Users by test mode: unavailable (users.is_test_mode not in schema)`)
  }

  const totalSubs = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`
  lines.push(``)
  lines.push(`## Subscriptions`)
  lines.push(`- Total subscriptions: ${totalSubs[0]?.count ?? 0}`)

  if (subCols.has("status")) {
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
  } else {
    lines.push(`- Subscriptions by status: unavailable (subscriptions.status not in schema)`)
  }

  if (subCols.has("is_test_mode")) {
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
  } else {
    lines.push(`- Subscriptions by test mode: unavailable (subscriptions.is_test_mode not in schema)`)
  }

  if (subCols.has("cancelled_at")) {
    const cancelled = await sql`SELECT COUNT(*)::int AS count FROM subscriptions WHERE cancelled_at IS NOT NULL`
    lines.push(`- Cancelled subscriptions (cancelled_at): ${cancelled[0]?.count ?? 0}`)
  } else if (subCols.has("canceled_at")) {
    const canceled = await sql`SELECT COUNT(*)::int AS count FROM subscriptions WHERE canceled_at IS NOT NULL`
    lines.push(`- Canceled subscriptions (canceled_at): ${canceled[0]?.count ?? 0}`)
  } else if (subCols.has("status")) {
    const canceledByStatus = await sql`
      SELECT COUNT(*)::int AS count
      FROM subscriptions
      WHERE status = 'canceled'
    `
    lines.push(`- Canceled subscriptions (status='canceled' proxy): ${canceledByStatus[0]?.count ?? 0}`)
  } else {
    lines.push(`- Canceled subscriptions: unavailable (no canceled/cancelled column and no status column)`)
  }

  if (subCols.has("is_active")) {
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
  } else if (subCols.has("status")) {
    const activeProxy = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status <> 'active' OR status IS NULL)::int AS inactive_or_other
      FROM subscriptions
    `
    const row = activeProxy[0] || {}
    lines.push(`- Subscriptions by active proxy (derived from status):`)
    lines.push(`  - active (status='active'): ${row.active ?? 0}`)
    lines.push(`  - inactive/other: ${row.inactive_or_other ?? 0}`)
  } else {
    lines.push(`- Subscriptions by active status: unavailable (subscriptions.is_active and status missing)`)
  }

  if (subCols.has("stripe_subscription_id")) {
    const stripeIdCoverage = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL AND btrim(stripe_subscription_id) <> '')::int AS with_id,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '')::int AS missing_id
      FROM subscriptions
    `
    const cov = stripeIdCoverage[0] || {}
    lines.push(`- Subscriptions with Stripe subscription id: ${cov.with_id ?? 0}/${cov.total ?? 0}`)
    lines.push(`- Subscriptions missing Stripe subscription id: ${cov.missing_id ?? 0}`)

    const missingByProduct = await sql`
      SELECT
        COALESCE(product_type, 'NULL') AS product_type,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '')::int AS missing_id
      FROM subscriptions
      GROUP BY COALESCE(product_type, 'NULL')
      ORDER BY total DESC
    `
    lines.push(`- Missing Stripe id by product_type:`)
    for (const row of missingByProduct) {
      lines.push(`  - ${row.product_type}: ${row.missing_id}/${row.total}`)
    }

    if (subCols.has("status")) {
      const highRisk = await sql`
        SELECT
          COUNT(*) FILTER (
            WHERE product_type = 'sselfie_studio_membership'
              AND status = 'active'
              AND (stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '')
          )::int AS active_membership_missing_id,
          COUNT(*) FILTER (
            WHERE product_type = 'paid_blueprint'
              AND status = 'active'
              AND (stripe_subscription_id IS NULL OR btrim(stripe_subscription_id) = '')
          )::int AS active_paid_blueprint_missing_id
        FROM subscriptions
      `
      const risk = highRisk[0] || {}
      lines.push(`- Active membership rows missing Stripe id (high risk): ${risk.active_membership_missing_id ?? 0}`)
      lines.push(`- Active paid_blueprint rows missing Stripe id (often expected for one-time entitlement rows): ${risk.active_paid_blueprint_missing_id ?? 0}`)
    }
  } else {
    lines.push(`- Stripe subscription id coverage: unavailable (subscriptions.stripe_subscription_id not in schema)`)
  }

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
