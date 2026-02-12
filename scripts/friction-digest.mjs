/**
 * JS version of scripts/friction-digest.ts.
 *
 * Why this exists:
 * - Codex automations sometimes hit `tsx listen EPERM` (IPC pipe) on macOS.
 * - Plain `node` execution avoids that class of failures.
 *
 * Writes: output/automation/friction-digest-YYYY-MM-DD.md
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
  const name = `friction-digest-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.md`
  return resolve(dir, name)
}

function iso(x) {
  if (x === null || x === undefined) return "n/a"
  try {
    return new Date(x).toISOString()
  } catch {
    return String(x ?? "")
  }
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
  const hours = Number(process.env.FRICTION_DIGEST_WINDOW_HOURS || 24)
  const recentHours = Number(process.env.FRICTION_DIGEST_RECENT_HOURS || 2)
  const stuckRecentHours = Number(process.env.FRICTION_DIGEST_STUCK_RECENT_HOURS || 48)

  const cronFailures = await safe("cron_failures", async () => {
    return await sql`
      SELECT job_name, COUNT(*)::int AS count, MAX(started_at) AS last_seen
      FROM admin_cron_runs
      WHERE status = 'failed'
        AND started_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY job_name
      ORDER BY count DESC, last_seen DESC
      LIMIT 25
    `
  })

  const topAdminErrors = await safe("admin_email_errors", async () => {
    return await sql`
      SELECT tool_name, COUNT(*)::int AS count, MAX(created_at) AS last_seen
      FROM admin_email_errors
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY tool_name
      ORDER BY count DESC, last_seen DESC
      LIMIT 25
    `
  })

  const webhookErrors = await safe("webhook_errors", async () => {
    return await sql`
      SELECT event_type, COUNT(*)::int AS count, MAX(created_at) AS last_seen
      FROM webhook_errors
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      GROUP BY event_type
      ORDER BY count DESC, last_seen DESC
      LIMIT 25
    `
  })

  const genFailures = await safe("generation_trackers_failures", async () => {
    return await sql`
      SELECT status, COUNT(*)::int AS count, MAX(created_at) AS last_seen
      FROM generation_trackers
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
        AND status IN ('failed', 'error', 'canceled')
      GROUP BY status
      ORDER BY count DESC
      LIMIT 10
    `
  })

  const genStuck = await safe("generation_trackers_stuck", async () => {
    return await sql`
      SELECT status, COUNT(*)::int AS count, MIN(created_at) AS oldest
      FROM generation_trackers
      WHERE created_at < NOW() - INTERVAL '30 minutes'
        AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
      GROUP BY status
      ORDER BY count DESC
      LIMIT 10
    `
  })

  const genStuckRecent = await safe("generation_trackers_stuck_recent", async () => {
    return await sql`
      SELECT status, COUNT(*)::int AS count, MIN(created_at) AS oldest
      FROM generation_trackers
      WHERE created_at < NOW() - INTERVAL '30 minutes'
        AND created_at > NOW() - ${stuckRecentHours} * INTERVAL '1 hour'
        AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
      GROUP BY status
      ORDER BY count DESC
      LIMIT 10
    `
  })

  const genStuckAncient = await safe("generation_trackers_stuck_ancient", async () => {
    return await sql`
      SELECT status, COUNT(*)::int AS count, MIN(created_at) AS oldest
      FROM generation_trackers
      WHERE created_at < NOW() - INTERVAL '30 minutes'
        AND created_at <= NOW() - ${stuckRecentHours} * INTERVAL '1 hour'
        AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
      GROUP BY status
      ORDER BY count DESC
      LIMIT 10
    `
  })

  const feedBacklog = await safe("feed_posts_backlog", async () => {
    const [row] = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND image_url IS NULL
            AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
            AND updated_at < NOW() - INTERVAL '15 minutes'
        )::int AS stuck_15m,
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND image_url IS NULL
            AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
            AND updated_at < NOW() - ${stuckRecentHours} * INTERVAL '1 hour'
        )::int AS ancient,
        MIN(updated_at) FILTER (
          WHERE prediction_id IS NOT NULL
            AND image_url IS NULL
            AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
            AND updated_at < NOW() - INTERVAL '15 minutes'
        ) AS oldest
      FROM feed_posts
    `
    return row || { stuck_15m: 0, ancient: 0, oldest: null }
  })

  const aiBacklog = await safe("ai_images_backlog", async () => {
    const [row] = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
            AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
            AND created_at < NOW() - INTERVAL '15 minutes'
        )::int AS stuck_15m,
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
            AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
            AND created_at < NOW() - ${stuckRecentHours} * INTERVAL '1 hour'
        )::int AS ancient,
        MIN(created_at) FILTER (
          WHERE prediction_id IS NOT NULL
            AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
            AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
            AND created_at < NOW() - INTERVAL '15 minutes'
        ) AS oldest
      FROM ai_images
    `
    return row || { stuck_15m: 0, ancient: 0, oldest: null }
  })

  const proBacklog = await safe("pro_photoshoot_backlog", async () => {
    const [row] = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND grid_url IS NULL
            AND generation_status = 'generating'
            AND updated_at < NOW() - INTERVAL '15 minutes'
        )::int AS stuck_15m,
        COUNT(*) FILTER (
          WHERE prediction_id IS NOT NULL
            AND grid_url IS NULL
            AND generation_status = 'generating'
            AND updated_at < NOW() - ${stuckRecentHours} * INTERVAL '1 hour'
        )::int AS ancient,
        MIN(updated_at) FILTER (
          WHERE prediction_id IS NOT NULL
            AND grid_url IS NULL
            AND generation_status = 'generating'
            AND updated_at < NOW() - INTERVAL '15 minutes'
        ) AS oldest
      FROM pro_photoshoot_grids
    `
    return row || { stuck_15m: 0, ancient: 0, oldest: null }
  })

  const lines = []
  lines.push(`# Friction digest`)
  lines.push(``)
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Window: last ${hours} hour(s)`)
  lines.push(`- Recent threshold: last ${recentHours} hour(s)`)
  lines.push(``)

  lines.push(`## Active incidents (last ${recentHours}h)`)
  if (cronFailures.ok && topAdminErrors.ok && webhookErrors.ok) {
    const recentCutoff = now.getTime() - recentHours * 60 * 60 * 1000
    const activeCron = cronFailures.value.filter((r) => r.last_seen && new Date(r.last_seen).getTime() > recentCutoff)
    const activeAdmin = topAdminErrors.value.filter((r) => r.last_seen && new Date(r.last_seen).getTime() > recentCutoff)
    const activeWebhook = webhookErrors.value.filter((r) => r.last_seen && new Date(r.last_seen).getTime() > recentCutoff)

    const feedStuck = Number((feedBacklog.ok ? feedBacklog.value.stuck_15m : 0) || 0)
    const aiStuck = Number((aiBacklog.ok ? aiBacklog.value.stuck_15m : 0) || 0)
    const proStuck = Number((proBacklog.ok ? proBacklog.value.stuck_15m : 0) || 0)

    const totalActive = activeCron.length + activeAdmin.length + activeWebhook.length + (feedStuck + aiStuck + proStuck > 0 ? 1 : 0)
    if (totalActive === 0) {
      lines.push(`No active incidents found.`)
    } else {
      if (activeCron.length > 0) {
        lines.push(`Cron failures:`)
        for (const r of activeCron) lines.push(`- ${r.job_name}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
      if (activeAdmin.length > 0) {
        lines.push(`Admin errors:`)
        for (const r of activeAdmin) lines.push(`- ${r.tool_name}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
      if (activeWebhook.length > 0) {
        lines.push(`Webhook errors:`)
        for (const r of activeWebhook) lines.push(`- ${r.event_type}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
      if (feedStuck + aiStuck + proStuck > 0) {
        lines.push(`Generation backlog (15m+):`)
        lines.push(`- feed_posts: ${feedStuck}`)
        lines.push(`- ai_images: ${aiStuck}`)
        lines.push(`- pro_photoshoot_grids: ${proStuck}`)
      }
    }
  } else {
    if (!cronFailures.ok) lines.push(`- Error: ${cronFailures.error}`)
    if (!topAdminErrors.ok) lines.push(`- Error: ${topAdminErrors.error}`)
    if (!webhookErrors.ok) lines.push(`- Error: ${webhookErrors.error}`)
  }
  lines.push(``)

  lines.push(`## Cron failures`)
  if (cronFailures.ok) {
    if (cronFailures.value.length === 0) {
      lines.push(`No cron failures found.`)
    } else {
      for (const r of cronFailures.value) {
        lines.push(`- ${r.job_name}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
    }
  } else {
    lines.push(`- Error: ${cronFailures.error}`)
  }
  lines.push(``)

  lines.push(`## Top admin errors`)
  if (topAdminErrors.ok) {
    if (topAdminErrors.value.length === 0) {
      lines.push(`No admin errors found.`)
    } else {
      for (const r of topAdminErrors.value) {
        lines.push(`- ${r.tool_name}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
    }
  } else {
    lines.push(`- Error: ${topAdminErrors.error}`)
  }
  lines.push(``)

  lines.push(`## Webhook errors`)
  if (webhookErrors.ok) {
    if (webhookErrors.value.length === 0) {
      lines.push(`No webhook errors found.`)
    } else {
      for (const r of webhookErrors.value) {
        lines.push(`- ${r.event_type}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
    }
  } else {
    lines.push(`- Error: ${webhookErrors.error}`)
  }
  lines.push(``)

  lines.push(`## Generation failures (best-effort)`)
  if (genFailures.ok) {
    if (genFailures.value.length === 0) {
      lines.push(`No generation failures found.`)
    } else {
      for (const r of genFailures.value) {
        lines.push(`- ${r.status}: ${r.count} (last: ${iso(r.last_seen)})`)
      }
    }
  } else {
    lines.push(`- Error: ${genFailures.error}`)
  }
  lines.push(``)

  lines.push(`## Stuck generations (>30m, best-effort)`)
  lines.push(`Recent (created in last ${stuckRecentHours}h):`)
  if (genStuckRecent.ok) {
    if (genStuckRecent.value.length === 0) {
      lines.push(`No stuck generations found (recent).`)
    } else {
      for (const r of genStuckRecent.value) {
        lines.push(`- ${r.status}: ${r.count} (oldest_created_at: ${iso(r.oldest)})`)
      }
    }
  } else {
    lines.push(`- Error: ${genStuckRecent.error}`)
  }
  lines.push(``)

  lines.push(`Ancient (older than ${stuckRecentHours}h):`)
  if (genStuckAncient.ok) {
    if (genStuckAncient.value.length === 0) {
      lines.push(`No stuck generations found (ancient).`)
    } else {
      for (const r of genStuckAncient.value) {
        lines.push(`- ${r.status}: ${r.count} (oldest_created_at: ${iso(r.oldest)})`)
      }
    }
  } else {
    lines.push(`- Error: ${genStuckAncient.error}`)
  }
  lines.push(``)

  lines.push(`## Generation backlog (feed/ai/pro)`)
  if (feedBacklog.ok && aiBacklog.ok && proBacklog.ok) {
    lines.push(
      `- feed_posts: ${Number(feedBacklog.value.stuck_15m || 0)} stuck (15m+), ${Number(feedBacklog.value.ancient || 0)} ancient (> ${stuckRecentHours}h), oldest: ${iso(feedBacklog.value.oldest)}`,
    )
    lines.push(
      `- ai_images: ${Number(aiBacklog.value.stuck_15m || 0)} stuck (15m+), ${Number(aiBacklog.value.ancient || 0)} ancient (> ${stuckRecentHours}h), oldest: ${iso(aiBacklog.value.oldest)}`,
    )
    lines.push(
      `- pro_photoshoot_grids: ${Number(proBacklog.value.stuck_15m || 0)} stuck (15m+), ${Number(proBacklog.value.ancient || 0)} ancient (> ${stuckRecentHours}h), oldest: ${iso(proBacklog.value.oldest)}`,
    )
  } else {
    if (!feedBacklog.ok) lines.push(`- Error: ${feedBacklog.error}`)
    if (!aiBacklog.ok) lines.push(`- Error: ${aiBacklog.error}`)
    if (!proBacklog.ok) lines.push(`- Error: ${proBacklog.error}`)
  }
  lines.push(``)

  lines.push(`## Stuck generations raw (debug)`)
  if (genStuck.ok) {
    if (genStuck.value.length === 0) {
      lines.push(`No stuck generations found.`)
    } else {
      for (const r of genStuck.value) {
        lines.push(`- ${r.status}: ${r.count} (oldest_created_at: ${iso(r.oldest)})`)
      }
    }
  } else {
    lines.push(`- Error: ${genStuck.error}`)
  }
  lines.push(``)

  const path = outPath(now)
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[friction-digest] wrote ${path}`)
}

main().catch((err) => {
  console.error("[friction-digest] failed:", err)
  process.exitCode = 1
})
