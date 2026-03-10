/**
 * Email Marketing Audit — Diagnostics and Kill-Switch Fix
 *
 * Usage:
 *   pnpm exec tsx scripts/email-audit-diagnostics.ts           # Run diagnostics only
 *   pnpm exec tsx scripts/email-audit-diagnostics.ts --fix     # Run diagnostics + set email_sending_enabled=true, email_test_mode=false
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */

import { config } from "dotenv"
import { join } from "path"
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Load .env.local or set DATABASE_URL.")
    process.exit(1)
  }

  const { sql } = await import("../lib/db/client")
  const fixKillSwitch = process.argv.includes("--fix")

  console.log("=== 1. Kill switch & test mode (admin_feature_flags) ===\n")
  try {
    const flags = await sql`
      SELECT key, value, updated_at
      FROM admin_feature_flags
      WHERE key IN ('email_sending_enabled', 'email_test_mode')
    `
    if (flags.length === 0) {
      console.log("  No rows found. email_sending_enabled defaults to FALSE (all sends blocked).")
    } else {
      for (const row of flags as any[]) {
        console.log(`  ${row.key}: ${JSON.stringify(row.value)} (updated: ${row.updated_at ?? "n/a"})`)
      }
    }
  } catch (e: any) {
    console.error("  Error:", e.message)
  }

  console.log("\n=== 2. Email logs (last 7 days) — status & email_type ===\n")
  try {
    const logs = await sql`
      SELECT status, email_type, COUNT(*) AS count, MAX(sent_at) AS latest
      FROM email_logs
      WHERE sent_at > NOW() - INTERVAL '7 days'
      GROUP BY status, email_type
      ORDER BY count DESC
    `
    if (logs.length === 0) {
      console.log("  No rows in last 7 days.")
    } else {
      for (const row of logs as any[]) {
        console.log(`  ${row.status}\t${row.email_type ?? "(null)"}\tcount=${row.count}\tlatest=${row.latest ?? "n/a"}`)
      }
    }
  } catch (e: any) {
    console.error("  Error:", e.message)
  }

  console.log("\n=== 3. freebie_brand_strategies vs brand_strategy_pack ===\n")
  try {
    const [fbs, bsp] = await Promise.all([
      sql`SELECT COUNT(*) AS c, MAX(created_at) AS m FROM freebie_brand_strategies`,
      sql`
        SELECT COUNT(*) AS c FROM subscriptions s
        WHERE s.product_type = 'brand_strategy_pack'
          AND s.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el
            INNER JOIN users u ON LOWER(u.email) = LOWER(el.user_email)
            WHERE u.id::text = s.user_id AND el.email_type LIKE 'nurture-freebie-%'
          )
      `,
    ])
    const fbsRow = (fbs as any[])[0]
    const bspRow = (bsp as any[])[0]
    console.log(`  freebie_brand_strategies: count=${fbsRow?.c ?? 0}, latest created_at=${fbsRow?.m ?? "n/a"}`)
    console.log(`  brand_strategy_pack (active) with no nurture email yet: ${bspRow?.c ?? 0}`)
  } catch (e: any) {
    console.error("  Error:", e.message)
  }

  if (fixKillSwitch) {
    console.log("\n=== Applying kill-switch fix ===\n")
    try {
      const { setEmailSendingEnabled, setEmailTestMode } = await import("../lib/email/email-control")
      await setEmailSendingEnabled(true, "email-audit-diagnostics")
      await setEmailTestMode(false, "email-audit-diagnostics")
      console.log("  Set email_sending_enabled = true, email_test_mode = false.")
    } catch (e: any) {
      console.error("  Error:", e.message)
      process.exit(1)
    }
  }

  console.log("\nDone.")
}

main()
