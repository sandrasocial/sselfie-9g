import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import {
  BRAND_ENGINE_COHORT_START_DATE,
  BRAND_ENGINE_SEAT_CAP,
  BRAND_ENGINE_TARGET_CALLS_PER_DAY,
  getDaysUntilCohortStart,
} from "@/lib/brand-engine/launch-config"
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

export async function storeAnalyticsReport(input: {
  reportType: "funnel_daily" | "cohorts_weekly" | "brand_engine_launch_daily" | "product_qa_daily"
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
