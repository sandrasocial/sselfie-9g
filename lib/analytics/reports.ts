import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { getDb } from "@/lib/db/client"

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

function asPct(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
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
    | "content_brief_weekly"
    | "content_brief_research_memo"
    | "daily_sandra_briefing"
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
