import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { getDb } from "@/lib/db/client"
import { FUNNEL_CLEANUP_CANDIDATES } from "@/lib/funnel/cleanup-candidates"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

const EVIDENCE_WINDOW_DAYS = 90

export type FunnelCleanupEvidence = {
  route: string
  events30d: number
  uniqueActors30d: number
  events90d: number
  uniqueActors90d: number
  checkoutStarts90d: number
  checkoutCompletions90d: number
  revenue90dCents: number
  dependencyRisk: "low" | "medium" | "high"
  strategicFit: "primary" | "support" | "weak"
  cleanupScore: number
  scoreLabel: "keep" | "support" | "review" | "cleanup_candidate"
  riskReason: string
  latestSeenAt: string | null
}

function getTrafficScore(input: { events90d: number; uniqueActors90d: number }) {
  if (input.uniqueActors90d >= 20 || input.events90d >= 100) return 3
  if (input.uniqueActors90d >= 5 || input.events90d >= 25) return 2
  if (input.uniqueActors90d > 0 || input.events90d > 0) return 1
  return 0
}

function getRevenueScore(input: { checkoutCompletions90d: number; revenue90dCents: number; checkoutStarts90d: number }) {
  if (input.checkoutCompletions90d > 0 || input.revenue90dCents > 0) return 3
  if (input.checkoutStarts90d > 0) return 1
  return 0
}

function getDependencyScore(dependencyRisk: FunnelCleanupEvidence["dependencyRisk"]) {
  if (dependencyRisk === "high") return 3
  if (dependencyRisk === "medium") return 2
  return 0
}

function getStrategicScore(strategicFit: FunnelCleanupEvidence["strategicFit"]) {
  if (strategicFit === "primary") return 3
  if (strategicFit === "support") return 2
  return 0
}

function getScoreLabel(score: number): FunnelCleanupEvidence["scoreLabel"] {
  if (score >= 7) return "keep"
  if (score >= 4) return "support"
  if (score >= 2) return "review"
  return "cleanup_candidate"
}

function buildRiskReason(input: {
  events90d: number
  checkoutCompletions90d: number
  dependencyRisk: FunnelCleanupEvidence["dependencyRisk"]
  strategicFit: FunnelCleanupEvidence["strategicFit"]
}) {
  const reasons: string[] = []
  if (input.events90d > 0) reasons.push("recent traffic")
  if (input.checkoutCompletions90d > 0) reasons.push("recent checkout revenue")
  if (input.dependencyRisk !== "low") reasons.push(`${input.dependencyRisk} dependency risk`)
  if (input.strategicFit !== "weak") reasons.push(`${input.strategicFit} strategic fit`)
  return reasons.length ? reasons.join(", ") : "no recent traffic, revenue, or strong dependency signal"
}

function buildFallbackEvidence() {
  return Object.fromEntries(
    FUNNEL_CLEANUP_CANDIDATES.map((candidate) => {
      const dependencyRisk = candidate.dependencyRisk
      const strategicFit = candidate.strategicFit
      const cleanupScore = getDependencyScore(dependencyRisk) + getStrategicScore(strategicFit)
      return [
        candidate.route,
        {
          route: candidate.route,
          events30d: 0,
          uniqueActors30d: 0,
          events90d: 0,
          uniqueActors90d: 0,
          checkoutStarts90d: 0,
          checkoutCompletions90d: 0,
          revenue90dCents: 0,
          dependencyRisk,
          strategicFit,
          cleanupScore,
          scoreLabel: getScoreLabel(cleanupScore),
          riskReason: buildRiskReason({
            events90d: 0,
            checkoutCompletions90d: 0,
            dependencyRisk,
            strategicFit,
          }),
          latestSeenAt: null,
        },
      ]
    }),
  )
}

