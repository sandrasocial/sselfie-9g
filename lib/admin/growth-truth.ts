import "server-only"

import { sql } from "@/lib/db/client"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"

const GRAPH_BASE = "https://graph.facebook.com/v21.0"
const MAIN_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"

export type GrowthTruthSnapshot = {
  generatedAt: string
  windowDays: number
  sources: {
    instagramProfile: "Instagram Graph API" | "instagram_connections"
    instagramPerformance: "ig_media_snapshots"
    money: "stripe_payments"
    members: "subscriptions"
    email: "Resend Main Audience" | "unavailable"
    manychat: "freebie_subscribers + stripe_payments"
  }
  instagram: {
    username: string
    followers: number | null
    following: number | null
    mediaCount: number | null
    biography: string | null
    website: string | null
  }
  recentInstagram: {
    mediaCount: number
    latestCapturedOn: string | null
    latestPostedAt: string | null
    sumLatestPostReach: number
    sumLatestPostViews: number
    sumLatestPostSaves: number
    sumLatestPostShares: number
    maxSinglePostReach: number
    maxSinglePostViews: number
    reachNote: string
  }
  email: {
    subscribedContacts: number | null
  }
  suite: {
    activePaidMembers: number
    canceledMembers: number
    activeTrials: number
    expiredTrials: number
  }
  promptVault: {
    payments: number
    revenueCents: number
    manychatAttributedPayments: number
    manychatAttributedRevenueCents: number
  }
  manychat: {
    captures: number
    captureToPromptVaultPurchaseRate: number
  }
  revenueByProduct: Array<{
    productType: string
    currency: string
    payments: number
    revenueCents: number
  }>
  leaks: string[]
  positioning: {
    currentPublicLane: string
    avoid: string[]
  }
}

type ConnectionRow = {
  access_token: string
  instagram_user_id: string
  instagram_username: string
}

function toNumber(value: unknown): number {
  return Number(value || 0)
}

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

async function getActiveInstagramConnection(): Promise<ConnectionRow | null> {
  const rows = (await sql`
    SELECT access_token, instagram_user_id, instagram_username
    FROM instagram_connections
    WHERE is_active = true
    ORDER BY id DESC
    LIMIT 1
  `) as ConnectionRow[]
  return rows[0] || null
}

async function fetchInstagramProfile(connection: ConnectionRow | null) {
  const fallback = {
    username: connection?.instagram_username || "sandra.social",
    followers: null,
    following: null,
    mediaCount: null,
    biography: null,
    website: null,
    source: "instagram_connections" as const,
  }

  if (!connection?.access_token || !connection.instagram_user_id) return fallback

  try {
    const res = await fetch(
      `${GRAPH_BASE}/${connection.instagram_user_id}?fields=username,followers_count,follows_count,media_count,biography,website&access_token=${encodeURIComponent(connection.access_token)}`,
      { cache: "no-store" },
    )
    const json = await res.json()
    if (json?.error) return fallback
    return {
      username: String(json.username || fallback.username),
      followers: Number.isFinite(json.followers_count) ? Number(json.followers_count) : null,
      following: Number.isFinite(json.follows_count) ? Number(json.follows_count) : null,
      mediaCount: Number.isFinite(json.media_count) ? Number(json.media_count) : null,
      biography: typeof json.biography === "string" ? json.biography : null,
      website: typeof json.website === "string" ? json.website : null,
      source: "Instagram Graph API" as const,
    }
  } catch {
    return fallback
  }
}

async function getSubscribedContactCount(): Promise<number | null> {
  if (!process.env.RESEND_API_KEY) return null
  try {
    return await getAudienceContactCount(MAIN_AUDIENCE_ID)
  } catch (error) {
    console.error("[growth-truth] Resend subscribed contact count failed:", error)
    return null
  }
}

