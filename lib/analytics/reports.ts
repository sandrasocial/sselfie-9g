import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import {
  BRAND_ENGINE_COHORT_START_DATE,
  BRAND_ENGINE_SEAT_CAP,
  BRAND_ENGINE_TARGET_CALLS_PER_DAY,
  getDaysUntilCohortStart,
} from "@/lib/brand-engine/launch-config"
import { getDb } from "@/lib/db/client"
import { getStripe } from "@/lib/stripe"

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

function asNumber(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

async function listAllStripeSubscriptions(params: Record<string, any>) {
  const stripe = getStripe()
  const all: any[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      limit: 100,
      ...params,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    all.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1]?.id
    }
  }

  return all
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
    plannerStarted: number
    trainedModel: number
    generatedAny: number
    paidActive: number
    retainedD1Proxy: number
    retainedD1ActivityProxy: number
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
      UNION
      SELECT DISTINCT k.user_id
      FROM user_avatar_images uai
      JOIN keys k ON k.key = uai.user_id::text
      WHERE COALESCE(uai.is_active, TRUE) = TRUE
    ),
    planner AS (
      SELECT DISTINCT k.user_id
      FROM feed_posts fp
      JOIN keys k ON k.key = fp.user_id::text
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
    ),
    d1_activity AS (
      SELECT DISTINCT b.user_id
      FROM base b
      WHERE EXISTS (
        SELECT 1
        FROM feed_posts fp
        WHERE fp.user_id::text IN (b.user_id, b.stack_auth_user_id)
          AND fp.created_at >= b.created_at
          AND fp.created_at < b.created_at + INTERVAL '24 hours'
      )
      OR EXISTS (
        SELECT 1
        FROM ai_images ai
        WHERE ai.user_id::text IN (b.user_id, b.stack_auth_user_id)
          AND ai.created_at >= b.created_at
          AND ai.created_at < b.created_at + INTERVAL '24 hours'
      )
      OR EXISTS (
        SELECT 1
        FROM user_models um
        WHERE um.user_id::text IN (b.user_id, b.stack_auth_user_id)
          AND um.created_at >= b.created_at
          AND um.created_at < b.created_at + INTERVAL '24 hours'
      )
      OR EXISTS (
        SELECT 1
        FROM generation_trackers gt
        WHERE gt.user_id::text IN (b.user_id, b.stack_auth_user_id)
          AND gt.created_at >= b.created_at
          AND gt.created_at < b.created_at + INTERVAL '24 hours'
      )
    )
    SELECT
      to_char(cohort_week, 'YYYY-MM-DD') AS cohort_week,
      COUNT(*)::int AS signups,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM selfie))::int AS uploaded_selfies,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM planner))::int AS planner_started,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM trained))::int AS trained_model,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM gen1))::int AS generated_any,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM paid))::int AS paid_active,
      COUNT(*) FILTER (WHERE last_login_at IS NOT NULL AND last_login_at >= created_at + INTERVAL '24 hours')::int AS retained_d1_proxy,
      COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM d1_activity))::int AS retained_d1_activity_proxy
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
      plannerStarted: asInt(r.planner_started),
      trainedModel: asInt(r.trained_model),
      generatedAny: asInt(r.generated_any),
      paidActive: asInt(r.paid_active),
      retainedD1Proxy: asInt(r.retained_d1_proxy),
      retainedD1ActivityProxy: asInt(r.retained_d1_activity_proxy),
    })),
  }
}

