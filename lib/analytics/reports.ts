import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { getDb } from "@/lib/db/client"

function asInt(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function asNumber(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export type AnalyticsReportRow = {
  id: number
  report_type: string
  period_start: string | number | Date
  period_end: string | number | Date
  payload: unknown
  created_at: string | number | Date
}

export async function generateRevenueEngineWeeklyReport(input?: {
  days?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  summary: {
    sessions: number
    purchases: number
    conversionPct: number
    revenueCents: number
    averageOrderValueCents: number
    emailAttributedPurchases: number
    emailAttributedRevenueCents: number
    referralPurchases: number
    referralRevenueCents: number
    bridgeToStudioUsers: number
    bridgeToStudioRatePct: number
  }
  offers: Array<{
    offerSlug: string
    funnelStage: string
    sessions: number
    purchases: number
    conversionPct: number
    revenueCents: number
    averageOrderValueCents: number
  }>
  channels: Array<{
    utmSource: string
    utmMedium: string
    utmCampaign: string
    sessions: number
    purchases: number
    revenueCents: number
  }>
  lifecycle: Array<{
    campaignId: number | null
    utmCampaign: string
    purchases: number
    revenueCents: number
  }>
  referrals: {
    signups: number
    completed: number
    influencedPurchases: number
    influencedRevenueCents: number
  }
  topDropoffs: Array<{
    offerSlug: string
    dropoffCount: number
  }>
}> {
  const days = input?.days ?? 30

  await ensureAnalyticsSchema()
  await ensureRevenueEngineSchema()

  const sql = getDb()
  const [period] = await sql`
    SELECT
      NOW() - (${days} * INTERVAL '1 day') AS period_start,
      NOW() AS period_end
  `

  const periodStart = new Date(period.period_start).toISOString()
  const periodEnd = new Date(period.period_end).toISOString()

  const offerRows = await sql`
    SELECT
      offer_slug,
      funnel_stage,
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_cents,
      COALESCE(AVG(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::numeric AS average_order_value_cents
    FROM checkout_attribution
    WHERE created_at >= ${periodStart}
    GROUP BY offer_slug, funnel_stage
    ORDER BY revenue_cents DESC, purchases DESC, sessions DESC
  `

  const channelRows = await sql`
    SELECT
      COALESCE(NULLIF(utm_source, ''), 'direct') AS utm_source,
      COALESCE(NULLIF(utm_medium, ''), 'unknown') AS utm_medium,
      COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utm_campaign,
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_cents
    FROM checkout_attribution
    WHERE created_at >= ${periodStart}
    GROUP BY 1, 2, 3
    ORDER BY revenue_cents DESC, purchases DESC, sessions DESC
    LIMIT 12
  `

  const lifecycleRows = await sql`
    SELECT
      campaign_id,
      COALESCE(NULLIF(utm_campaign, ''), '(email unattributed)') AS utm_campaign,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_cents
    FROM checkout_attribution
    WHERE created_at >= ${periodStart}
      AND (campaign_id IS NOT NULL OR utm_source = 'email')
    GROUP BY campaign_id, COALESCE(NULLIF(utm_campaign, ''), '(email unattributed)')
    HAVING COUNT(*) FILTER (WHERE status = 'completed') > 0
    ORDER BY revenue_cents DESC, purchases DESC
    LIMIT 12
  `

  const [summaryRow] = await sql`
    SELECT
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_cents,
      COALESCE(AVG(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::numeric AS average_order_value_cents,
      COUNT(*) FILTER (WHERE status = 'completed' AND (campaign_id IS NOT NULL OR utm_source = 'email'))::int AS email_purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed' AND (campaign_id IS NOT NULL OR utm_source = 'email')), 0)::bigint AS email_revenue_cents,
      COUNT(*) FILTER (WHERE status = 'completed' AND referral_code IS NOT NULL)::int AS referral_purchases,
      COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed' AND referral_code IS NOT NULL), 0)::bigint AS referral_revenue_cents
    FROM checkout_attribution
    WHERE created_at >= ${periodStart}
  `

  const [referralRow] = await sql`
    WITH referred_purchases AS (
      SELECT
        COUNT(*)::int AS purchases,
        COALESCE(SUM(ca.purchase_value_cents), 0)::bigint AS revenue_cents
      FROM referrals r
      INNER JOIN checkout_attribution ca
        ON ca.user_id = r.referred_id
      WHERE r.created_at >= ${periodStart}
        AND ca.status = 'completed'
    )
    SELECT
      (SELECT COUNT(*)::int FROM referrals WHERE created_at >= ${periodStart}) AS signups,
      (SELECT COUNT(*)::int FROM referrals WHERE created_at >= ${periodStart} AND status = 'completed') AS completed,
      (SELECT purchases FROM referred_purchases) AS influenced_purchases,
      (SELECT revenue_cents FROM referred_purchases) AS influenced_revenue_cents
  `

  const [bridgeRow] = await sql`
    WITH bridge_buyers AS (
      SELECT DISTINCT COALESCE(NULLIF(user_id, ''), LOWER(NULLIF(user_email, ''))) AS buyer_key
      FROM checkout_attribution
      WHERE created_at >= ${periodStart}
        AND status = 'completed'
        AND funnel_stage = 'entry_offer'
    ),
    studio_conversions AS (
      SELECT DISTINCT COALESCE(NULLIF(ca.user_id, ''), LOWER(NULLIF(ca.user_email, ''))) AS buyer_key
      FROM checkout_attribution ca
      WHERE ca.created_at >= ${periodStart}
        AND ca.status = 'completed'
        AND ca.funnel_stage = 'studio_membership'
    )
    SELECT
      (SELECT COUNT(*)::int FROM bridge_buyers) AS bridge_buyers,
      (
        SELECT COUNT(*)::int
        FROM bridge_buyers bb
        INNER JOIN studio_conversions sc ON sc.buyer_key = bb.buyer_key
      ) AS bridge_to_studio
  `

  const offers = (offerRows as any[]).map((row) => {
    const sessions = asInt(row.sessions)
    const purchases = asInt(row.purchases)
    return {
      offerSlug: String(row.offer_slug),
      funnelStage: String(row.funnel_stage),
      sessions,
      purchases,
      conversionPct: sessions > 0 ? Number(((purchases / sessions) * 100).toFixed(1)) : 0,
      revenueCents: asNumber(row.revenue_cents),
      averageOrderValueCents: asNumber(row.average_order_value_cents),
    }
  })

  const sessions = asInt(summaryRow?.sessions)
  const purchases = asInt(summaryRow?.purchases)
  const bridgeBuyers = asInt(bridgeRow?.bridge_buyers)
  const bridgeToStudioUsers = asInt(bridgeRow?.bridge_to_studio)

  return {
    periodStart,
    periodEnd,
    summary: {
      sessions,
      purchases,
      conversionPct: sessions > 0 ? Number(((purchases / sessions) * 100).toFixed(1)) : 0,
      revenueCents: asNumber(summaryRow?.revenue_cents),
      averageOrderValueCents: asNumber(summaryRow?.average_order_value_cents),
      emailAttributedPurchases: asInt(summaryRow?.email_purchases),
      emailAttributedRevenueCents: asNumber(summaryRow?.email_revenue_cents),
      referralPurchases: asInt(summaryRow?.referral_purchases),
      referralRevenueCents: asNumber(summaryRow?.referral_revenue_cents),
      bridgeToStudioUsers,
      bridgeToStudioRatePct: bridgeBuyers > 0 ? Number(((bridgeToStudioUsers / bridgeBuyers) * 100).toFixed(1)) : 0,
    },
    offers,
    channels: (channelRows as any[]).map((row) => ({
      utmSource: String(row.utm_source),
      utmMedium: String(row.utm_medium),
      utmCampaign: String(row.utm_campaign),
      sessions: asInt(row.sessions),
      purchases: asInt(row.purchases),
      revenueCents: asNumber(row.revenue_cents),
    })),
    lifecycle: (lifecycleRows as any[]).map((row) => ({
      campaignId: row.campaign_id ? asInt(row.campaign_id) : null,
      utmCampaign: String(row.utm_campaign),
      purchases: asInt(row.purchases),
      revenueCents: asNumber(row.revenue_cents),
    })),
    referrals: {
      signups: asInt(referralRow?.signups),
      completed: asInt(referralRow?.completed),
      influencedPurchases: asInt(referralRow?.influenced_purchases),
      influencedRevenueCents: asNumber(referralRow?.influenced_revenue_cents),
    },
    topDropoffs: offers
      .map((offer) => ({
        offerSlug: offer.offerSlug,
        dropoffCount: Math.max(offer.sessions - offer.purchases, 0),
      }))
      .sort((a, b) => b.dropoffCount - a.dropoffCount)
      .slice(0, 5),
  }
}

export async function storeAnalyticsReport(input: {
  reportType:
    | "funnel_daily"
    | "cohorts_weekly"
    | "brand_engine_launch_daily"
    | "product_qa_daily"
    | "arpu_churn_weekly"
    | "cohort_delivery_load_weekly"
    | "maya_instagram_trends_weekly"
    | "revenue_engine_weekly"
    | "content_brief_weekly"
    | "content_brief_research_memo"
    | "daily_sandra_briefing"
  periodStart: Date
  periodEnd: Date
  payload: unknown
}): Promise<number | null> {
  await ensureAnalyticsSchema()
  const sql = getDb()
  const rows = await sql`
    INSERT INTO analytics_reports (report_type, period_start, period_end, payload)
    VALUES (${input.reportType}, ${input.periodStart.toISOString()}, ${input.periodEnd.toISOString()}, ${input.payload})
    ON CONFLICT (report_type, period_start, period_end) DO UPDATE
    SET payload = EXCLUDED.payload,
        created_at = NOW()
    RETURNING id
  `
  return rows[0]?.id == null ? null : Number(rows[0].id)
}

export async function getLatestAnalyticsReports(input: {
  reportType: string
  limit?: number
}): Promise<AnalyticsReportRow[]> {
  await ensureAnalyticsSchema()
  const sql = getDb()
  const limit = input.limit ?? 14
  const rows = await sql`
    SELECT id, report_type, period_start, period_end, payload, created_at
    FROM analytics_reports
    WHERE report_type = ${input.reportType}
    ORDER BY period_start DESC
    LIMIT ${limit}
  `
  return rows as AnalyticsReportRow[]
}
