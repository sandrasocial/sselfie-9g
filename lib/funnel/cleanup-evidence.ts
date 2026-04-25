import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { getDb } from "@/lib/db/client"
import { FUNNEL_CLEANUP_CANDIDATES } from "@/lib/funnel/cleanup-candidates"

export type FunnelCleanupEvidence = {
  route: string
  events30d: number
  uniqueActors30d: number
  latestSeenAt: string | null
}

export async function getFunnelCleanupEvidence(): Promise<Record<string, FunnelCleanupEvidence>> {
  try {
    await ensureAnalyticsSchema()
    const sql = getDb()
    const routes = FUNNEL_CLEANUP_CANDIDATES.map((candidate) => candidate.route)

    const rows = await sql`
      WITH route_candidates AS (
        SELECT UNNEST(${routes}) AS route
      )
      SELECT
        rc.route,
        COUNT(ae.id)::int AS events_30d,
        COUNT(DISTINCT COALESCE(NULLIF(ae.user_id, ''), NULLIF(ae.anon_id, '')))::int AS unique_actors_30d,
        MAX(ae.created_at) AS latest_seen_at
      FROM route_candidates rc
      LEFT JOIN analytics_events ae
        ON ae.created_at >= NOW() - INTERVAL '30 days'
       AND (
          ae.path = rc.route
          OR ae.path LIKE rc.route || '?%'
          OR ae.path LIKE rc.route || '/%'
        )
      GROUP BY rc.route
    `

    return Object.fromEntries(
      rows.map((row: any) => [
        String(row.route),
        {
          route: String(row.route),
          events30d: Number(row.events_30d || 0),
          uniqueActors30d: Number(row.unique_actors_30d || 0),
          latestSeenAt: row.latest_seen_at ? new Date(row.latest_seen_at).toISOString() : null,
        },
      ]),
    )
  } catch (error) {
    console.error("[funnel-cleanup] Failed to load route evidence:", error)
    return Object.fromEntries(
      FUNNEL_CLEANUP_CANDIDATES.map((candidate) => [
        candidate.route,
        {
          route: candidate.route,
          events30d: 0,
          uniqueActors30d: 0,
          latestSeenAt: null,
        },
      ]),
    )
  }
}
