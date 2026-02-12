/**
 * Revenue sources audit (DB-based, read-only).
 *
 * JS version of scripts/audit-revenue-sources.ts so automations can run it with plain `node`.
 *
 * Writes: output/automation/revenue-audit-YYYY-MM-DD.md
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
  const name = `revenue-audit-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function fmtDate(value) {
  if (!value) return "unknown"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().slice(0, 10)
}

async function hasTable(tableName) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function main() {
  const now = new Date()
  const lines = []
  const stripePaymentsTableExists = await hasTable("stripe_payments")

  lines.push(`# Revenue sources audit`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(``)

  // 1. credit_transactions schema (compact)
  lines.push(`## credit_transactions schema (first 30 columns)`)
  try {
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'credit_transactions'
      ORDER BY ordinal_position
      LIMIT 30
    `
    for (const col of schema) {
      lines.push(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === "YES" ? "(nullable)" : "(required)"}`)
    }
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  // 2. transaction types
  lines.push(`## Credit transactions by type`)
  try {
    const transactionTypes = await sql`
      SELECT transaction_type, COUNT(*)::int as count, COUNT(DISTINCT user_id)::int as unique_users
      FROM credit_transactions
      GROUP BY transaction_type
      ORDER BY count DESC
    `
    for (const row of transactionTypes) {
      lines.push(`- ${row.transaction_type}: ${row.count} transactions, ${row.unique_users} users`)
    }
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  // 3. purchase transactions
  lines.push(`## Purchase transactions (one-time)`)
  try {
    const purchases = await sql`
      SELECT
        COUNT(*)::int as total_purchases,
        COUNT(DISTINCT user_id)::int as unique_buyers,
        SUM(amount)::bigint as total_credits_purchased,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL AND btrim(stripe_payment_id) <> '')::int as with_stripe_id,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')::int as missing_stripe_id,
        COUNT(*) FILTER (
          WHERE (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND COALESCE(reference_id, '') LIKE 'legacy_unlinked_non_stripe%'
        )::int as tagged_legacy_missing,
        COUNT(*) FILTER (
          WHERE (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND COALESCE(reference_id, '') NOT LIKE 'legacy_unlinked_non_stripe%'
        )::int as active_missing_unlinked,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE)::int as test_mode,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE)::int as live_mode,
        COUNT(*) FILTER (WHERE is_test_mode IS NULL)::int as unknown_mode
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
    `
    const p = purchases[0] || {}
    lines.push(`- Total purchases: ${p.total_purchases ?? 0}`)
    lines.push(`- Unique buyers: ${p.unique_buyers ?? 0}`)
    lines.push(`- Total credits purchased: ${p.total_credits_purchased ?? 0}`)
    lines.push(`- With stripe_payment_id: ${p.with_stripe_id ?? 0}`)
    lines.push(`- Missing stripe_payment_id: ${p.missing_stripe_id ?? 0}`)
    lines.push(`- Missing stripe_payment_id (tagged legacy non-stripe): ${p.tagged_legacy_missing ?? 0}`)
    lines.push(`- Missing stripe_payment_id (active unresolved): ${p.active_missing_unlinked ?? 0}`)
    lines.push(`- Test mode rows: ${p.test_mode ?? 0}`)
    lines.push(`- Live mode rows: ${p.live_mode ?? 0}`)
    lines.push(`- Unknown mode rows: ${p.unknown_mode ?? 0}`)

    const recentLinkage = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND (is_test_mode = FALSE OR is_test_mode IS NULL)
            AND stripe_payment_id IS NOT NULL
            AND btrim(stripe_payment_id) <> ''
        )::int AS live_linked_30d,
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND (is_test_mode = FALSE OR is_test_mode IS NULL)
            AND (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
            AND COALESCE(reference_id, '') NOT LIKE 'legacy_unlinked_non_stripe%'
        )::int AS live_missing_30d
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
    `
    const rl = recentLinkage[0] || {}
    lines.push(`- Live purchase linkage (30d): ${rl.live_linked_30d ?? 0} linked / ${rl.live_missing_30d ?? 0} missing`)
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  lines.push(`## Purchase linkage quality`)
  try {
    const missingByProduct = await sql`
      SELECT
        COALESCE(product_type, 'NULL') as product_type,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')::int as missing_stripe_id
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY COALESCE(product_type, 'NULL')
      ORDER BY total DESC
    `
    lines.push(`- Missing stripe_payment_id by product_type:`)
    for (const row of missingByProduct) {
      lines.push(`  - ${row.product_type}: ${row.missing_stripe_id}/${row.total}`)
    }

    const missingByDescription = await sql`
      SELECT
        LEFT(COALESCE(description, 'NULL'), 100) AS description_prefix,
        COUNT(*)::int AS count
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
        AND (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
      GROUP BY LEFT(COALESCE(description, 'NULL'), 100)
      ORDER BY count DESC
      LIMIT 10
    `
    lines.push(`- Top missing stripe_payment_id descriptions:`)
    for (const row of missingByDescription) {
      lines.push(`  - ${row.description_prefix}: ${row.count}`)
    }

    const weeklyLinkage = await sql`
      SELECT
        date_trunc('week', created_at)::date AS week,
        COUNT(*)::int AS purchases,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NOT NULL AND btrim(stripe_payment_id) <> '')::int AS with_stripe_id,
        COUNT(*) FILTER (WHERE stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')::int AS missing_stripe_id
      FROM credit_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12
    `
    lines.push(`- Weekly purchase linkage (latest 12 weeks):`)
    for (const row of weeklyLinkage) {
      lines.push(`  - ${fmtDate(row.week)}: ${row.with_stripe_id}/${row.purchases} linked, ${row.missing_stripe_id} missing`)
    }

    if (stripePaymentsTableExists) {
      const linkageToStripeTable = await sql`
        SELECT
          COUNT(*) FILTER (WHERE ct.stripe_payment_id IS NOT NULL AND btrim(ct.stripe_payment_id) <> '')::int AS with_id,
          COUNT(*) FILTER (
            WHERE ct.stripe_payment_id IS NOT NULL
              AND btrim(ct.stripe_payment_id) <> ''
              AND EXISTS (
                SELECT 1 FROM stripe_payments sp
                WHERE sp.stripe_payment_id = ct.stripe_payment_id
              )
          )::int AS matched,
          COUNT(*) FILTER (
            WHERE ct.stripe_payment_id IS NOT NULL
              AND btrim(ct.stripe_payment_id) <> ''
              AND NOT EXISTS (
                SELECT 1 FROM stripe_payments sp
                WHERE sp.stripe_payment_id = ct.stripe_payment_id
              )
          )::int AS orphan
        FROM credit_transactions ct
        WHERE ct.transaction_type = 'purchase'
      `
      const l = linkageToStripeTable[0] || {}
      lines.push(`- Purchases with stripe_payment_id: ${l.with_id ?? 0}`)
      lines.push(`- Purchases with matching stripe_payments row: ${l.matched ?? 0}`)
      lines.push(`- Purchases with orphan stripe_payment_id: ${l.orphan ?? 0}`)
    }
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  // 4. subscription grants
  lines.push(`## Subscription grant transactions (recurring)`)
  try {
    const subscriptionGrants = await sql`
      SELECT
        COUNT(*)::int as total_grants,
        COUNT(DISTINCT user_id)::int as unique_users,
        SUM(amount)::bigint as total_credits_granted
      FROM credit_transactions
      WHERE transaction_type = 'subscription_grant'
    `
    const sg = subscriptionGrants[0] || {}
    lines.push(`- Total grants: ${sg.total_grants ?? 0}`)
    lines.push(`- Unique users: ${sg.unique_users ?? 0}`)
    lines.push(`- Total credits granted: ${sg.total_credits_granted ?? 0}`)
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  // 5. active subscriptions
  lines.push(`## Active subscriptions`)
  try {
    const activeSubs = await sql`
      SELECT
        COUNT(*)::int as total_active,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE OR is_test_mode IS NULL)::int as live_active,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE)::int as test_active,
        COUNT(DISTINCT user_id)::int as unique_users
      FROM subscriptions
      WHERE status = 'active'
    `
    const a = activeSubs[0] || {}
    lines.push(`- Total active: ${a.total_active ?? 0}`)
    lines.push(`- Live active: ${a.live_active ?? 0}`)
    lines.push(`- Test active: ${a.test_active ?? 0}`)
    lines.push(`- Unique users: ${a.unique_users ?? 0}`)
  } catch (err) {
    lines.push(`- Error: ${err?.message || String(err)}`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[audit-revenue] wrote ${path}`)
}

main().catch((err) => {
  console.error("[audit-revenue] failed:", err)
  process.exitCode = 1
})
