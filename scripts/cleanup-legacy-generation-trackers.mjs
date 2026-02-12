/**
 * Cleanup legacy generation_trackers rows that are stuck indefinitely.
 *
 * Why this exists:
 * - friction-digest monitors generation_trackers for stuck rows.
 * - historical/legacy rows can remain "processing" forever and create false alarms.
 *
 * Usage:
 *   node scripts/cleanup-legacy-generation-trackers.mjs
 *   APPLY=1 node scripts/cleanup-legacy-generation-trackers.mjs
 *
 * Env:
 * - LEGACY_TRACKERS_DAYS_OLD (default: 30)
 * - LEGACY_TRACKERS_LIMIT (default: 500)
 *
 * Output:
 * - output/automation/generation-trackers-cleanup-YYYY-MM-DD-HHMMSS-{dry|apply}.md
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
const APPLY = process.env.APPLY === "1"
const DAYS_OLD = Number(process.env.LEGACY_TRACKERS_DAYS_OLD || 30)
const LIMIT = Number(process.env.LEGACY_TRACKERS_LIMIT || 500)
const STUCK_STATUSES = ["queued", "starting", "processing", "running", "in_progress", "pending"]

function pad2(n) {
  return String(n).padStart(2, "0")
}

function outPath(now, mode) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `generation-trackers-cleanup-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}-${mode}.md`
  return resolve(dir, name)
}

function iso(v) {
  try {
    return new Date(v).toISOString()
  } catch {
    return String(v ?? "")
  }
}

async function main() {
  const now = new Date()
  const lines = []

  const summaryBefore = await sql`
    SELECT status, COUNT(*)::int AS count, MIN(created_at) AS oldest, MAX(created_at) AS newest
    FROM generation_trackers
    WHERE created_at < NOW() - make_interval(days => ${DAYS_OLD})
      AND status = ANY(${STUCK_STATUSES})
    GROUP BY status
    ORDER BY count DESC, status ASC
  `

  const candidates = await sql`
    SELECT id, user_id, status, prediction_id, created_at, updated_at
    FROM generation_trackers
    WHERE created_at < NOW() - make_interval(days => ${DAYS_OLD})
      AND status = ANY(${STUCK_STATUSES})
    ORDER BY created_at ASC
    LIMIT ${LIMIT}
  `

  let updated = []
  if (APPLY && candidates.length > 0) {
    updated = await sql`
      UPDATE generation_trackers
      SET status = 'failed',
          updated_at = NOW()
      WHERE id = ANY(${candidates.map((r) => Number(r.id))})
      RETURNING id, user_id, status, prediction_id, created_at, updated_at
    `
  }

  const [summaryAfter] = await sql`
    SELECT COALESCE(SUM(counts.count), 0)::int AS total
    FROM (
      SELECT COUNT(*)::int AS count
      FROM generation_trackers
      WHERE created_at < NOW() - make_interval(days => ${DAYS_OLD})
        AND status = ANY(${STUCK_STATUSES})
    ) counts
  `

  lines.push("# Generation trackers legacy cleanup")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN (no writes)"}`)
  lines.push(`- Threshold: older than ${DAYS_OLD} day(s)`)
  lines.push(`- Limit: ${LIMIT}`)
  lines.push("")

  lines.push("## Stuck summary before")
  if (summaryBefore.length === 0) {
    lines.push("No legacy stuck rows found.")
  } else {
    for (const row of summaryBefore) {
      lines.push(`- ${row.status}: ${row.count} (oldest: ${iso(row.oldest)}, newest: ${iso(row.newest)})`)
    }
  }
  lines.push("")

  lines.push("## Candidate sample")
  if (candidates.length === 0) {
    lines.push("No candidates.")
  } else {
    for (const row of candidates.slice(0, 40)) {
      lines.push(`- id=${row.id} user=${row.user_id} status=${row.status} created_at=${iso(row.created_at)} prediction_id=${String(row.prediction_id || "n/a")}`)
    }
  }
  lines.push("")

  lines.push("## Apply result")
  lines.push(`- Candidates selected: ${candidates.length}`)
  lines.push(`- Rows updated: ${updated.length}`)
  lines.push(`- Remaining legacy stuck rows: ${Number(summaryAfter?.total || 0)}`)
  lines.push("")

  const path = outPath(now, APPLY ? "apply" : "dry")
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[cleanup-legacy-generation-trackers] wrote ${path}`)
}

main().catch((err) => {
  console.error("[cleanup-legacy-generation-trackers] failed:", err)
  process.exitCode = 1
})