function buildLeaks(snapshot: Omit<GrowthTruthSnapshot, "leaks">): string[] {
  const leaks: string[] = []

  if (snapshot.manychat.captures >= 100 && snapshot.manychat.captureToPromptVaultPurchaseRate < 3) {
    leaks.push(
      `${snapshot.manychat.captures} ManyChat/email captures but only ${snapshot.promptVault.payments} Prompt Vault purchases in ${snapshot.windowDays} days. Fix the DM/email to Vault offer before asking for more reach.`,
    )
  }

  if (snapshot.promptVault.payments > 0 && snapshot.promptVault.manychatAttributedPayments < Math.max(2, snapshot.promptVault.payments * 0.2)) {
    leaks.push(
      `Only ${snapshot.promptVault.manychatAttributedPayments} of ${snapshot.promptVault.payments} Prompt Vault purchases are clearly ManyChat-attributed. Attribution or the ManyChat purchase bridge is leaking.`,
    )
  }

  if (snapshot.suite.activeTrials > snapshot.suite.activePaidMembers) {
    leaks.push(
      `${snapshot.suite.activeTrials} active Suite trials vs ${snapshot.suite.activePaidMembers} paid members. Trial activation needs to push first selfie upload and first generated result.`,
    )
  }

  if (
    snapshot.instagram.followers !== null &&
    snapshot.recentInstagram.sumLatestPostReach > snapshot.instagram.followers * 3 &&
    snapshot.promptVault.payments < 25
  ) {
    leaks.push(
      `Recent post reach is strong, but Prompt Vault sales are not matching distribution. Treat this as a funnel and offer-clarity problem, not an Instagram reach problem.`,
    )
  }

  if (leaks.length === 0) {
    leaks.push("No major leak is obvious from the current truth snapshot. Keep watching the same sources before changing positioning.")
  }

  return leaks
}