export async function generateBrandEngineLaunchDailyReport(input?: {
  hours?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  config: {
    cohortStartDate: string
    seatCap: number
    targetCallsPerDay: number
  }
  metrics: {
    applications24h: number
    qualifiedQueueTotal: number
    callsBooked24h: number
    callsBookedToday: number
    offersSent24h: number
    closesWon24h: number
    closesWonTotal: number
    cashCollected24hCents: string
    cashCollectedTotalCents: string
  }
  conversionOps: {
    applications90d: number
    qualified90d: number
    callsBooked90d: number
    offersSent90d: number
    closedWon90d: number
    cashCollected90dCents: string
    newMemberships30d: number
    churnedMemberships30d: number
    churn30dPct: number
    activeMembershipsNow: number
  }
  pacing: {
    daysToCohortStart: number
    seatsFilled: number
    seatsRemaining: number
    historicalCloseRate: number
    closesPerDayNeeded: number
    callsPerDayNeeded: number
    onTrackCallsToday: boolean
  }
  topQueue: Array<{
    id: number
    name: string
    email: string
    pipelineStage: string
    score: number
    priorityTier: string
    sourceChannel: string
    createdAt: string
  }>
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

  const [funnelCounts] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour')::int AS applications_24h,
      COUNT(*) FILTER (
        WHERE pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent')
      )::int AS qualified_queue_total,
      COUNT(*) FILTER (WHERE call_booked_at > NOW() - ${hours} * INTERVAL '1 hour')::int AS calls_booked_24h,
      COUNT(*) FILTER (WHERE offer_sent_at > NOW() - ${hours} * INTERVAL '1 hour')::int AS offers_sent_24h,
      COUNT(*) FILTER (WHERE closed_at > NOW() - ${hours} * INTERVAL '1 hour' AND pipeline_stage = 'closed_won')::int AS closes_won_24h,
      COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS closes_won_total,
      COALESCE(SUM(cash_collected_cents) FILTER (WHERE closed_at > NOW() - ${hours} * INTERVAL '1 hour'), 0)::bigint AS cash_24h_cents,
      COALESCE(SUM(cash_collected_cents), 0)::bigint AS cash_total_cents
    FROM brand_engine_applications
  `

  const [callsToday] = await sql`
    SELECT COUNT(*)::int AS calls_booked_today
    FROM brand_engine_applications
    WHERE call_booked_at >= date_trunc('day', NOW())
      AND call_booked_at < date_trunc('day', NOW()) + INTERVAL '1 day'
  `

  const [callTotals] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE call_booked_at IS NOT NULL)::int AS total_calls,
      COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS total_wins
    FROM brand_engine_applications
  `

  const [conversionOps90d] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days')::int AS applications_90d,
      COUNT(*) FILTER (
        WHERE created_at > NOW() - INTERVAL '90 days'
          AND (
            COALESCE(qualified, FALSE) = TRUE
            OR pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent', 'closed_won')
          )
      )::int AS qualified_90d,
      COUNT(*) FILTER (WHERE call_booked_at > NOW() - INTERVAL '90 days')::int AS calls_booked_90d,
      COUNT(*) FILTER (WHERE offer_sent_at > NOW() - INTERVAL '90 days')::int AS offers_sent_90d,
      COUNT(*) FILTER (WHERE closed_at > NOW() - INTERVAL '90 days' AND pipeline_stage = 'closed_won')::int AS closed_won_90d,
      COALESCE(SUM(cash_collected_cents) FILTER (WHERE closed_at > NOW() - INTERVAL '90 days' AND pipeline_stage = 'closed_won'), 0)::bigint AS cash_90d_cents
    FROM brand_engine_applications
  `

  const [membershipOps] = await sql`
    WITH membership_subs AS (
      SELECT *
      FROM subscriptions s
      WHERE COALESCE(s.product_type, '') IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
        AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
    )
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_memberships_now,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_memberships_30d,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(status, '')) IN ('canceled', 'cancelled')
          AND COALESCE(
            NULLIF(to_jsonb(membership_subs)->>'canceled_at', '')::timestamptz,
            NULLIF(to_jsonb(membership_subs)->>'cancelled_at', '')::timestamptz,
            updated_at,
            created_at
          ) > NOW() - INTERVAL '30 days'
      )::int AS churned_memberships_30d
    FROM membership_subs
  `

  const topQueueRows = await sql`
    SELECT
      id,
      name,
      email,
      COALESCE(pipeline_stage, 'applied') AS pipeline_stage,
      COALESCE(qualification_score, 0)::int AS qualification_score,
      COALESCE(priority_tier, 'low') AS priority_tier,
      COALESCE(source_channel, 'unknown') AS source_channel,
      created_at
    FROM brand_engine_applications
    WHERE pipeline_stage IN ('qualified_queue', 'contacted', 'call_booked', 'call_completed', 'offer_sent')
    ORDER BY qualification_score DESC, created_at ASC
    LIMIT 10
  `

  const closesWonTotal = asInt(funnelCounts?.closes_won_total)
  const seatsFilled = closesWonTotal
  const seatsRemaining = Math.max(0, BRAND_ENGINE_SEAT_CAP - seatsFilled)
  const daysToCohortStart = getDaysUntilCohortStart(new Date(periodEnd))
  const historicalCloseRateRaw =
    asInt(callTotals?.total_calls) > 0 ? asInt(callTotals?.total_wins) / asInt(callTotals?.total_calls) : 0.2
  const historicalCloseRate = Number(historicalCloseRateRaw.toFixed(3))
  const closesPerDayNeeded = daysToCohortStart > 0 ? seatsRemaining / daysToCohortStart : seatsRemaining
  const callsPerDayNeeded = closesPerDayNeeded > 0 ? closesPerDayNeeded / Math.max(historicalCloseRate, 0.1) : 0
  const activeMembershipsNow = asInt(membershipOps?.active_memberships_now)
  const newMemberships30d = asInt(membershipOps?.new_memberships_30d)
  const churnedMemberships30d = asInt(membershipOps?.churned_memberships_30d)
  const activeMemberships30dAgoEstimate = Math.max(1, activeMembershipsNow + churnedMemberships30d - newMemberships30d)
  const churn30dPct = Number(((churnedMemberships30d / activeMemberships30dAgoEstimate) * 100).toFixed(1))

  return {
    periodStart,
    periodEnd,
    config: {
      cohortStartDate: BRAND_ENGINE_COHORT_START_DATE,
      seatCap: BRAND_ENGINE_SEAT_CAP,
      targetCallsPerDay: BRAND_ENGINE_TARGET_CALLS_PER_DAY,
    },
    metrics: {
      applications24h: asInt(funnelCounts?.applications_24h),
      qualifiedQueueTotal: asInt(funnelCounts?.qualified_queue_total),
      callsBooked24h: asInt(funnelCounts?.calls_booked_24h),
      callsBookedToday: asInt(callsToday?.calls_booked_today),
      offersSent24h: asInt(funnelCounts?.offers_sent_24h),
      closesWon24h: asInt(funnelCounts?.closes_won_24h),
      closesWonTotal,
      cashCollected24hCents: asBigInt(funnelCounts?.cash_24h_cents).toString(),
      cashCollectedTotalCents: asBigInt(funnelCounts?.cash_total_cents).toString(),
    },
    conversionOps: {
      applications90d: asInt(conversionOps90d?.applications_90d),
      qualified90d: asInt(conversionOps90d?.qualified_90d),
      callsBooked90d: asInt(conversionOps90d?.calls_booked_90d),
      offersSent90d: asInt(conversionOps90d?.offers_sent_90d),
      closedWon90d: asInt(conversionOps90d?.closed_won_90d),
      cashCollected90dCents: asBigInt(conversionOps90d?.cash_90d_cents).toString(),
      newMemberships30d,
      churnedMemberships30d,
      churn30dPct,
      activeMembershipsNow,
    },
    pacing: {
      daysToCohortStart,
      seatsFilled,
      seatsRemaining,
      historicalCloseRate,
      closesPerDayNeeded: Number(closesPerDayNeeded.toFixed(2)),
      callsPerDayNeeded: Number(callsPerDayNeeded.toFixed(2)),
      onTrackCallsToday: asInt(callsToday?.calls_booked_today) >= BRAND_ENGINE_TARGET_CALLS_PER_DAY,
    },
    topQueue: (topQueueRows as any[]).map((row) => ({
      id: asInt(row.id),
      name: String(row.name || ""),
      email: String(row.email || ""),
      pipelineStage: String(row.pipeline_stage || "applied"),
      score: asInt(row.qualification_score),
      priorityTier: String(row.priority_tier || "low"),
      sourceChannel: String(row.source_channel || "unknown"),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  }
}

function recurringAmountToMonthlyCents(amountCents: number, interval: string) {
  if (interval === "month") return amountCents
  if (interval === "year") return Math.round(amountCents / 12)
  if (interval === "week") return Math.round(amountCents * 4.33)
  if (interval === "day") return amountCents * 30
  return 0
}

function membershipSubscriptionMonthlyCents(subscription: any) {
  const item = subscription?.items?.data?.[0]
  const price = item?.price
  const recurring = price?.recurring
  if (!recurring || !price) return 0
  return recurringAmountToMonthlyCents(Number(price.unit_amount || 0), String(recurring.interval || "month"))
}

function isForeverHalfOff(subscription: any) {
  const coupon = subscription?.discount?.coupon
  const percentOff = Number(coupon?.percent_off || 0)
  const duration = String(coupon?.duration || "")
  return duration === "forever" && percentOff >= 50
}

function isMembershipSubscription(subscription: any, membershipPriceId: string) {
  const item = subscription?.items?.data?.[0]
  const price = item?.price
  if (!price?.recurring) return false
  if (!membershipPriceId) return true
  return String(price.id || "") === membershipPriceId
}

export async function generateArpuChurnWeeklyReport(input?: {
  lookbackDays?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  metrics: {
    membershipMrrCents: number
    activeMemberships: number
    arpuCents: number
    arpuEuro: number
    discountedMembershipsActive: number
    discountedSharePct: number
    fullPriceMembershipsActive: number
    newMemberships30d: number
    churnedMemberships30d: number
    churn30dPct: number
  }
  freezeGuard: {
    discountedDeltaVsLastWeek: number
    freezeHolding: boolean
    note: string
  }
}> {
  const lookbackDays = input?.lookbackDays ?? 30
  await ensureAnalyticsSchema()
  const sql = getDb()
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - lookbackDays * 24 * 60 * 60 * 1000)
  const membershipPriceId = String(process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "").trim()
  const fallbackDiscountThresholdCents = Number(process.env.BETA_DISCOUNT_THRESHOLD_CENTS || 6000)
  const thirtyDaysAgoUnix = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  const [activeStripeSubs, allRecentStripeSubs, canceledStripeSubs, previousReportRows] = await Promise.all([
    listAllStripeSubscriptions({ status: "active", expand: ["data.items.data.price", "data.discount.coupon"] }),
    listAllStripeSubscriptions({
      status: "all",
      created: { gte: thirtyDaysAgoUnix },
      expand: ["data.items.data.price", "data.discount.coupon"],
    }),
    listAllStripeSubscriptions({ status: "canceled", expand: ["data.items.data.price", "data.discount.coupon"] }),
    sql`
      SELECT payload
      FROM analytics_reports
      WHERE report_type = 'arpu_churn_weekly'
      ORDER BY period_end DESC
      LIMIT 1
    `,
  ])

  const liveActiveMemberships = activeStripeSubs
    .filter((sub: any) => Boolean(sub?.livemode))
    .filter((sub: any) => isMembershipSubscription(sub, membershipPriceId))

  const membershipMrrCents = liveActiveMemberships.reduce((sum: number, sub: any) => {
    const base = membershipSubscriptionMonthlyCents(sub)
    const coupon = sub?.discount?.coupon
    const percentOff = Number(coupon?.percent_off || 0)
    const effective = Math.round(base * (1 - Math.max(0, Math.min(percentOff, 100)) / 100))
    return sum + effective
  }, 0)

  const discountedMembershipsActive = liveActiveMemberships.filter((sub: any) => {
    if (isForeverHalfOff(sub)) return true
    const base = membershipSubscriptionMonthlyCents(sub)
    return base > 0 && base <= fallbackDiscountThresholdCents
  }).length

  const activeMemberships = liveActiveMemberships.length
  const fullPriceMembershipsActive = Math.max(0, activeMemberships - discountedMembershipsActive)
  const discountedSharePct = activeMemberships > 0 ? Number(((discountedMembershipsActive / activeMemberships) * 100).toFixed(1)) : 0
  const arpuCents = activeMemberships > 0 ? Math.round(membershipMrrCents / activeMemberships) : 0

  const newMemberships30d = allRecentStripeSubs
    .filter((sub: any) => Boolean(sub?.livemode))
    .filter((sub: any) => isMembershipSubscription(sub, membershipPriceId)).length

  const churnedMemberships30d = canceledStripeSubs
    .filter((sub: any) => Boolean(sub?.livemode))
    .filter((sub: any) => isMembershipSubscription(sub, membershipPriceId))
    .filter((sub: any) => Number(sub?.canceled_at || 0) >= thirtyDaysAgoUnix).length

  const activeMemberships30dAgoEstimate = Math.max(1, activeMemberships + churnedMemberships30d - newMemberships30d)
  const churn30dPct = Number(((churnedMemberships30d / activeMemberships30dAgoEstimate) * 100).toFixed(1))

  const previousDiscountedCount = asInt((previousReportRows as any[])?.[0]?.payload?.metrics?.discountedMembershipsActive)
  const discountedDeltaVsLastWeek = discountedMembershipsActive - previousDiscountedCount

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    metrics: {
      membershipMrrCents,
      activeMemberships,
      arpuCents,
      arpuEuro: Number((arpuCents / 100).toFixed(2)),
      discountedMembershipsActive,
      discountedSharePct,
      fullPriceMembershipsActive,
      newMemberships30d,
      churnedMemberships30d,
      churn30dPct,
    },
    freezeGuard: {
      discountedDeltaVsLastWeek,
      freezeHolding: discountedDeltaVsLastWeek <= 0,
      note:
        discountedDeltaVsLastWeek <= 0
          ? "Discount freeze is holding or improving."
          : "Discounted memberships increased vs last week; review pricing path and coupons.",
    },
  }
}

type CohortDeliveryMode = "live" | "async"

export async function logCohortDeliveryLoadEntry(input: {
  mode: CohortDeliveryMode
  hours: number
  sessionDate?: string
  cohortLabel?: string | null
  notes?: string | null
  loggedBy?: string | null
}) {
  await ensureAnalyticsSchema()
  const sql = getDb()
  const sessionDate = input.sessionDate || new Date().toISOString().slice(0, 10)
  const hours = Math.max(0, Number(input.hours || 0))

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Hours must be greater than zero.")
  }

  const rows = await sql`
    INSERT INTO cohort_delivery_load_logs (
      session_date,
      mode,
      hours,
      cohort_label,
      notes,
      logged_by
    )
    VALUES (
      ${sessionDate},
      ${input.mode},
      ${hours},
      ${input.cohortLabel || null},
      ${input.notes || null},
      ${input.loggedBy || "admin"}
    )
    RETURNING id, session_date, mode, hours, cohort_label, notes, logged_by, created_at
  `

  return (rows as any[])[0]
}

export async function generateCohortDeliveryLoadReport(input?: {
  months?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  summary: {
    liveHours30d: number
    asyncHours30d: number
    totalHours30d: number
    asyncRatio30dPct: number
    liveRatio30dPct: number
    asyncTargetMet: boolean
  }
  monthly: Array<{
    month: string
    liveHours: number
    asyncHours: number
    totalHours: number
    asyncRatioPct: number
  }>
  recentEntries: Array<{
    id: number
    sessionDate: string
    mode: CohortDeliveryMode
    hours: number
    cohortLabel: string | null
    notes: string | null
    createdAt: string
  }>
}> {
  const months = Math.max(1, Math.min(12, input?.months ?? 4))
  await ensureAnalyticsSchema()
  const sql = getDb()
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - months * 31 * 24 * 60 * 60 * 1000)

  const [summaryRow, monthlyRows, recentRows] = await Promise.all([
    sql`
      SELECT
        COALESCE(SUM(hours) FILTER (WHERE mode = 'live' AND session_date >= CURRENT_DATE - INTERVAL '30 days'), 0)::numeric AS live_hours_30d,
        COALESCE(SUM(hours) FILTER (WHERE mode = 'async' AND session_date >= CURRENT_DATE - INTERVAL '30 days'), 0)::numeric AS async_hours_30d
      FROM cohort_delivery_load_logs
    `,
    sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', session_date), 'YYYY-MM') AS month,
        COALESCE(SUM(hours) FILTER (WHERE mode = 'live'), 0)::numeric AS live_hours,
        COALESCE(SUM(hours) FILTER (WHERE mode = 'async'), 0)::numeric AS async_hours
      FROM cohort_delivery_load_logs
      WHERE session_date >= DATE_TRUNC('month', CURRENT_DATE) - (${months - 1}) * INTERVAL '1 month'
      GROUP BY DATE_TRUNC('month', session_date)
      ORDER BY DATE_TRUNC('month', session_date) DESC
    `,
    sql`
      SELECT id, session_date, mode, hours, cohort_label, notes, created_at
      FROM cohort_delivery_load_logs
      ORDER BY session_date DESC, created_at DESC
      LIMIT 20
    `,
  ])

  const liveHours30d = asNumber((summaryRow as any[])?.[0]?.live_hours_30d)
  const asyncHours30d = asNumber((summaryRow as any[])?.[0]?.async_hours_30d)
  const totalHours30d = liveHours30d + asyncHours30d
  const asyncRatio30dPct = totalHours30d > 0 ? Number(((asyncHours30d / totalHours30d) * 100).toFixed(1)) : 0
  const liveRatio30dPct = totalHours30d > 0 ? Number(((liveHours30d / totalHours30d) * 100).toFixed(1)) : 0

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    summary: {
      liveHours30d: Number(liveHours30d.toFixed(1)),
      asyncHours30d: Number(asyncHours30d.toFixed(1)),
      totalHours30d: Number(totalHours30d.toFixed(1)),
      asyncRatio30dPct,
      liveRatio30dPct,
      asyncTargetMet: asyncRatio30dPct >= 60,
    },
    monthly: (monthlyRows as any[]).map((row) => {
      const liveHours = asNumber(row.live_hours)
      const asyncHours = asNumber(row.async_hours)
      const totalHours = liveHours + asyncHours
      return {
        month: String(row.month || ""),
        liveHours: Number(liveHours.toFixed(1)),
        asyncHours: Number(asyncHours.toFixed(1)),
        totalHours: Number(totalHours.toFixed(1)),
        asyncRatioPct: totalHours > 0 ? Number(((asyncHours / totalHours) * 100).toFixed(1)) : 0,
      }
    }),
    recentEntries: (recentRows as any[]).map((row) => ({
      id: asInt(row.id),
      sessionDate: new Date(row.session_date).toISOString().slice(0, 10),
      mode: String(row.mode || "live") as CohortDeliveryMode,
      hours: Number(asNumber(row.hours).toFixed(1)),
      cohortLabel: row.cohort_label ? String(row.cohort_label) : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  }
}

export async function generateProductQaDailyReport(input?: {
  hours?: number
}): Promise<{
  periodStart: string
  periodEnd: string
  metrics: {
    newUsers: number
    checkoutStarts: number
    purchases: number
    purchaseConversionPct: number
    activationSignups: number
    activationSelfies: number
    activationFirstGeneration: number
    activationRatePct: number
  }
  featureHealth: {
    brandEngine: { applications24h: number; closesWon24h: number; cashCollected24hCents: string }
    maya: { photos24h: number; videos24h: number; motionPromptVideos24h: number }
    feedPlanner: { feedsCreated24h: number; postsGenerated24h: number }
    gallery: { aiImages24h: number; videos24h: number }
    academy: { opens24h: number; lessonStarts24h: number; downloads24h: number }
  }
  reliability: {
    failedCrons24h: number
    adminErrors24h: number
    emailBounces24h: number
    stuckFeedPosts15m: number
    stuckAiImages15m: number
    stuckProPhotoshoots15m: number
  }
  topRisks: Array<{
    key: string
    severity: "critical" | "high" | "medium"
    count: number
    summary: string
    recommendation: string
  }>
}> {
  const hours = input?.hours ?? 24
  await ensureAnalyticsSchema()
  const sql = getDb()

  const safeRow = async <T extends Record<string, any>>(query: () => Promise<any[]>, fallback: T): Promise<T> => {
    try {
      const rows = await query()
      return (rows?.[0] as T) || fallback
    } catch {
      return fallback
    }
  }

  const [period] = await sql`
    SELECT
      NOW() - ${hours} * INTERVAL '1 hour' AS period_start,
      NOW() AS period_end
  `

  const periodStart = new Date(period.period_start).toISOString()
  const periodEnd = new Date(period.period_end).toISOString()

  const eventCounts = await safeRow(
    () => sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'checkout_start')::int AS checkout_starts,
        COUNT(*) FILTER (WHERE event_name = 'purchase')::int AS purchases,
        COUNT(*) FILTER (WHERE event_name = 'academy_opened')::int AS academy_opens,
        COUNT(*) FILTER (WHERE event_name = 'academy_lesson_started')::int AS academy_lesson_starts,
        COUNT(*) FILTER (WHERE event_name = 'academy_resource_download')::int AS academy_downloads
      FROM analytics_events
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `,
    {
      checkout_starts: 0,
      purchases: 0,
      academy_opens: 0,
      academy_lesson_starts: 0,
      academy_downloads: 0,
    },
  )

  const newUsers = await safeRow(
    () => sql`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
    `,
    { count: 0 },
  )

  const activation = await safeRow(
    () => sql`
      WITH base AS (
        SELECT id::text AS user_id, stack_auth_user_id::text AS stack_auth_user_id, created_at
        FROM users
        WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour'
      ),
      keys AS (
        SELECT b.user_id, b.created_at, k.key
        FROM base b
        CROSS JOIN LATERAL unnest(
          array_remove(ARRAY[b.user_id, b.stack_auth_user_id], NULL)
        ) AS k(key)
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
    `,
    { signups: 0, users_with_selfies: 0, users_with_generation: 0 },
  )

  const maya = await safeRow(
    () => sql`
      SELECT
        (SELECT COUNT(*)::int FROM ai_images WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS photos,
        (SELECT COUNT(*)::int FROM generated_videos WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS videos,
        (SELECT COUNT(*)::int FROM generated_videos WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour' AND COALESCE(BTRIM(motion_prompt), '') <> '') AS motion_prompt_videos
    `,
    { photos: 0, videos: 0, motion_prompt_videos: 0 },
  )

  const feedPlanner = await safeRow(
    () => sql`
      SELECT
        (SELECT COUNT(*)::int FROM feed_layouts WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour') AS feeds_created,
        (SELECT COUNT(*)::int FROM feed_posts WHERE updated_at > NOW() - ${hours} * INTERVAL '1 hour' AND image_url IS NOT NULL) AS posts_generated
    `,
    { feeds_created: 0, posts_generated: 0 },
  )

  const brandEngine = await safeRow(
    () => sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - ${hours} * INTERVAL '1 hour')::int AS applications_24h,
        COUNT(*) FILTER (WHERE closed_at > NOW() - ${hours} * INTERVAL '1 hour' AND pipeline_stage = 'closed_won')::int AS closes_won_24h,
        COALESCE(SUM(cash_collected_cents) FILTER (WHERE closed_at > NOW() - ${hours} * INTERVAL '1 hour'), 0)::bigint AS cash_24h_cents
      FROM brand_engine_applications
    `,
    { applications_24h: 0, closes_won_24h: 0, cash_24h_cents: 0 },
  )

  const reliability = await safeRow(
    () => sql`
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
    `,
    {
      failed_crons: 0,
      admin_errors: 0,
      bounced_emails: 0,
      stuck_feed_posts: 0,
      stuck_ai_images: 0,
      stuck_pro_photoshoots: 0,
    },
  )

  const checkoutStarts = asInt(eventCounts.checkout_starts)
  const purchases = asInt(eventCounts.purchases)
  const purchaseConversionPct = checkoutStarts > 0 ? Number(((purchases / checkoutStarts) * 100).toFixed(1)) : 0
  const activationSignups = asInt(activation.signups)
  const activationFirstGeneration = asInt(activation.users_with_generation)
  const activationRatePct =
    activationSignups > 0 ? Number(((activationFirstGeneration / activationSignups) * 100).toFixed(1)) : 0

  const riskCandidates: Array<{
    key: string
    severity: "critical" | "high" | "medium"
    count: number
    summary: string
    recommendation: string
  }> = []

  const failedCrons = asInt(reliability.failed_crons)
  const adminErrors = asInt(reliability.admin_errors)
  const bouncedEmails = asInt(reliability.bounced_emails)
  const stuckTotal =
    asInt(reliability.stuck_feed_posts) +
    asInt(reliability.stuck_ai_images) +
    asInt(reliability.stuck_pro_photoshoots)

  if (failedCrons > 0) {
    riskCandidates.push({
      key: "cron_failures",
      severity: "critical",
      count: failedCrons,
      summary: `${failedCrons} cron failure(s) in the last ${hours}h.`,
      recommendation: "Inspect failing cron logs first and rerun only after root cause is fixed.",
    })
  }
  if (adminErrors > 0) {
    riskCandidates.push({
      key: "admin_errors",
      severity: "high",
      count: adminErrors,
      summary: `${adminErrors} admin error(s) recorded in the last ${hours}h.`,
      recommendation: "Cluster by tool_name and fix the top recurring source before shipping growth changes.",
    })
  }
  if (stuckTotal > 0) {
    riskCandidates.push({
      key: "stuck_generations",
      severity: "high",
      count: stuckTotal,
      summary: `${stuckTotal} generation item(s) are stuck for more than 15 minutes.`,
      recommendation: "Run reconciliation and verify prediction/status sync for feed, AI images, and pro photoshoots.",
    })
  }
  if (activationSignups >= 5 && activationRatePct < 25) {
    riskCandidates.push({
      key: "activation_dropoff",
      severity: "medium",
      count: activationSignups - activationFirstGeneration,
      summary: `Activation is low: ${activationFirstGeneration}/${activationSignups} reached first generation.`,
      recommendation: "Prioritize first-image onboarding and remove non-essential setup before first output.",
    })
  }
  if (bouncedEmails >= 10) {
    riskCandidates.push({
      key: "email_bounces",
      severity: "medium",
      count: bouncedEmails,
      summary: `${bouncedEmails} bounced email(s) in the last ${hours}h.`,
      recommendation: "Suppress invalid recipients and review sender/domain health before the next campaign wave.",
    })
  }

  const severityRank: Record<"critical" | "high" | "medium", number> = { critical: 3, high: 2, medium: 1 }
  const topRisks = riskCandidates.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.count - a.count)

  return {
    periodStart,
    periodEnd,
    metrics: {
      newUsers: asInt(newUsers.count),
      checkoutStarts,
      purchases,
      purchaseConversionPct,
      activationSignups,
      activationSelfies: asInt(activation.users_with_selfies),
      activationFirstGeneration,
      activationRatePct,
    },
    featureHealth: {
      brandEngine: {
        applications24h: asInt(brandEngine.applications_24h),
        closesWon24h: asInt(brandEngine.closes_won_24h),
        cashCollected24hCents: asBigInt(brandEngine.cash_24h_cents).toString(),
      },
      maya: {
        photos24h: asInt(maya.photos),
        videos24h: asInt(maya.videos),
        motionPromptVideos24h: asInt(maya.motion_prompt_videos),
      },
      feedPlanner: {
        feedsCreated24h: asInt(feedPlanner.feeds_created),
        postsGenerated24h: asInt(feedPlanner.posts_generated),
      },
      gallery: {
        aiImages24h: asInt(maya.photos),
        videos24h: asInt(maya.videos),
      },
      academy: {
        opens24h: asInt(eventCounts.academy_opens),
        lessonStarts24h: asInt(eventCounts.academy_lesson_starts),
        downloads24h: asInt(eventCounts.academy_downloads),
      },
    },
    reliability: {
      failedCrons24h: failedCrons,
      adminErrors24h: adminErrors,
      emailBounces24h: bouncedEmails,
      stuckFeedPosts15m: asInt(reliability.stuck_feed_posts),
      stuckAiImages15m: asInt(reliability.stuck_ai_images),
      stuckProPhotoshoots15m: asInt(reliability.stuck_pro_photoshoots),
    },
    topRisks,
  }
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
