import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { getDb } from "@/lib/db"

function asInt(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function asBigInt(v: any) {
  try {
    return BigInt(v ?? 0)
  } catch {
    return BigInt(0)
  }
}

export async function generateFunnelDailyReport(input?: {
  hours?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  metrics: {
    landingViews: number
    pricingViews: number
    checkoutStarts: number
    purchases: number
    newUsers: number
    newSubscriptions: number
    abandonedCheckouts: number
    aiImagesCreated: number
    generationTrackersCreated: number
    stripePaymentsCount: number
    stripePaymentsSumCents: string
    studioOpenedUsers: number
  }
}> {
  const hours = input?.hours ?? 24

  await ensureAnalyticsSchema()
  const sql = getDb()

  const [period] = await sql`
    SELECT
      NOW() - ${hours} * INTERVAL '1 hour' AS period_start,
      NOW() AS period_end
  `

  const periodStart = new Date(period.period_start).toISOString()
  const periodEnd = new Date(period.period_end).toISOString()

  const [landing] = await sql`
    SELECT COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'landing_view'
      AND created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [pricing] = await sql`
    SELECT COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'pricing_view'
      AND created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [checkoutStarts] = await sql`
    SELECT COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'checkout_start'
      AND created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [purchases] = await sql`
    SELECT COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'purchase'
      AND created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [studioOpenedUsers] = await sql`
    SELECT COUNT(DISTINCT COALESCE(user_id, anon_id))::int AS count
    FROM analytics_events
    WHERE event_name = 'studio_opened'
      AND created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `

  const [newUsers] = await sql`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [newSubs] = await sql`
    SELECT COUNT(*)::int AS count
    FROM subscriptions
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [abandons] = await sql`
    SELECT COUNT(*)::int AS count
    FROM abandoned_checkouts
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [aiImages] = await sql`
    SELECT COUNT(*)::int AS count
    FROM ai_images
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [genTrackers] = await sql`
    SELECT COUNT(*)::int AS count
    FROM generation_trackers
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `
  const [payments] = await sql`
    SELECT
      COUNT(*)::int AS count,
      SUM(COALESCE(amount_cents, 0))::bigint AS sum_cents
    FROM stripe_payments
    WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
  `

  return {
    periodStart,
    periodEnd,
    metrics: {
      landingViews: asInt(landing?.count),
      pricingViews: asInt(pricing?.count),
      checkoutStarts: asInt(checkoutStarts?.count),
      purchases: asInt(purchases?.count),
      newUsers: asInt(newUsers?.count),
      newSubscriptions: asInt(newSubs?.count),
      abandonedCheckouts: asInt(abandons?.count),
      aiImagesCreated: asInt(aiImages?.count),
      generationTrackersCreated: asInt(genTrackers?.count),
      stripePaymentsCount: asInt(payments?.count),
      stripePaymentsSumCents: asBigInt(payments?.sum_cents).toString(),
      studioOpenedUsers: asInt(studioOpenedUsers?.count),
    },
  }
}

export async function generateCohortWeeklyReport(input?: {
  weeks?: number
}): Promise<{
  weeks: number
  rows: Array<{
    cohortWeek: string
    signups: number
    uploadedSelfies: number
    trainedModel: number
    generatedAny: number
    paidActive: number
    retainedD1Proxy: number
  }>
}> {
  const weeks = input?.weeks ?? 8
  const sql = getDb()

  const rows = await sql`
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

  return {
    weeks,
    rows: (rows as any[]).map((r) => ({
      cohortWeek: String(r.cohort_week),
      signups: asInt(r.signups),
      uploadedSelfies: asInt(r.uploaded_selfies),
      trainedModel: asInt(r.trained_model),
      generatedAny: asInt(r.generated_any),
      paidActive: asInt(r.paid_active),
      retainedD1Proxy: asInt(r.retained_d1_proxy),
    })),
  }
}

export async function storeAnalyticsReport(input: {
  reportType: "funnel_daily" | "cohorts_weekly"
  periodStart: Date
  periodEnd: Date
  payload: any
}) {
  await ensureAnalyticsSchema()
  const sql = getDb()
  await sql`
    INSERT INTO analytics_reports (report_type, period_start, period_end, payload)
    VALUES (${input.reportType}, ${input.periodStart.toISOString()}, ${input.periodEnd.toISOString()}, ${input.payload})
    ON CONFLICT (report_type, period_start, period_end) DO UPDATE
    SET payload = EXCLUDED.payload,
        created_at = NOW()
  `
}

export async function getLatestAnalyticsReports(input: { reportType: string; limit?: number }) {
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
  return rows as any[]
}

