/**
 * Brand Engine launch digest (daily).
 *
 * Why this exists:
 * - Plain node script for automation reliability (avoids tsx IPC issues on macOS).
 * - Produces a focused sales-ops brief for the Cohort launch sprint.
 *
 * Writes: output/automation/brand-engine-launch-digest-YYYY-MM-DD.md
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

const COHORT_START_DATE = process.env.BRAND_ENGINE_COHORT_START_DATE || "2026-03-16"
const SEAT_CAP = Number(process.env.BRAND_ENGINE_SEAT_CAP || 12)
const TARGET_CALLS_PER_DAY = Number(process.env.BRAND_ENGINE_TARGET_CALLS_PER_DAY || 3)
const WINDOW_HOURS = Number(process.env.BRAND_ENGINE_LAUNCH_REPORT_WINDOW_HOURS || 24)

function pad2(n) {
  return String(n).padStart(2, "0")
}

function outPath(now) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `brand-engine-launch-digest-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}.md`
  return resolve(dir, name)
}

function asInt(v) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function formatEuro(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format((Number(cents || 0) || 0) / 100)
}

function toPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function daysUntilCohort(now) {
  const cohortStart = new Date(`${COHORT_START_DATE}T00:00:00.000Z`)
  const diffMs = cohortStart.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

async function safe(label, q) {
  try {
    return { ok: true, value: await q() }
  } catch (error) {
    return { ok: false, error: `${label}: ${error?.message || String(error)}` }
  }
}

async function main() {
  const now = new Date()
  const reportPath = outPath(now)
  const lines = []
  lines.push("# Brand Engine launch digest")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${WINDOW_HOURS} hour(s)`)
  lines.push(`- Cohort start: ${COHORT_START_DATE}`)
  lines.push(`- Seat cap: ${SEAT_CAP}`)
  lines.push(`- Target calls/day: ${TARGET_CALLS_PER_DAY}`)
  lines.push("")

  const counts = await safe("counts", async () => {
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - ${WINDOW_HOURS} * INTERVAL '1 hour')::int AS applications_24h,
        COUNT(*) FILTER (
          WHERE pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent')
        )::int AS qualified_queue_total,
        COUNT(*) FILTER (WHERE call_booked_at > NOW() - ${WINDOW_HOURS} * INTERVAL '1 hour')::int AS calls_booked_24h,
        COUNT(*) FILTER (WHERE call_booked_at >= date_trunc('day', NOW()) AND call_booked_at < date_trunc('day', NOW()) + INTERVAL '1 day')::int AS calls_booked_today,
        COUNT(*) FILTER (WHERE offer_sent_at > NOW() - ${WINDOW_HOURS} * INTERVAL '1 hour')::int AS offers_sent_24h,
        COUNT(*) FILTER (WHERE closed_at > NOW() - ${WINDOW_HOURS} * INTERVAL '1 hour' AND pipeline_stage = 'closed_won')::int AS closes_won_24h,
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS closes_won_total,
        COALESCE(SUM(cash_collected_cents) FILTER (WHERE closed_at > NOW() - ${WINDOW_HOURS} * INTERVAL '1 hour'), 0)::bigint AS cash_24h_cents,
        COALESCE(SUM(cash_collected_cents), 0)::bigint AS cash_total_cents
      FROM brand_engine_applications
    `
    return rows[0]
  })

  const callStats = await safe("call_stats", async () => {
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE call_booked_at IS NOT NULL)::int AS total_calls,
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS total_wins
      FROM brand_engine_applications
    `
    return rows[0]
  })

  const topQueue = await safe("top_queue", async () => {
    return sql`
      SELECT
        id,
        name,
        email,
        COALESCE(pipeline_stage, 'applied') AS pipeline_stage,
        COALESCE(qualification_score, 0)::int AS qualification_score,
        COALESCE(priority_tier, 'low') AS priority_tier,
        COALESCE(source_channel, 'unknown') AS source_channel,
        created_at
      FROM brand_engine_applications
      WHERE pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent')
      ORDER BY qualification_score DESC, created_at ASC
      LIMIT 10
    `
  })

  lines.push("## Snapshot")
  if (!counts.ok) {
    lines.push(`- Error: ${counts.error}`)
  } else {
    lines.push(`- Applications (24h): ${asInt(counts.value.applications_24h)}`)
    lines.push(`- Qualified queue (total): ${asInt(counts.value.qualified_queue_total)}`)
    lines.push(`- Calls booked (24h): ${asInt(counts.value.calls_booked_24h)}`)
    lines.push(`- Calls booked (today): ${asInt(counts.value.calls_booked_today)}/${TARGET_CALLS_PER_DAY}`)
    lines.push(`- Offers sent (24h): ${asInt(counts.value.offers_sent_24h)}`)
    lines.push(`- Closes won (24h): ${asInt(counts.value.closes_won_24h)}`)
    lines.push(`- Closes won (total): ${asInt(counts.value.closes_won_total)}/${SEAT_CAP}`)
    lines.push(`- Cash collected (24h): ${formatEuro(counts.value.cash_24h_cents)}`)
    lines.push(`- Cash collected (total): ${formatEuro(counts.value.cash_total_cents)}`)
  }
  lines.push("")

  lines.push("## Pace to cohort")
  if (!counts.ok || !callStats.ok) {
    lines.push("- Pace unavailable due to query error.")
  } else {
    const seatsFilled = asInt(counts.value.closes_won_total)
    const seatsRemaining = Math.max(0, SEAT_CAP - seatsFilled)
    const d = daysUntilCohort(now)
    const totalCalls = asInt(callStats.value.total_calls)
    const totalWins = asInt(callStats.value.total_wins)
    const historicalCloseRate = totalCalls > 0 ? totalWins / totalCalls : 0.2
    const closesPerDayNeeded = d > 0 ? seatsRemaining / d : seatsRemaining
    const callsPerDayNeeded = closesPerDayNeeded > 0 ? closesPerDayNeeded / Math.max(historicalCloseRate, 0.1) : 0
    const onTrackCallsToday = asInt(counts.value.calls_booked_today) >= TARGET_CALLS_PER_DAY

    lines.push(`- Days to cohort start: ${d}`)
    lines.push(`- Seats remaining: ${seatsRemaining}`)
    lines.push(`- Historical close rate: ${toPercent(historicalCloseRate)}`)
    lines.push(`- Required closes/day: ${closesPerDayNeeded.toFixed(2)}`)
    lines.push(`- Required calls/day (estimated): ${callsPerDayNeeded.toFixed(2)}`)
    lines.push(`- Calls/day target status: ${onTrackCallsToday ? "on-track" : "below target"}`)
  }
  lines.push("")

  lines.push("## Top qualified queue")
  if (!topQueue.ok) {
    lines.push(`- Error: ${topQueue.error}`)
  } else if (topQueue.value.length === 0) {
    lines.push("- No active qualified leads in queue.")
  } else {
    for (const row of topQueue.value) {
      lines.push(
        `- #${row.id} ${row.name} (${row.email}) | ${row.pipeline_stage} | score ${asInt(
          row.qualification_score,
        )} | ${row.priority_tier} | source ${row.source_channel} | created ${new Date(row.created_at).toISOString()}`,
      )
    }
  }
  lines.push("")

  lines.push("## Actions for today")
  lines.push("1. Book or confirm 3 sales calls from qualified_queue.")
  lines.push("2. Move all completed calls to offer_sent before end of day.")
  lines.push("3. Log every close with cash_collected in admin immediately.")
  lines.push("4. If calls/day below target, trigger one extra IG story CTA to Apply for Cohort.")

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8")
  console.log(`[brand-engine-launch-digest] wrote ${reportPath}`)
}

main().catch((error) => {
  console.error("[brand-engine-launch-digest] failed:", error)
  process.exitCode = 1
})