export async function getGrowthTruthSnapshot(
  windowDays = 90,
  options: { includeEmailCount?: boolean } = {},
): Promise<GrowthTruthSnapshot> {
  const interval = `${windowDays} days`
  const connection = await getActiveInstagramConnection()

  const [
    instagramProfile,
    recentInstagramRows,
    suiteRows,
    promptVaultRows,
    manychatRows,
    revenueRows,
    subscribedContacts,
  ] = await Promise.all([
    fetchInstagramProfile(connection),
    sql`
      WITH latest AS (
        SELECT DISTINCT ON (media_id)
          media_id, captured_on, posted_at, views, reach, saves, shares
        FROM ig_media_snapshots
        WHERE posted_at >= NOW() - (${interval}::interval)
        ORDER BY media_id, captured_on DESC
      )
      SELECT
        COUNT(*)::int AS media_count,
        MAX(captured_on)::text AS latest_captured_on,
        MAX(posted_at)::text AS latest_posted_at,
        COALESCE(SUM(reach), 0)::int AS sum_latest_post_reach,
        COALESCE(SUM(views), 0)::int AS sum_latest_post_views,
        COALESCE(SUM(saves), 0)::int AS sum_latest_post_saves,
        COALESCE(SUM(shares), 0)::int AS sum_latest_post_shares,
        COALESCE(MAX(reach), 0)::int AS max_single_post_reach,
        COALESCE(MAX(views), 0)::int AS max_single_post_views
      FROM latest
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE product_type = 'sselfie_studio_membership' AND status = 'active' AND COALESCE(is_test_mode, false) = false)::int AS active_paid_members,
        COUNT(*) FILTER (WHERE product_type = 'sselfie_studio_membership' AND status = 'canceled' AND COALESCE(is_test_mode, false) = false)::int AS canceled_members,
        COUNT(*) FILTER (WHERE product_type = 'suite_trial' AND status = 'active' AND COALESCE(is_test_mode, false) = false)::int AS active_trials,
        COUNT(*) FILTER (WHERE product_type = 'suite_trial' AND status = 'expired' AND COALESCE(is_test_mode, false) = false)::int AS expired_trials
      FROM subscriptions
    `,
    sql`
      SELECT
        COUNT(*)::int AS payments,
        COALESCE(SUM(amount_cents), 0)::int AS revenue_cents,
        COUNT(*) FILTER (
          WHERE source ILIKE '%manychat%'
            OR utm_medium = 'manychat'
            OR checkout_source ILIKE '%manychat%'
        )::int AS manychat_attributed_payments,
        COALESCE(SUM(amount_cents) FILTER (
          WHERE source ILIKE '%manychat%'
            OR utm_medium = 'manychat'
            OR checkout_source ILIKE '%manychat%'
        ), 0)::int AS manychat_attributed_revenue_cents
      FROM stripe_payments
      WHERE payment_date >= NOW() - (${interval}::interval)
        AND status IN ('succeeded', 'paid')
        AND COALESCE(is_test_mode, false) = false
        AND product_type = 'prompt_vault'
    `,
    sql`
      SELECT COUNT(*)::int AS captures
      FROM freebie_subscribers
      WHERE created_at >= NOW() - (${interval}::interval)
        AND (
          source ILIKE '%manychat%'
          OR utm_medium = 'manychat'
          OR tags::text ILIKE '%manychat%'
        )
    `,
    sql`
      SELECT
        COALESCE(product_type, 'unknown') AS product_type,
        currency,
        COUNT(*)::int AS payments,
        COALESCE(SUM(amount_cents), 0)::int AS revenue_cents
      FROM stripe_payments
      WHERE payment_date >= NOW() - (${interval}::interval)
        AND status IN ('succeeded', 'paid')
        AND COALESCE(is_test_mode, false) = false
      GROUP BY 1, 2
      ORDER BY revenue_cents DESC
      LIMIT 12
    `,
    options.includeEmailCount ? getSubscribedContactCount() : Promise.resolve(null),
  ])

  const recent = (recentInstagramRows as any[])[0] || {}
  const suite = (suiteRows as any[])[0] || {}
  const promptVault = (promptVaultRows as any[])[0] || {}
  const manychat = (manychatRows as any[])[0] || {}
  const captures = toNumber(manychat.captures)
  const promptVaultPayments = toNumber(promptVault.payments)

  const snapshotWithoutLeaks = {
    generatedAt: new Date().toISOString(),
    windowDays,
    sources: {
      instagramProfile: instagramProfile.source,
      instagramPerformance: "ig_media_snapshots" as const,
      money: "stripe_payments" as const,
      members: "subscriptions" as const,
      email: subscribedContacts === null ? "unavailable" as const : "Resend Main Audience" as const,
      manychat: "freebie_subscribers + stripe_payments" as const,
    },
    instagram: {
      username: instagramProfile.username,
      followers: instagramProfile.followers,
      following: instagramProfile.following,
      mediaCount: instagramProfile.mediaCount,
      biography: instagramProfile.biography,
      website: instagramProfile.website,
    },
    recentInstagram: {
      mediaCount: toNumber(recent.media_count),
      latestCapturedOn: recent.latest_captured_on || null,
      latestPostedAt: recent.latest_posted_at || null,
      sumLatestPostReach: toNumber(recent.sum_latest_post_reach),
      sumLatestPostViews: toNumber(recent.sum_latest_post_views),
      sumLatestPostSaves: toNumber(recent.sum_latest_post_saves),
      sumLatestPostShares: toNumber(recent.sum_latest_post_shares),
      maxSinglePostReach: toNumber(recent.max_single_post_reach),
      maxSinglePostViews: toNumber(recent.max_single_post_views),
      reachNote: "Sum of latest per-post reach snapshots, not unique account reach.",
    },
    email: {
      subscribedContacts,
    },
    suite: {
      activePaidMembers: toNumber(suite.active_paid_members),
      canceledMembers: toNumber(suite.canceled_members),
      activeTrials: toNumber(suite.active_trials),
      expiredTrials: toNumber(suite.expired_trials),
    },
    promptVault: {
      payments: promptVaultPayments,
      revenueCents: toNumber(promptVault.revenue_cents),
      manychatAttributedPayments: toNumber(promptVault.manychat_attributed_payments),
      manychatAttributedRevenueCents: toNumber(promptVault.manychat_attributed_revenue_cents),
    },
    manychat: {
      captures,
      captureToPromptVaultPurchaseRate: percent(promptVaultPayments, captures),
    },
    revenueByProduct: (revenueRows as any[]).map((row) => ({
      productType: String(row.product_type || "unknown"),
      currency: String(row.currency || "usd"),
      payments: toNumber(row.payments),
      revenueCents: toNumber(row.revenue_cents),
    })),
    positioning: {
      currentPublicLane: "Turn one selfie into AI-assisted brand photos that still look like you.",
      avoid: [
        "Do not position SSELFIE as generic AI headshots.",
        "Do not promise fake photoshoots or images nobody will know are AI.",
        "Do not call trials paid members.",
        "Do not use stale follower, subscriber, member, MRR, or reach numbers from docs.",
      ],
    },
  }

  return {
    ...snapshotWithoutLeaks,
    leaks: buildLeaks(snapshotWithoutLeaks),
  }
}
