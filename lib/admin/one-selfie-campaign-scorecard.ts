import "server-only"

import { sql } from "@/lib/db/client"
import {
  SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
  SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
  getSelfieVisibilityBundleOfferStatus,
} from "@/lib/launch/selfie-visibility-bundle"

type RawRow = Record<string, unknown>

export type OneSelfieCampaignScorecard = {
  generatedAt: string
  phase: "upcoming" | "open" | "closed"
  opensAt: string
  closesAt: string
  traffic: {
    views: number
    ctaClicks: number
    bySource: Array<{
      source: string
      medium: string
      views: number
      ctaClicks: number
    }>
  }
  checkout: {
    starts: number
    paidPayments: number
    paidBuyers: number
    grossUsd: number
    pageToCheckoutPct: number
    checkoutToPaidPct: number
  }
  activation: {
    buyerHomeOpened: number
    mayaOpened: number
    generated: number
    downloaded: number
  }
  sources: {
    traffic: "analytics_events"
    checkout: "checkout_attribution"
    money: "stripe_payments"
    activation: "analytics_events + stripe_payments"
  }
}

export type OneSelfieCampaignScorecardInput = {
  now?: Date
  trafficRows: RawRow[]
  checkoutRow: RawRow
  paymentRow: RawRow
  activationRow: RawRow
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
}

export function buildOneSelfieCampaignScorecard(
  input: OneSelfieCampaignScorecardInput
): OneSelfieCampaignScorecard {
  const now = input.now ?? new Date()
  const phase = getSelfieVisibilityBundleOfferStatus(now).phase
  const bySource = input.trafficRows.map(row => ({
    source: String(row.source || "direct"),
    medium: String(row.medium || "unknown"),
    views: numberValue(row.views),
    ctaClicks: numberValue(row.cta_clicks),
  }))
  const views = bySource.reduce((sum, row) => sum + row.views, 0)
  const ctaClicks = bySource.reduce((sum, row) => sum + row.ctaClicks, 0)
  const starts = numberValue(input.checkoutRow.starts)
  const paidPayments = numberValue(input.paymentRow.paid_payments)
  const paidBuyers = numberValue(input.paymentRow.paid_buyers)

  return {
    generatedAt: now.toISOString(),
    phase,
    opensAt: SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
    closesAt: SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
    traffic: {
      views,
      ctaClicks,
      bySource,
    },
    checkout: {
      starts,
      paidPayments,
      paidBuyers,
      grossUsd: numberValue(input.paymentRow.gross_cents) / 100,
      pageToCheckoutPct: percentage(starts, views),
      checkoutToPaidPct: percentage(paidBuyers, starts),
    },
    activation: {
      buyerHomeOpened: numberValue(input.activationRow.buyer_home_opened),
      mayaOpened: numberValue(input.activationRow.maya_opened),
      generated: numberValue(input.activationRow.generated),
      downloaded: numberValue(input.activationRow.downloaded),
    },
    sources: {
      traffic: "analytics_events",
      checkout: "checkout_attribution",
      money: "stripe_payments",
      activation: "analytics_events + stripe_payments",
    },
  }
}

/**
 * Fixed-window event report. Behavior comes from analytics/attribution tables; all money and
 * paid-buyer truth comes only from live successful stripe_payments rows.
 */
