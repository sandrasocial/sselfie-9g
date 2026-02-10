/**
 * Weekly cohort report (DB-based, read-only).
 *
 * Cohorts by signup week:
 * - signups
 * - uploaded selfies (selfie_uploads)
 * - trained a model (training_runs)
 * - first generation (ai_images OR generation_trackers)
 * - started membership (subscriptions active)
 * - day-1 retention proxy (last_login_at >= created_at + 24h)
 *
 * Writes: output/automation/cohorts-weekly-YYYY-MM-DD.md
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
  const name = `cohorts-weekly-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function pct(num: number, den: number) {
  if (!den) return "0.0%"
  return `${((num / den) * 100).toFixed(1)}%`
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() }
  } catch (err: any) {
    return { ok: false, error: `${label}: ${err?.message || String(err)}` }
  }
}

async function main() {
  const now = new Date()
  const weeks = Number(process.env.COHORT_WEEKS || 8)

  // Cohort anchor: users.created_at
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
      ),
      trained AS (
        SELECT DISTINCT k.user_id
        FROM user_models um
        JOIN keys k ON k.key = um.user_id::text
      ),
      gen1 AS (
        -- Prefer ai_images as "proof of output"; fall back to generation_trackers.
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
      )
      SELECT
        to_char(cohort_week, 'YYYY-MM-DD') AS cohort_week,
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM selfie))::int AS uploaded_selfies,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM trained))::int AS trained_model,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM gen1))::int AS generated_any,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM paid))::int AS paid_active,
        COUNT(*) FILTER (WHERE last_login_at IS NOT NULL AND last_login_at >= created_at + INTERVAL '24 hours')::int AS retained_d1_proxy
      FROM base
      GROUP BY cohort_week
      ORDER BY cohort_week DESC
    `
  })

  const lines: string[] = []
  lines.push(`# Weekly cohorts`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Weeks: ${weeks}`)
  lines.push(``)

  if (!cohorts.ok) {
    lines.push(`Error: ${cohorts.error}`)
  } else {
    lines.push(`Cohort week | Signups | Selfies | Trained | Generated | Paid active | D1 retained (proxy)`)
    lines.push(`---|---:|---:|---:|---:|---:|---:`)
    for (const r of cohorts.value as any[]) {
      const signups = Number(r.signups || 0)
      const selfies = Number(r.uploaded_selfies || 0)
      const trained = Number(r.trained_model || 0)
      const gen = Number(r.generated_any || 0)
      const paid = Number(r.paid_active || 0)
      const d1 = Number(r.retained_d1_proxy || 0)

      lines.push(
        `${r.cohort_week} | ${signups} | ${selfies} (${pct(selfies, signups)}) | ${trained} (${pct(trained, signups)}) | ${gen} (${pct(gen, signups)}) | ${paid} (${pct(paid, signups)}) | ${d1} (${pct(d1, signups)})`,
      )
    }
  }

  lines.push(``)
  lines.push(`Notes:`)
  lines.push(`- "Generated" is best-effort: ai_images or generation_trackers existence.`)
  lines.push(`- "D1 retained" is a proxy using users.last_login_at.`)
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[cohort-report-weekly] wrote ${path}`)
}

main().catch((err) => {
  console.error("[cohort-report-weekly] failed:", err)
  process.exitCode = 1
})