export async function getFunnelCleanupEvidence(): Promise<Record<string, FunnelCleanupEvidence>> {
  try {
    await ensureAnalyticsSchema()
    await ensureRevenueEngineSchema()
    const sql = getDb()
    const candidates = FUNNEL_CLEANUP_CANDIDATES.map((candidate) => ({
      route: candidate.route,
      offerSlugs: candidate.offerSlugs || [],
    }))

    const rows = await sql`
      WITH route_candidates AS (
        SELECT
          route,
          offer_slugs
        FROM jsonb_to_recordset(${JSON.stringify(candidates)}::jsonb)
          AS rc(route text, "offerSlugs" jsonb)
        CROSS JOIN LATERAL (
          SELECT COALESCE(rc."offerSlugs", '[]'::jsonb) AS offer_slugs
        ) normalized
      ),
      route_traffic AS (
        SELECT
          rc.route,
          COUNT(ae.id) FILTER (WHERE ae.created_at >= NOW() - INTERVAL '30 days')::int AS events_30d,
          COUNT(DISTINCT COALESCE(NULLIF(ae.user_id, ''), NULLIF(ae.anon_id, ''))) FILTER (
            WHERE ae.created_at >= NOW() - INTERVAL '30 days'
          )::int AS unique_actors_30d,
          COUNT(ae.id) FILTER (WHERE ae.created_at >= NOW() - ${EVIDENCE_WINDOW_DAYS} * INTERVAL '1 day')::int AS events_90d,
          COUNT(DISTINCT COALESCE(NULLIF(ae.user_id, ''), NULLIF(ae.anon_id, ''))) FILTER (
            WHERE ae.created_at >= NOW() - ${EVIDENCE_WINDOW_DAYS} * INTERVAL '1 day'
          )::int AS unique_actors_90d,
          MAX(ae.created_at) AS latest_seen_at
        FROM route_candidates rc
        LEFT JOIN analytics_events ae
          ON ae.created_at >= NOW() - ${EVIDENCE_WINDOW_DAYS} * INTERVAL '1 day'
         AND (
            ae.path = rc.route
            OR ae.path LIKE rc.route || '?%'
            OR ae.path LIKE rc.route || '/%'
          )
        GROUP BY rc.route
      ),
      checkout_signal AS (
        SELECT
          rc.route,
          COUNT(ca.session_id)::int AS checkout_starts_90d,
          COUNT(ca.session_id) FILTER (WHERE ca.status = 'completed')::int AS checkout_completions_90d,
          COALESCE(SUM(ca.purchase_value_cents) FILTER (WHERE ca.status = 'completed'), 0)::int AS revenue_90d_cents
        FROM route_candidates rc
        LEFT JOIN checkout_attribution ca
          ON ca.created_at >= NOW() - ${EVIDENCE_WINDOW_DAYS} * INTERVAL '1 day'
         AND (
            ca.entry_path = rc.route
            OR ca.entry_path LIKE rc.route || '?%'
            OR ca.entry_path LIKE rc.route || '/%'
            OR ca.return_to = rc.route
            OR ca.return_to LIKE rc.route || '?%'
            OR ca.return_to LIKE rc.route || '/%'
            OR ca.offer_slug IN (SELECT jsonb_array_elements_text(rc.offer_slugs))
            OR ca.product_type IN (SELECT jsonb_array_elements_text(rc.offer_slugs))
            OR ca.product_id IN (SELECT jsonb_array_elements_text(rc.offer_slugs))
          )
        GROUP BY rc.route
      )
      SELECT
        rc.route,
        COALESCE(rt.events_30d, 0)::int AS events_30d,
        COALESCE(rt.unique_actors_30d, 0)::int AS unique_actors_30d,
        COALESCE(rt.events_90d, 0)::int AS events_90d,
        COALESCE(rt.unique_actors_90d, 0)::int AS unique_actors_90d,
        COALESCE(cs.checkout_starts_90d, 0)::int AS checkout_starts_90d,
        COALESCE(cs.checkout_completions_90d, 0)::int AS checkout_completions_90d,
        COALESCE(cs.revenue_90d_cents, 0)::int AS revenue_90d_cents,
        rt.latest_seen_at
      FROM route_candidates rc
      LEFT JOIN route_traffic rt ON rt.route = rc.route
      LEFT JOIN checkout_signal cs ON cs.route = rc.route
    `

    return Object.fromEntries(
      rows.map((row: any) => {
        const route = String(row.route)
        const candidate = FUNNEL_CLEANUP_CANDIDATES.find((item) => item.route === route)
        const dependencyRisk = candidate?.dependencyRisk || "low"
        const strategicFit = candidate?.strategicFit || "weak"
        const evidence = {
          events90d: Number(row.events_90d || 0),
          uniqueActors90d: Number(row.unique_actors_90d || 0),
          checkoutStarts90d: Number(row.checkout_starts_90d || 0),
          checkoutCompletions90d: Number(row.checkout_completions_90d || 0),
          revenue90dCents: Number(row.revenue_90d_cents || 0),
          dependencyRisk,
          strategicFit,
        }
        const cleanupScore =
          getTrafficScore(evidence) +
          getRevenueScore(evidence) +
          getDependencyScore(dependencyRisk) +
          getStrategicScore(strategicFit)

        return [
          route,
          {
            route,
            events30d: Number(row.events_30d || 0),
            uniqueActors30d: Number(row.unique_actors_30d || 0),
            ...evidence,
            cleanupScore,
            scoreLabel: getScoreLabel(cleanupScore),
            riskReason: buildRiskReason(evidence),
            latestSeenAt: row.latest_seen_at ? new Date(row.latest_seen_at).toISOString() : null,
          },
        ]
      }),
    )
  } catch (error) {
    console.error("[funnel-cleanup] Failed to load route evidence:", error)
    return buildFallbackEvidence()
  }
}
