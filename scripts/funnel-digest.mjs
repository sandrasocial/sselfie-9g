/**
 * JS version of scripts/funnel-digest.ts.
 *
 * Why this exists:
 * - Codex automations sometimes hit `tsx listen EPERM` (IPC pipe) on macOS.
 * - Plain `node` execution avoids that class of failures.
 *
 * Writes: output/automation/funnel-digest-YYYY-MM-DD.md
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
  const name = `funnel-digest-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function iso(x) {
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
}

async function safeQuery(label, q) {
  try {
    return { ok: true, value: await q() }
  } catch (err) {
    return { ok: false, error: `${label}: ${err?.message || String(err)}` }
  }
}

async function main() {
  const now = new Date()
  const hours = Number(process.env.FUNNEL_DIGEST_WINDOW_HOURS || 24)

  const lines = []
  lines.push(`# Funnel digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  const newUsers = await safeQuery("new_users", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM users
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const newSubs = await safeQuery("new_subscriptions", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        MAX(created_at) AS last_created
      FROM subscriptions
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const abandons = await safeQuery("abandoned_checkouts", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM abandoned_checkouts
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const payments = await safeQuery("stripe_payments", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        SUM(COALESCE(amount_cents, 0))::bigint AS amount_cents_sum,
        MAX(created_at) AS last_created
      FROM stripe_payments
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const creditGrants = await safeQuery("credit_transactions", async () => {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        SUM(COALESCE(amount, 0))::bigint AS amount_sum,
        MAX(created_at) AS last_created
      FROM credit_transactions
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const genTrackers = await safeQuery("generation_trackers", async () => {
    const rows = await sql`
      SELECT status, COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM generation_trackers
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY status
      ORDER BY count DESC
      LIMIT 20
    `
    return rows
  })

  const aiImages = await safeQuery("ai_images", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, MAX(created_at) AS last_created
      FROM ai_images
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  lines.push(`## Acquisition`)
  if (newUsers.ok) {
    lines.push(
      `- New users: ${newUsers.value.count} (last: ${newUsers.value.last_created ? iso(newUsers.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${newUsers.error}`)
  }
  lines.push(``)

  lines.push(`## Checkout and revenue`)
  if (abandons.ok) {
    lines.push(
      `- Abandoned checkouts: ${abandons.value.count} (last: ${abandons.value.last_created ? iso(abandons.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${abandons.error}`)
  }
  if (newSubs.ok) {
    lines.push(
      `- New subscriptions: ${newSubs.value.count} (active: ${newSubs.value.active}) (last: ${newSubs.value.last_created ? iso(newSubs.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${newSubs.error}`)
  }
  if (payments.ok) {
    lines.push(
      `- Stripe payments: ${payments.value.count} (sum_cents: ${payments.value.amount_cents_sum ?? 0}) (last: ${payments.value.last_created ? iso(payments.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${payments.error}`)
  }
  lines.push(``)

  lines.push(`## Credits (all transaction types)`)
  if (creditGrants.ok) {
    lines.push(
      `- Credit transactions: ${creditGrants.value.count} (sum: ${creditGrants.value.amount_sum ?? 0}) (last: ${creditGrants.value.last_created ? iso(creditGrants.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${creditGrants.error}`)
  }
  lines.push(``)

  lines.push(`## Generation`)
  if (genTrackers.ok) {
    lines.push(`Generation trackers by status:`)
    for (const row of genTrackers.value) {
      lines.push(`- ${row.status}: ${row.count} (last: ${row.last_created ? iso(row.last_created) : "n/a"})`)
    }
  } else {
    lines.push(`- Error: ${genTrackers.error}`)
  }
  if (aiImages.ok) {
    lines.push(
      `- AI images created: ${aiImages.value.count} (last: ${aiImages.value.last_created ? iso(aiImages.value.last_created) : "n/a"})`,
    )
  } else {
    lines.push(`- Error: ${aiImages.error}`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[funnel-digest] wrote ${path}`)
}

main().catch((err) => {
  console.error("[funnel-digest] failed:", err)
  process.exitCode = 1
})

