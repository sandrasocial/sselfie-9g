/**
 * ARPU/churn weekly digest.
 *
 * Reads the latest stored analytics report and writes:
 * output/automation/arpu-churn-weekly-YYYY-MM-DD.md
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
  const name = `arpu-churn-weekly-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function asNumber(v) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function formatEuro(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(asNumber(cents) / 100)
}

async function main() {
  const now = new Date()
  const path = outPath(now)
  const lines = []
  lines.push("# ARPU / Churn weekly digest")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push("")

  const rows = await sql`
    SELECT payload, period_start, period_end
    FROM analytics_reports
    WHERE report_type = 'arpu_churn_weekly'
    ORDER BY period_end DESC
    LIMIT 2
  `

  if (!rows.length) {
    lines.push("- No `arpu_churn_weekly` report found yet.")
    lines.push("- Run `/api/cron/arpu-churn-weekly` first.")
    writeFileSync(path, `${lines.join("\n")}\n`, "utf8")
    console.log(`[arpu-churn-weekly-digest] wrote ${path}`)
    return
  }

  const latest = rows[0]
  const previous = rows[1]
  const metrics = latest.payload?.metrics || {}
  const freezeGuard = latest.payload?.freezeGuard || {}
  const previousMetrics = previous?.payload?.metrics || null

  lines.push(`- Window: ${new Date(latest.period_start).toISOString()} -> ${new Date(latest.period_end).toISOString()}`)
  lines.push("")
  lines.push("## Snapshot")
  lines.push(`- Membership MRR: ${formatEuro(metrics.membershipMrrCents)}`)
  lines.push(`- Active memberships: ${asNumber(metrics.activeMemberships)}`)
  lines.push(`- ARPU: €${asNumber(metrics.arpuEuro).toFixed(2)}`)
  lines.push(`- New memberships (30d): ${asNumber(metrics.newMemberships30d)}`)
  lines.push(`- Churned memberships (30d): ${asNumber(metrics.churnedMemberships30d)}`)
  lines.push(`- Churn (30d): ${asNumber(metrics.churn30dPct).toFixed(1)}%`)
  lines.push("")
  lines.push("## Discount freeze guard")
  lines.push(`- Discounted active memberships: ${asNumber(metrics.discountedMembershipsActive)}`)
  lines.push(`- Discounted share: ${asNumber(metrics.discountedSharePct).toFixed(1)}%`)
  lines.push(`- Delta vs last week: ${asNumber(freezeGuard.discountedDeltaVsLastWeek) >= 0 ? "+" : ""}${asNumber(freezeGuard.discountedDeltaVsLastWeek)}`)
  lines.push(`- Freeze status: ${freezeGuard.freezeHolding ? "holding" : "breach risk"}`)
  if (freezeGuard.note) {
    lines.push(`- Note: ${freezeGuard.note}`)
  }

  if (previousMetrics) {
    lines.push("")
    lines.push("## Change vs previous report")
    lines.push(
      `- ARPU delta: €${(asNumber(metrics.arpuEuro) - asNumber(previousMetrics.arpuEuro)).toFixed(2)}`,
    )
    lines.push(
      `- Churn delta: ${(asNumber(metrics.churn30dPct) - asNumber(previousMetrics.churn30dPct)).toFixed(1)}pp`,
    )
    lines.push(
      `- Active membership delta: ${asNumber(metrics.activeMemberships) - asNumber(previousMetrics.activeMemberships)}`,
    )
  }

  writeFileSync(path, `${lines.join("\n")}\n`, "utf8")
  console.log(`[arpu-churn-weekly-digest] wrote ${path}`)
}

main().catch((error) => {
  console.error("[arpu-churn-weekly-digest] failed:", error)
  process.exitCode = 1
})
