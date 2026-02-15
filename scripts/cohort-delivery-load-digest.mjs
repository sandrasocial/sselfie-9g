/**
 * Cohort delivery load digest.
 *
 * Reads latest stored load snapshot and writes:
 * output/automation/cohort-delivery-load-YYYY-MM-DD.md
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
  const name = `cohort-delivery-load-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function asNumber(v) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

async function main() {
  const now = new Date()
  const path = outPath(now)
  const lines = []
  lines.push("# Cohort delivery load digest")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push("")

  const rows = await sql`
    SELECT payload
    FROM analytics_reports
    WHERE report_type = 'cohort_delivery_load_weekly'
    ORDER BY period_end DESC
    LIMIT 1
  `

  if (!rows.length) {
    lines.push("- No `cohort_delivery_load_weekly` report found yet.")
    lines.push("- Run `/api/cron/cohort-delivery-load-weekly` first.")
    writeFileSync(path, `${lines.join("\n")}\n`, "utf8")
    console.log(`[cohort-delivery-load-digest] wrote ${path}`)
    return
  }

  const payload = rows[0].payload || {}
  const summary = payload.summary || {}
  const monthly = Array.isArray(payload.monthly) ? payload.monthly : []

  lines.push("## 30-day summary")
  lines.push(`- Live hours: ${asNumber(summary.liveHours30d).toFixed(1)}`)
  lines.push(`- Async hours: ${asNumber(summary.asyncHours30d).toFixed(1)}`)
  lines.push(`- Async ratio: ${asNumber(summary.asyncRatio30dPct).toFixed(1)}%`)
  lines.push(`- Target status (>=60% async): ${summary.asyncTargetMet ? "on track" : "off track"}`)
  lines.push("")

  lines.push("## Monthly trend")
  if (!monthly.length) {
    lines.push("- No monthly entries yet.")
  } else {
    for (const row of monthly.slice(0, 6)) {
      lines.push(
        `- ${row.month}: live ${asNumber(row.liveHours).toFixed(1)}h, async ${asNumber(row.asyncHours).toFixed(1)}h, async ratio ${asNumber(row.asyncRatioPct).toFixed(1)}%`,
      )
    }
  }

  writeFileSync(path, `${lines.join("\n")}\n`, "utf8")
  console.log(`[cohort-delivery-load-digest] wrote ${path}`)
}

main().catch((error) => {
  console.error("[cohort-delivery-load-digest] failed:", error)
  process.exitCode = 1
})
