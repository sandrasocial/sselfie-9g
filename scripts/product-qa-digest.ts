/**
 * Product QA daily digest (read-only).
 *
 * Focus:
 * - Activation health (signup -> selfie -> first generation)
 * - Feature usage (Brand Engine, Maya, Feed Planner, Gallery, Academy)
 * - Reliability (cron/admin errors, bounces, stuck generation backlogs)
 *
 * Writes: output/automation/product-qa-daily-YYYY-MM-DD.md
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
  const name = `product-qa-daily-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
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
  const hours = Number(process.env.PRODUCT_QA_DAILY_WINDOW_HOURS || 24)

  const newUsers = await safe("new_users", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `
    return rows[0]
  })

  const activation = await safe("activation", async () => {
    const rows = await sql`
      WITH base AS (
        SELECT id::text AS user_id, stack_auth_user_id::text AS stack_auth_user_id
        FROM users
        WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      ),
      keys AS (
        SELECT b.user_id, k.key
        FROM base b
        CROSS JOIN LATERAL unnest(array_remove(ARRAY[b.user_id, b.stack_auth_user_id], NULL)) AS k(key)
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
      generated AS (
        SELECT DISTINCT k.user_id
        FROM ai_images ai
        JOIN keys k ON k.key = ai.user_id::text
        UNION
        SELECT DISTINCT k.user_id
        FROM generation_trackers gt
        JOIN keys k ON k.key = gt.user_id::text
      )
      SELECT
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM selfie))::int AS users_with_selfies,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM generated))::int AS users_with_generation
      FROM base
    `
    return rows[0]
  })

  const featureUsage = await safe("feature_usage", async () => {
    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM brand_engine_applications WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS brand_engine_applications,
        (SELECT COUNT(*)::int FROM ai_images WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS maya_photos,
        (SELECT COUNT(*)::int FROM generated_videos WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS maya_videos,
        (SELECT COUNT(*)::int FROM feed_layouts WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS feeds_created,
        (SELECT COUNT(*)::int FROM feed_posts WHERE updated_at > NOW() - ${hours} * INTERVAL '1 hour' AND image_url IS NOT NULL) AS feed_posts_generated,
        (SELECT COUNT(*)::int FROM analytics_events WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour' AND event_name = 'academy_opened') AS academy_opens
    `
    return rows[0]
  })

  const reliability = await safe("reliability", async () => {
    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM admin_cron_runs WHERE status = 'failed' AND started_at > NOW() - ${hours} * INTERVAL '1 hour') AS failed_crons,
        (SELECT COUNT(*)::int FROM admin_email_errors WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS admin_errors,
        (SELECT COUNT(*)::int FROM email_logs WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour' AND status = 'bounced') AS bounced_emails,
        (SELECT COUNT(*)::int FROM feed_posts
          WHERE prediction_id IS NOT NULL
            AND image_url IS NULL
            AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
            AND updated_at < NOW() - INTERVAL '15 minutes') AS stuck_feed_posts,
        (SELECT COUNT(*)::int FROM ai_images
          WHERE prediction_id IS NOT NULL
            AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
            AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
            AND created_at < NOW() - INTERVAL '15 minutes') AS stuck_ai_images,
        (SELECT COUNT(*)::int FROM pro_photoshoot_grids
          WHERE prediction_id IS NOT NULL
            AND grid_url IS NULL
            AND generation_status = 'generating'
            AND updated_at < NOW() - INTERVAL '15 minutes') AS stuck_pro_photoshoots
    `
    return rows[0]
  })

  const lines: string[] = []
  lines.push(`# Product QA daily digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(``)

  lines.push(`## Activation health`)
  if (newUsers.ok && activation.ok) {
    lines.push(`- New users: ${newUsers.value.count}`)
    lines.push(
      `- Signup -> selfie: ${activation.value.users_with_selfies}/${activation.value.signups} (${pct(Number(activation.value.users_with_selfies || 0), Number(activation.value.signups || 0))})`,
    )
    lines.push(
      `- Signup -> first generation: ${activation.value.users_with_generation}/${activation.value.signups} (${pct(Number(activation.value.users_with_generation || 0), Number(activation.value.signups || 0))})`,
    )
  } else {
    const errorMessage = !newUsers.ok
      ? newUsers.error
      : !activation.ok
        ? activation.error
        : "Unknown activation query error"
    lines.push(`- Error: ${errorMessage}`)
  }
  lines.push(``)

  lines.push(`## Feature usage`)
  if (featureUsage.ok) {
    lines.push(`- Brand Engine applications: ${featureUsage.value.brand_engine_applications}`)
    lines.push(`- Maya photos: ${featureUsage.value.maya_photos}`)
    lines.push(`- Maya videos: ${featureUsage.value.maya_videos}`)
    lines.push(`- Feed planners created: ${featureUsage.value.feeds_created}`)
    lines.push(`- Feed posts generated: ${featureUsage.value.feed_posts_generated}`)
    lines.push(`- Academy opens: ${featureUsage.value.academy_opens}`)
  } else {
    lines.push(`- Error: ${featureUsage.error}`)
  }
  lines.push(``)

  lines.push(`## Reliability`)
  if (reliability.ok) {
    lines.push(`- Failed crons: ${reliability.value.failed_crons}`)
    lines.push(`- Admin errors: ${reliability.value.admin_errors}`)
    lines.push(`- Email bounces: ${reliability.value.bounced_emails}`)
    lines.push(`- Stuck feed posts (15m+): ${reliability.value.stuck_feed_posts}`)
    lines.push(`- Stuck ai_images (15m+): ${reliability.value.stuck_ai_images}`)
    lines.push(`- Stuck pro photoshoots (15m+): ${reliability.value.stuck_pro_photoshoots}`)
  } else {
    lines.push(`- Error: ${reliability.error}`)
  }
  lines.push(``)

  lines.push(`## Priority recommendations`)
  if (reliability.ok) {
    const failed = Number(reliability.value.failed_crons || 0)
    const admin = Number(reliability.value.admin_errors || 0)
    const stuck =
      Number(reliability.value.stuck_feed_posts || 0) +
      Number(reliability.value.stuck_ai_images || 0) +
      Number(reliability.value.stuck_pro_photoshoots || 0)
    if (failed > 0) lines.push(`- Fix failing cron jobs first, then rerun backlog.`)
    if (admin > 0) lines.push(`- Cluster admin errors by tool_name and fix the top source.`)
    if (stuck > 0) lines.push(`- Run reconciliation for stuck generation items before growth pushes.`)
    if (failed === 0 && admin === 0 && stuck === 0) {
      lines.push(`- No active reliability blockers. Prioritize activation and conversion experiments.`)
    }
  }

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[product-qa-digest] wrote ${path}`)
}

main().catch((err) => {
  console.error("[product-qa-digest] failed:", err)
  process.exitCode = 1
})