export async function getOneSelfieCampaignScorecard(): Promise<OneSelfieCampaignScorecard> {
  const [trafficRows, checkoutRows, paymentRows, activationRows] = await Promise.all([
    sql`
      SELECT
        COALESCE(
          NULLIF(utm_source, ''),
          NULLIF(properties->>'source', ''),
          'direct'
        ) AS source,
        COALESCE(NULLIF(utm_medium, ''), 'unknown') AS medium,
        COUNT(*) FILTER (WHERE event_name = 'offer_landing_view')::int AS views,
        COUNT(*) FILTER (WHERE event_name = 'offer_cta_click')::int AS cta_clicks
      FROM analytics_events
      WHERE created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
        AND created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
        AND event_name IN ('offer_landing_view', 'offer_cta_click')
        AND properties->>'offer_slug' = 'one-selfie-visibility-bundle'
      GROUP BY 1, 2
      ORDER BY views DESC, cta_clicks DESC
    `,
    sql`
      SELECT COUNT(*)::int AS starts
      FROM checkout_attribution
      WHERE product_type = 'selfie_visibility_bundle'
        AND created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
        AND created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
    `,
    sql`
      WITH event_sessions AS (
        SELECT session_id
        FROM checkout_attribution
        WHERE product_type = 'selfie_visibility_bundle'
          AND created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
          AND created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
      )
      SELECT
        COUNT(DISTINCT sp.stripe_payment_id)::int AS paid_payments,
        COUNT(DISTINCT COALESCE(
          NULLIF(LOWER(BTRIM(sp.customer_email)), ''),
          NULLIF(sp.stripe_customer_id, ''),
          NULLIF(sp.user_id::text, ''),
          sp.stripe_payment_id
        ))::int AS paid_buyers,
        COALESCE(SUM(sp.amount_cents), 0)::bigint AS gross_cents
      FROM stripe_payments sp
      JOIN event_sessions es
        ON es.session_id = COALESCE(
          NULLIF(sp.checkout_session_id, ''),
          NULLIF(sp.metadata->>'stripe_session_id', '')
        )
      WHERE sp.product_type = 'selfie_visibility_bundle'
        AND sp.status IN ('succeeded', 'paid')
        AND COALESCE(sp.is_test_mode, FALSE) = FALSE
    `,
    sql`
      WITH event_checkouts AS (
        SELECT session_id, user_id
        FROM checkout_attribution
        WHERE product_type = 'selfie_visibility_bundle'
          AND created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}
          AND created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}
      ), buyers AS (
        SELECT
          COALESCE(NULLIF(sp.user_id::text, ''), NULLIF(ec.user_id, '')) AS user_id,
          MIN(sp.payment_date) AS payment_at
        FROM stripe_payments sp
        JOIN event_checkouts ec
          ON ec.session_id = COALESCE(
            NULLIF(sp.checkout_session_id, ''),
            NULLIF(sp.metadata->>'stripe_session_id', '')
          )
        WHERE sp.product_type = 'selfie_visibility_bundle'
          AND sp.status IN ('succeeded', 'paid')
          AND COALESCE(sp.is_test_mode, FALSE) = FALSE
        GROUP BY 1
      )
      SELECT
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM analytics_events ae
            WHERE ae.user_id = buyers.user_id
              AND ae.event_name = 'selfie_visibility_bundle_access_opened'
              AND ae.created_at >= buyers.payment_at
          )
        )::int AS buyer_home_opened,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM analytics_events ae
            WHERE ae.user_id = buyers.user_id
              AND ae.event_name = 'suite_maya_inline_started'
              AND ae.created_at >= buyers.payment_at
          )
        )::int AS maya_opened,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM analytics_events ae
            WHERE ae.user_id = buyers.user_id
              AND ae.event_name = 'suite_image_generated'
              AND ae.created_at >= buyers.payment_at
          )
        )::int AS generated,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM analytics_events ae
            WHERE ae.user_id = buyers.user_id
              AND ae.event_name = 'suite_image_downloaded'
              AND ae.created_at >= buyers.payment_at
          )
        )::int AS downloaded
      FROM buyers
      WHERE buyers.user_id IS NOT NULL
    `,
  ])

  return buildOneSelfieCampaignScorecard({
    trafficRows: trafficRows as RawRow[],
    checkoutRow: (checkoutRows as RawRow[])[0] || {},
    paymentRow: (paymentRows as RawRow[])[0] || {},
    activationRow: (activationRows as RawRow[])[0] || {},
  })
}
