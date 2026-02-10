/**
 * DB inventory (read-only).
 *
 * Writes a compact markdown report of tables + key columns so you can:
 * - understand what data exists
 * - detect schema drift that breaks automations
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
  const name = `db-inventory-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

type Col = { column_name: string; data_type: string }

async function getColumns(table: string): Promise<Col[]> {
  return await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
    ORDER BY ordinal_position
  `
}

function pickColumns(cols: Col[], max = 28): string[] {
  return cols
    .slice(0, max)
    .map((c) => `${c.column_name} (${c.data_type})`)
}

async function main() {
  const now = new Date()

  const tables: { table_name: string }[] = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

  const keyTables = [
    // Funnel / revenue / identity
    "users",
    "subscriptions",
    "stripe_payments",
    "abandoned_checkouts",
    "sessions",
    // Credits
    "user_credits",
    "credit_transactions",
    "subscription_credit_grants",
    // Generation
    "generation_trackers",
    "ai_images",
    "pro_generations",
    "user_feed_generations_v2",
    // Training/selfies
    "training_runs",
    "selfie_uploads",
    "user_models",
    // Email / cron / errors
    "admin_cron_runs",
    "admin_email_campaigns",
    "email_logs",
    "email_events",
    "email_captures",
    "admin_email_errors",
    "webhook_errors",
    // Feedback/support-ish
    "feedback",
    "feedback_bug_analysis",
    "feedback_ai_responses",
  ]

  const lines: string[] = []
  lines.push(`# DB inventory`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Tables: ${tables.length}`)
  lines.push(``)

  lines.push(`## Key tables`)
  for (const t of keyTables) {
    try {
      const cols = await getColumns(t)
      if (cols.length === 0) {
        lines.push(`- ${t}: not found`)
        continue
      }
      lines.push(`- ${t}: ${cols.length} columns`)
      for (const c of pickColumns(cols, 22)) {
        lines.push(`  - ${c}`)
      }
      if (cols.length > 22) lines.push(`  - ...`)
    } catch (err: any) {
      lines.push(`- ${t}: error reading columns: ${err?.message || String(err)}`)
    }
  }
  lines.push(``)

  lines.push(`## All tables`)
  for (const row of tables) {
    lines.push(`- ${row.table_name}`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[db-inventory] wrote ${path}`)
}

main().catch((err) => {
  console.error("[db-inventory] failed:", err)
  process.exitCode = 1
})
