import "server-only"

import { sql } from "@/lib/db/client"
import { getSingleSourceRevenueMetrics } from "@/lib/revenue/single-source"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { getStudioMemberHealthReport, type StudioMemberHealthReport } from "@/lib/admin/studio-member-health"
import {
  FOUNDING_ANNUAL_CAP,
  FOUNDING_ANNUAL_CLOSES_AT,
  getFoundingAnnualOfferStatus,
  getFoundingAnnualPurchaseCount,
} from "@/lib/launch/cash-launch-pricing"

// Admin data contract: money ONLY from stripe_payments (status succeeded/paid,
// live mode, payment_date window) or the live Stripe API. Member counts only
// from Stripe-verified subscriptions. analytics_events is behavior, never money.

export type AdminHomeReport = {
  money: {
    week: { payments: number; revenue: number }
    month: { payments: number; revenue: number }
    byProduct: Array<{ product: string; payments: number; revenue: number }>
    source: "stripe_payments"
  }
  members: {
    active: number
    mrr: number
    grossMrr: number
    discountedMembers: number
    new30d: number
    canceled30d: number
    live: boolean
    source: "stripe_live" | "db_fallback"
  }
  studioHealth: StudioMemberHealthReport | null
  // BRIDGE-01: SUITE trials are NOT members and carry no money fields.
  // Counts come from subscriptions suite_trial rows; converted = trial users
  // who later hold a membership row.
  trials: {
    active: number
    expired: number
    converted: number
    source: "subscriptions"
  }
  launch: {
    foundingAnnual: {
      sold: number
      remaining: number
      cap: number
      available: boolean
      closesAt: string
      source: "subscriptions"
    }
  }
  needsMe: {
    flaggedConversations: number
    webhookReviews: number
    newSupportThreads: number
  }
  content: {
    briefGeneratedAt: string | null
    nextPostTitle: string | null
    nextPostHook: string | null
    topPrompt: { title: string; copies: number } | null
  }
}

type ProductRow = { product: string | null; payments: number; revenue_cents: string | number }

const PRODUCT_LABELS: Record<string, string> = {
  sselfie_studio_membership: "SSELFIE SUITE",
  prompt_vault: "Prompt Vault",
  starter_kit: "Starter Kit",
  selfie_guide: "Selfie Guide",
  masterclass: "Masterclass",
  paid_blueprint: "Feed Planner",
  brand_strategy_pack: "Brand Strategy",
  credit_topup: "Credit top-ups",
  one_time_session: "One-time session",
  selfie_to_brand_shoot: "Brand Shoot",
}

function labelProduct(product: string | null) {
  if (!product) return "Unlabeled"
  return PRODUCT_LABELS[product] || product
}

