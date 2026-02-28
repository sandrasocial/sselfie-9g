import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { buildActivationKpiFromWindow } from "@/lib/analytics/activation-kpi"
import { getDb } from "@/lib/db"

const DEFAULT_WINDOW_DAYS = 7

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const sql = getDb()
  const windowDays = DEFAULT_WINDOW_DAYS
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const [row] = await sql`
    WITH new_signups AS (
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${periodStart.toISOString()}
    ),
    starts AS (
      SELECT
        COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, '')) AS actor_key,
        MIN(created_at) AS started_at
      FROM analytics_events
      WHERE event_name = 'signup_to_first_gen'
        AND COALESCE(properties->>'stage', '') = 'start'
        AND created_at >= ${periodStart.toISOString()}
      GROUP BY COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''))
    ),
    completions AS (
      SELECT
        s.actor_key,
        completion.completed_at,
        CASE
          WHEN completion.completed_at IS NULL THEN NULL
          WHEN completion.ttfi_seconds IS NOT NULL THEN completion.ttfi_seconds
          ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (completion.completed_at - s.started_at))))::int
        END AS ttfi_seconds
      FROM starts s
      LEFT JOIN LATERAL (
        SELECT
          ae.created_at AS completed_at,
          CASE
            WHEN NULLIF(ae.properties->>'ttfi_seconds', '') ~ '^[0-9]+$'
            THEN (ae.properties->>'ttfi_seconds')::int
            ELSE NULL
          END AS ttfi_seconds
        FROM analytics_events ae
        WHERE ae.event_name = 'signup_to_first_gen'
          AND COALESCE(ae.properties->>'stage', '') = 'complete'
          AND COALESCE(NULLIF(ae.user_id, ''), NULLIF(ae.anon_id, '')) = s.actor_key
          AND ae.created_at >= s.started_at
        ORDER BY ae.created_at ASC
        LIMIT 1
      ) completion ON TRUE
    )
    SELECT
      (SELECT count FROM new_signups) AS new_signups,
      (SELECT COUNT(*)::int FROM starts) AS starts,
      COUNT(*) FILTER (WHERE completions.completed_at IS NOT NULL)::int AS completes,
      COUNT(*) FILTER (WHERE completions.completed_at IS NOT NULL AND completions.ttfi_seconds <= 300)::int AS completes_5m,
      COUNT(*) FILTER (WHERE completions.completed_at IS NOT NULL AND completions.ttfi_seconds <= 3600)::int AS completes_60m,
      COALESCE(
        ARRAY_REMOVE(ARRAY_AGG(completions.ttfi_seconds) FILTER (WHERE completions.completed_at IS NOT NULL), NULL),
        ARRAY[]::int[]
      ) AS ttfi_samples
    FROM completions
  `

  const report = buildActivationKpiFromWindow({
    windowDays,
    newSignups: Number(row?.new_signups || 0),
    starts: Number(row?.starts || 0),
    completes: Number(row?.completes || 0),
    completesWithin5m: Number(row?.completes_5m || 0),
    completesWithin60m: Number(row?.completes_60m || 0),
    ttfiSecondsSamples: Array.isArray(row?.ttfi_samples) ? row.ttfi_samples.map((value: any) => Number(value)) : [],
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  })

  return NextResponse.json({ report })
}

