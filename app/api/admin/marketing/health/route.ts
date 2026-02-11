import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { MARKETING_SEGMENTS } from "@/lib/email/config"

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number.parseInt(String(v ?? ""), 10)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

function isUpstashConfigured() {
  const url =
    process.env.UPSTASH_KV_REST_API_URL ||
    process.env.UPSTASH_KV_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_KV_REST_URL
  const token =
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    process.env.UPSTASH_KV_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_KV_REST_TOKEN
  return Boolean(url && token)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = new URL(request.url)
    const days = clampInt(url.searchParams.get("days"), 7, 1, 30)
    const limitRuns = clampInt(url.searchParams.get("limitRuns"), 50, 1, 200)
    const limitErrors = clampInt(url.searchParams.get("limitErrors"), 30, 1, 200)
    const staleRunMins = clampInt(
      url.searchParams.get("staleMins"),
      Number.parseInt(process.env.MARKETING_STALE_RUN_MINS || "180", 10),
      30,
      24 * 60,
    )

    const sql = neon(process.env.DATABASE_URL!)

    const [queueStuck] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM marketing_send_queue WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '15 minutes') AS processing_over_15m,
        (SELECT COUNT(*)::int FROM marketing_send_queue WHERE status = 'cleanup_processing' AND updated_at < NOW() - INTERVAL '15 minutes') AS cleanup_processing_over_15m
    `
    const [staleRuns] = await sql`
      WITH run_activity AS (
        SELECT
          r.run_id,
          r.started_at,
          MAX(q.updated_at) AS last_queue_activity_at
        FROM marketing_send_runs r
        LEFT JOIN marketing_send_queue q ON q.run_id = r.run_id
        WHERE r.status IN ('syncing', 'broadcasting', 'cleanup')
          AND r.finished_at IS NULL
          AND r.started_at IS NOT NULL
        GROUP BY r.run_id, r.started_at
      )
      SELECT COUNT(*)::int AS count
      FROM run_activity
      WHERE COALESCE(last_queue_activity_at, started_at) < NOW() - make_interval(mins => ${staleRunMins})
    `

    const runCounts = await sql`
      SELECT
        COALESCE(email_type, sequence_key) AS email_type,
        status,
        COUNT(*)::int AS count,
        MAX(created_at) AS last_created_at
      FROM marketing_send_runs
      WHERE created_at > NOW() - make_interval(days => ${days})
      GROUP BY 1, 2
      ORDER BY 1, 2
    `

    const latestRuns = await sql`
      WITH ranked AS (
        SELECT
          run_id,
          sequence_key,
          email_type,
          tag_key,
          segment_id,
          campaign_key,
          status,
          total_recipients,
          processed_recipients,
          error_message,
          broadcast_id,
          started_at,
          finished_at,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(email_type, sequence_key)
            ORDER BY created_at DESC
          ) AS rn
        FROM marketing_send_runs
        WHERE created_at > NOW() - make_interval(days => ${days})
      )
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT ${limitRuns}
    `

    const runIds = (latestRuns as any[]).map((r) => String(r.run_id)).filter(Boolean)

    const queueCounts =
      runIds.length === 0
        ? []
        : await sql`
            SELECT
              run_id,
              status,
              COUNT(*)::int AS count,
              MAX(updated_at) AS last_updated_at
            FROM marketing_send_queue
            WHERE run_id = ANY(${runIds}::text[])
            GROUP BY 1, 2
            ORDER BY 1, 2
          `

    const segmentIdWhitespace = await sql`
      SELECT
        COUNT(*)::int AS count,
        ARRAY_AGG(DISTINCT COALESCE(email_type, sequence_key)) FILTER (WHERE segment_id IS NOT NULL) AS email_types
      FROM marketing_send_runs
      WHERE created_at > NOW() - make_interval(days => ${days})
        AND segment_id IS NOT NULL
        AND segment_id <> BTRIM(segment_id)
    `

    const recentErrors = await sql`
      SELECT tool_name, error_message, created_at, context
      FROM admin_email_errors
      WHERE created_at > NOW() - INTERVAL '48 hours'
        AND (
          tool_name LIKE 'marketing-runner:%'
          OR tool_name LIKE 'cron:%blueprint%'
          OR tool_name LIKE 'cron:%onboarding%'
          OR tool_name LIKE 'cron:%welcome%'
          OR tool_name LIKE 'cron:%nurture%'
          OR tool_name LIKE 'cron:%reengagement%'
          OR tool_name LIKE 'cron:%reactivation%'
          OR tool_name LIKE 'cron:%upsell%'
          OR tool_name LIKE 'cron:%win-back%'
        )
      ORDER BY created_at DESC
      LIMIT ${limitErrors}
    `

    const failedRuns = await sql`
      SELECT
        run_id,
        COALESCE(email_type, sequence_key) AS email_type,
        status,
        error_message,
        created_at,
        started_at,
        finished_at
      FROM marketing_send_runs
      WHERE created_at > NOW() - INTERVAL '48 hours'
        AND status = 'failed'
      ORDER BY created_at DESC
      LIMIT ${limitErrors}
    `

    const segments = Object.entries(MARKETING_SEGMENTS).map(([key, value]) => {
      const v = String(value || "")
      const trimmed = v.trim()
      return {
        key,
        value: v,
        isMissing: trimmed.length === 0,
        hasWhitespace: v !== trimmed,
      }
    })

    const missingSegments = segments.filter((s) => s.isMissing).map((s) => s.key)
    const whitespaceSegments = segments.filter((s) => s.hasWhitespace && !s.isMissing).map((s) => s.key)

    const recommendations: string[] = []
    if (!process.env.RESEND_AUDIENCE_ID) recommendations.push("Set RESEND_AUDIENCE_ID (required for broadcasts).")
    if (!process.env.RESEND_API_KEY) recommendations.push("Set RESEND_API_KEY (required for broadcasts).")
    if (!isUpstashConfigured())
      recommendations.push("Configure Upstash Redis REST env vars (improves reliability via caching + locks).")
    if (missingSegments.length > 0)
      recommendations.push(`Missing segment env vars: ${missingSegments.join(", ")}.`)
    if (whitespaceSegments.length > 0)
      recommendations.push(`Segment env vars contain whitespace/newlines: ${whitespaceSegments.join(", ")}.`)
    if (Number(queueStuck?.processing_over_15m || 0) > 0 || Number(queueStuck?.cleanup_processing_over_15m || 0) > 0) {
      recommendations.push("Queue has stuck items; recovery cron should reset them. If persistent, investigate marketing-runner runtime/timeouts.")
    }
    if (Number(staleRuns?.count || 0) > 0) {
      recommendations.push("There are stale marketing runs; recovery should fail them. If persistent, investigate Resend errors and cron overlap.")
    }

    return NextResponse.json({
      now: new Date().toISOString(),
      range: { days },
      config: {
        resendAudienceIdConfigured: Boolean(process.env.RESEND_AUDIENCE_ID),
        resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
        upstashConfigured: isUpstashConfigured(),
        segments,
      },
      health: {
        stuckQueue: {
          processingOver15m: Number(queueStuck?.processing_over_15m || 0),
          cleanupProcessingOver15m: Number(queueStuck?.cleanup_processing_over_15m || 0),
        },
        staleRunsOver30m: Number(staleRuns?.count || 0),
        staleRunThresholdMinutes: staleRunMins,
        segmentIdWhitespaceInRuns: {
          count: Number((segmentIdWhitespace as any[])[0]?.count || 0),
          emailTypes: ((segmentIdWhitespace as any[])[0]?.email_types || []) as string[],
        },
      },
      runs: {
        latestByEmailType: latestRuns,
        countsByEmailTypeStatus: runCounts,
        queueCountsForLatest: queueCounts,
        failedLast48h: failedRuns,
      },
      errors: {
        recentLast48h: recentErrors,
      },
      recommendations,
    })
  } catch (error) {
    console.error("[v0] Error generating marketing health report:", error)
    return NextResponse.json(
      {
        error: "Failed to generate marketing health report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