export async function getAdminHomeReport(): Promise<AdminHomeReport> {
  const [moneyRows, productRows, needsMeRows, memberMetrics, briefReports, trialRows, studioHealth, foundingCount] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '7 days')::int AS week_payments,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '7 days'), 0)::bigint AS week_cents,
        COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days')::int AS month_payments,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days'), 0)::bigint AS month_cents
      FROM stripe_payments
      WHERE status IN ('succeeded', 'paid')
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND payment_date > NOW() - INTERVAL '30 days'
    ` as unknown as Promise<any[]>,
    sql`
      SELECT
        product_type AS product,
        COUNT(*)::int AS payments,
        COALESCE(SUM(amount_cents), 0)::bigint AS revenue_cents
      FROM stripe_payments
      WHERE status IN ('succeeded', 'paid')
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND payment_date > NOW() - INTERVAL '30 days'
      GROUP BY product_type
      ORDER BY revenue_cents DESC
      LIMIT 8
    ` as unknown as Promise<ProductRow[]>,
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM ig_conversations WHERE status = 'flagged') AS flagged_conversations,
        (SELECT COUNT(*)::int FROM webhook_events_needs_review WHERE resolved = FALSE) AS webhook_reviews,
        (SELECT COUNT(*)::int FROM feedback WHERE status = 'new') AS new_support_threads
    ` as unknown as Promise<any[]>,
    getSingleSourceRevenueMetrics().catch(() => null),
    getLatestAnalyticsReports({ reportType: "content_brief_weekly", limit: 1 }).catch(() => []),
    sql`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'active' AND t.trial_ends_at > NOW())::int AS active,
        COUNT(*) FILTER (WHERE t.status = 'expired' OR t.trial_ends_at <= NOW())::int AS expired,
        COUNT(*) FILTER (WHERE m.user_id IS NOT NULL)::int AS converted
      FROM subscriptions t
      LEFT JOIN LATERAL (
        SELECT user_id FROM subscriptions m
        WHERE m.user_id = t.user_id
          AND m.product_type = 'sselfie_studio_membership'
          AND (m.is_test_mode = FALSE OR m.is_test_mode IS NULL)
          AND m.created_at >= t.created_at
        LIMIT 1
      ) m ON TRUE
      WHERE t.product_type = 'suite_trial'
        AND (t.is_test_mode = FALSE OR t.is_test_mode IS NULL)
    `.catch(() => []) as unknown as Promise<any[]>,
    getStudioMemberHealthReport().catch((error) => {
      console.error("[admin-home] studio member health failed:", error)
      return null
    }),
    getFoundingAnnualPurchaseCount().catch((error) => {
      console.error("[admin-home] founding annual count failed:", error)
      return 0
    }),
  ])

  const money = moneyRows[0] || {}
  const needs = needsMeRows[0] || {}

  const brief = (briefReports as any[])[0]?.payload || null
  const firstPiece = brief?.contentPlan?.[0] || null
  const topPrompt = brief?.audienceDemand?.topPrompts?.[0] || null
  const foundingAnnual = getFoundingAnnualOfferStatus(Number(foundingCount || 0))

  return {
    money: {
      week: {
        payments: Number(money.week_payments || 0),
        revenue: Number(money.week_cents || 0) / 100,
      },
      month: {
        payments: Number(money.month_payments || 0),
        revenue: Number(money.month_cents || 0) / 100,
      },
      byProduct: (productRows || []).map((row) => ({
        product: labelProduct(row.product),
        payments: Number(row.payments || 0),
        revenue: Number(row.revenue_cents || 0) / 100,
      })),
      source: "stripe_payments",
    },
    members: {
      active: memberMetrics?.activeSubscriptions ?? 0,
      mrr: memberMetrics?.mrr ?? 0,
      grossMrr: memberMetrics?.grossMrr ?? memberMetrics?.mrr ?? 0,
      discountedMembers: memberMetrics?.discountedMembers ?? 0,
      new30d: memberMetrics?.newSubscribers30d ?? 0,
      canceled30d: memberMetrics?.canceledSubscriptions30d ?? 0,
      live: Boolean(memberMetrics && !memberMetrics.cached) || Boolean(memberMetrics?.cached),
      source: memberMetrics ? "stripe_live" : "db_fallback",
    },
    studioHealth,
    trials: {
      active: Number((trialRows as any[])[0]?.active || 0),
      expired: Number((trialRows as any[])[0]?.expired || 0),
      converted: Number((trialRows as any[])[0]?.converted || 0),
      source: "subscriptions",
    },
    launch: {
      foundingAnnual: {
        sold: foundingAnnual.sold,
        remaining: foundingAnnual.remaining,
        cap: FOUNDING_ANNUAL_CAP,
        available: foundingAnnual.available,
        closesAt: FOUNDING_ANNUAL_CLOSES_AT,
        source: "subscriptions",
      },
    },
    needsMe: {
      flaggedConversations: Number(needs.flagged_conversations || 0),
      webhookReviews: Number(needs.webhook_reviews || 0),
      newSupportThreads: Number(needs.new_support_threads || 0),
    },
    content: {
      briefGeneratedAt: brief?.periodEnd || null,
      nextPostTitle: firstPiece?.title || null,
      nextPostHook: firstPiece?.hook || null,
      topPrompt: topPrompt ? { title: topPrompt.title, copies: Number(topPrompt.copies || 0) } : null,
    },
  }
}
