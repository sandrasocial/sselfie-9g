/**
 * JS version of scripts/cohort-report-weekly.ts.
 *
 * Why this exists:
 * - Codex automations sometimes hit `tsx listen EPERM` (IPC pipe) on macOS.
 * - Plain `node` execution avoids that class of failures.
 *
 * Writes: output/automation/cohorts-weekly-YYYY-MM-DD.md
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
  const name = `cohorts-weekly-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function pct(num, den) {
  if (!den) return "0.0%"
  return `${((num / den) * 100).toFixed(1)}%`
}

async function safe(label, fn) {
  try {
    return { ok: true, value: await fn() }
  } catch (err) {
    return { ok: false, error: `${label}: ${err?.message || String(err)}` }
  }
}

async function main() {
  const now = new Date()
  const weeks = Number(process.env.COHORT_WEEKS || 8)

  const cohorts = await safe("cohorts", async () => {
    return await sql`
      WITH base AS (
        SELECT
          id::text AS user_id,
          stack_auth_user_id::text AS stack_auth_user_id,
          created_at,
          date_trunc('week', created_at) AS cohort_week,
          last_login_at
        FROM users
        WHERE created_at >= NOW() - (${weeks} * 7) * INTERVAL '1 day'
      ),
      keys AS (
        SELECT
          b.user_id,
          b.created_at,
          b.cohort_week,
          b.last_login_at,
          k.key
        FROM base b
        CROSS JOIN LATERAL unnest(
          array_remove(ARRAY[b.user_id, b.stack_auth_user_id], NULL)
        ) AS k(key)
      ),
      selfie AS (
        SELECT DISTINCT k.user_id
        FROM selfie_uploads su
        JOIN keys k ON k.key = su.user_id::text
        UNION
        SELECT DISTINCT k.user_id
        FROM user_avatar_images uai
        JOIN keys k ON k.key = uai.user_id::text
        WHERE COALESCE(uai.is_active, TRUE) = TRUE
      ),
      planner AS (
        SELECT DISTINCT k.user_id
        FROM feed_posts fp
        JOIN keys k ON k.key = fp.user_id::text
      ),
      trained AS (
        SELECT DISTINCT k.user_id
        FROM user_models um
        JOIN keys k ON k.key = um.user_id::text
      ),
      gen1 AS (
        SELECT DISTINCT k.user_id
        FROM ai_images a
        JOIN keys k ON k.key = a.user_id::text
        UNION
        SELECT DISTINCT k.user_id
        FROM generation_trackers gt
        JOIN keys k ON k.key = gt.user_id::text
      ),
      paid AS (
        SELECT DISTINCT k.user_id
        FROM subscriptions s
        JOIN keys k ON k.key = s.user_id::text
        WHERE s.status = 'active'
      ),
      d1_activity AS (
        SELECT DISTINCT b.user_id
        FROM base b
        WHERE EXISTS (
          SELECT 1
          FROM feed_posts fp
          WHERE fp.user_id::text IN (b.user_id, b.stack_auth_user_id)
            AND fp.created_at >= b.created_at
            AND fp.created_at < b.created_at + INTERVAL '24 hours'
        )
        OR EXISTS (
          SELECT 1
          FROM ai_images ai
          WHERE ai.user_id::text IN (b.user_id, b.stack_auth_user_id)
            AND ai.created_at >= b.created_at
            AND ai.created_at < b.created_at + INTERVAL '24 hours'
        )
        OR EXISTS (
          SELECT 1
          FROM user_models um
          WHERE um.user_id::text IN (b.user_id, b.stack_auth_user_id)
            AND um.created_at >= b.created_at
            AND um.created_at < b.created_at + INTERVAL '24 hours'
        )
        OR EXISTS (
          SELECT 1
          FROM generation_trackers gt
          WHERE gt.user_id::text IN (b.user_id, b.stack_auth_user_id)
            AND gt.created_at >= b.created_at
            AND gt.created_at < b.created_at + INTERVAL '24 hours'
        )
      )
      SELECT
        to_char(cohort_week, 'YYYY-MM-DD') AS cohort_week,
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM selfie))::int AS uploaded_selfies,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM planner))::int AS planner_started,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM trained))::int AS trained_model,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM gen1))::int AS generated_any,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM paid))::int AS paid_active,
        COUNT(*) FILTER (WHERE last_login_at IS NOT NULL AND last_login_at >= created_at + INTERVAL '24 hours')::int AS retained_d1_proxy,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM d1_activity))::int AS retained_d1_activity_proxy
      FROM base
      GROUP BY cohort_week
      ORDER BY cohort_week DESC
    `
  })

  const lines = []
  lines.push(`# Weekly cohorts`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Weeks: ${weeks}`)
  lines.push(``)

  if (!cohorts.ok) {
    lines.push(`Error: ${cohorts.error}`)
  } else {
    lines.push(`Cohort week | Signups | Selfies | Planner started | Trained | Generated | Paid active | D1 retained (login proxy) | D1 active (product proxy)`)
    lines.push(`---|---:|---:|---:|---:|---:|---:|---:|---:`)
    for (const r of cohorts.value) {
      const signups = Number(r.signups || 0)
      const selfies = Number(r.uploaded_selfies || 0)
      const planner = Number(r.planner_started || 0)
      const trained = Number(r.trained_model || 0)
      const gen = Number(r.generated_any || 0)
      const paid = Number(r.paid_active || 0)
      const d1 = Number(r.retained_d1_proxy || 0)
      const d1Activity = Number(r.retained_d1_activity_proxy || 0)

      lines.push(
        `${r.cohort_week} | ${signups} | ${selfies} (${pct(selfies, signups)}) | ${planner} (${pct(planner, signups)}) | ${trained} (${pct(trained, signups)}) | ${gen} (${pct(gen, signups)}) | ${paid} (${pct(paid, signups)}) | ${d1} (${pct(d1, signups)}) | ${d1Activity} (${pct(d1Activity, signups)})`,
      )
    }
  }

  lines.push(``)
  lines.push(`Notes:`)
  lines.push(`- "Generated" is best-effort: ai_images or generation_trackers existence.`)
  lines.push(`- "D1 retained (login proxy)" uses users.last_login_at and may be sparse if login tracking is not populated.`)
  lines.push(`- "D1 active (product proxy)" uses first-24h activity in feed_posts/ai_images/user_models/generation_trackers.`)
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[cohort-report-weekly] wrote ${path}`)
}

main().catch((err) => {
  console.error("[cohort-report-weekly] failed:", err)
  process.exitCode = 1
})
