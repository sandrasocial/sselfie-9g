import "server-only"

import { sql } from "@/lib/db/client"
import { getSingleSourceRevenueMetrics } from "@/lib/revenue/single-source"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import {
  getRevenueTruthScorecard,
  type RevenueTruthScorecard,
} from "@/lib/admin/revenue-truth-scorecard"
import {
  getOneSelfieCampaignScorecard,
  type OneSelfieCampaignScorecard,
} from "@/lib/admin/one-selfie-campaign-scorecard"
import {
  getStudioMemberHealthReport,
  type StudioMemberHealthReport,
} from "@/lib/admin/studio-member-health"
import {
  buildHigherSelfCommandCenter,
  type HigherSelfCommandCenter,
} from "@/lib/admin/higher-self-command-center"
import {
  FOUNDING_ANNUAL_CAP,
  FOUNDING_ANNUAL_CLOSES_AT,
  getFoundingAnnualOfferStatus,
  getFoundingAnnualPurchaseCount,
} from "@/lib/launch/cash-launch-pricing"
import { approvalUrlForAction, listOpenAdminActions } from "@/lib/admin/action-queue"

// Admin data contract: money ONLY from stripe_payments (status succeeded/paid,
// live mode, payment_date window) or the live Stripe API. Member counts only
// from Stripe-verified subscriptions. analytics_events is behavior, never money.

export type AdminHomeReport = {
  money: {
    last48h: { payments: number; revenue: number }
    week: { payments: number; revenue: number }
    month: { payments: number; revenue: number }
    recovered30d: { payments: number; revenue: number }
    byProduct: Array<{ product: string; payments: number; revenue: number }>
    source: "stripe_payments"
  }
  members: {
    active: number
    mrr: number
    mrrByCurrency: Record<string, number>
    grossMrr: number
    grossMrrByCurrency: Record<string, number>
    discountedMembers: number
    new30d: number
    canceled30d: number
    live: boolean
    source: "stripe_live" | "db_fallback"
  }
  scorecard: RevenueTruthScorecard | null
  oneSelfieCampaign: OneSelfieCampaignScorecard | null
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
    webhookReviews: number
    newSupportThreads: number
    approvalActions: Array<{
      id: number
      title: string
      summary: string
      source: string
      status: "pending" | "failed"
      link: string
    }>
  }
  content: {
    briefGeneratedAt: string | null
    nextPostTitle: string | null
    nextPostHook: string | null
    topPrompt: { title: string; copies: number } | null
  }
  commandCenter: HigherSelfCommandCenter
  team: {
    employees: Array<{
      name: string
      role: string
      status: "live" | "paused" | "needs-setup" | "watching"
      lastRun: string | null
      lastResult: string
      destination: string
      source: string
    }>
    diagnostics: {
      errors24h: number
      source: "admin_email_errors"
    }
  }
}

type ProductRow = { product: string | null; payments: number; revenue_cents: string | number }

const PRODUCT_LABELS: Record<string, string> = {
  sselfie_studio_membership: "SSELFIE SUITE",
  prompt_vault: "Prompt Vault",
  starter_kit: "Starter Kit",
  selfie_visibility_bundle: "One Selfie Bundle",
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
  const [
    moneyRows,
    productRows,
    needsMeRows,
    memberMetrics,
    scorecard,
    oneSelfieCampaign,
    briefReports,
    trialRows,
    studioHealth,
    foundingCount,
    cronRows,
    diagnosticsRows,
    actionRows,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '48 hours')::int AS last_48h_payments,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '48 hours'), 0)::bigint AS last_48h_cents,
        COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '7 days')::int AS week_payments,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '7 days'), 0)::bigint AS week_cents,
        COUNT(*) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days')::int AS month_payments,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_date > NOW() - INTERVAL '30 days'), 0)::bigint AS month_cents
        ,COUNT(*) FILTER (
          WHERE (metadata #>> '{payment_recovery,recovered_at}')::timestamptz > NOW() - INTERVAL '30 days'
        )::int AS recovered_30d_payments
        ,COALESCE(SUM(amount_cents) FILTER (
          WHERE (metadata #>> '{payment_recovery,recovered_at}')::timestamptz > NOW() - INTERVAL '30 days'
        ), 0)::bigint AS recovered_30d_cents
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
        (SELECT COUNT(*)::int FROM webhook_events_needs_review WHERE resolved = FALSE) AS webhook_reviews,
        (SELECT COUNT(*)::int FROM feedback WHERE status = 'new' AND created_at >= NOW() - INTERVAL '30 days') AS new_support_threads
    ` as unknown as Promise<any[]>,
    getSingleSourceRevenueMetrics().catch(() => null),
    getRevenueTruthScorecard().catch(error => {
      console.error("[admin-home] revenue truth scorecard failed:", error)
      return null
    }),
    getOneSelfieCampaignScorecard().catch(error => {
      console.error("[admin-home] One Selfie campaign scorecard failed:", error)
      return null
    }),
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
    getStudioMemberHealthReport().catch(error => {
      console.error("[admin-home] studio member health failed:", error)
      return null
    }),
    getFoundingAnnualPurchaseCount().catch(error => {
      console.error("[admin-home] founding annual count failed:", error)
      return 0
    }),
    sql`
      SELECT DISTINCT ON (job_name)
        job_name,
        status,
        started_at,
        finished_at,
        summary
      FROM admin_cron_runs
      WHERE job_name IN (
        'cron-health-check',
        'daily-sandra-briefing',
        'payment-reconciliation'
      )
      ORDER BY job_name, started_at DESC
    `.catch(() => []) as unknown as Promise<any[]>,
    sql`
      SELECT COUNT(*)::int AS errors_24h
      FROM admin_email_errors
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `.catch(() => []) as unknown as Promise<any[]>,
    listOpenAdminActions(8).catch(error => {
      console.error("[admin-home] approval action lookup failed:", error)
      return []
    }),
  ])

  const money = moneyRows[0] || {}
  const needs = needsMeRows[0] || {}

  const brief = (briefReports as any[])[0]?.payload || null
  const firstPiece = brief?.contentPlan?.[0] || null
  const topPrompt = brief?.audienceDemand?.topPrompts?.[0] || null
  const foundingAnnual = getFoundingAnnualOfferStatus(Number(foundingCount || 0))
  const moneyReport = {
    last48h: {
      payments: Number(money.last_48h_payments || 0),
      revenue: Number(money.last_48h_cents || 0) / 100,
    },
    week: {
      payments: Number(money.week_payments || 0),
      revenue: Number(money.week_cents || 0) / 100,
    },
    month: {
      payments: Number(money.month_payments || 0),
      revenue: Number(money.month_cents || 0) / 100,
    },
    recovered30d: {
      payments: Number(money.recovered_30d_payments || 0),
      revenue: Number(money.recovered_30d_cents || 0) / 100,
    },
    byProduct: (productRows || []).map(row => ({
      product: labelProduct(row.product),
      payments: Number(row.payments || 0),
      revenue: Number(row.revenue_cents || 0) / 100,
    })),
    source: "stripe_payments" as const,
  }
  const needsMe = {
    webhookReviews: Number(needs.webhook_reviews || 0),
    newSupportThreads: Number(needs.new_support_threads || 0),
    approvalActions: actionRows.map(action => ({
      id: Number(action.id),
      title: action.title,
      summary: action.summary,
      source: action.source,
      status: action.status as "pending" | "failed",
      link: approvalUrlForAction(action),
    })),
  }
  const content = {
    briefGeneratedAt: brief?.periodEnd || null,
    nextPostTitle: firstPiece?.title || null,
    nextPostHook: firstPiece?.hook || null,
    topPrompt: topPrompt ? { title: topPrompt.title, copies: Number(topPrompt.copies || 0) } : null,
  }
  const cronByJob = new Map<string, any>()
  for (const row of cronRows as any[]) cronByJob.set(String(row.job_name), row)
  const employeeFor = (jobName: string, name: string, role: string, destination: string) => {
    const row = cronByJob.get(jobName)
    return {
      name,
      role,
      status: "live" as const,
      lastRun: row?.started_at ? String(row.started_at) : null,
      lastResult: row?.status ? String(row.status) : "No run logged yet",
      destination,
      source: "admin_cron_runs",
    }
  }
  return {
    money: moneyReport,
    members: {
      active: memberMetrics?.activeSubscriptions ?? 0,
      mrr: memberMetrics?.mrr ?? 0,
      mrrByCurrency: memberMetrics?.mrrByCurrency ?? {},
      grossMrr: memberMetrics?.grossMrr ?? memberMetrics?.mrr ?? 0,
      grossMrrByCurrency: memberMetrics?.grossMrrByCurrency ?? {},
      discountedMembers: memberMetrics?.discountedMembers ?? 0,
      new30d: memberMetrics?.newSubscribers30d ?? 0,
      canceled30d: memberMetrics?.canceledSubscriptions30d ?? 0,
      live: Boolean(memberMetrics && !memberMetrics.cached) || Boolean(memberMetrics?.cached),
      source: memberMetrics ? "stripe_live" : "db_fallback",
    },
    scorecard,
    oneSelfieCampaign,
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
    needsMe,
    content,
    commandCenter: buildHigherSelfCommandCenter({
      money: moneyReport,
      needsMe,
      content,
      scorecard,
    }),
    team: {
      employees: [
        employeeFor(
          "payment-reconciliation",
          "Payment Reconciliation",
          "Confirms Stripe payments are recorded and flags fulfillment drift.",
          "/admin/webhook-review"
        ),
        employeeFor(
          "cron-health-check",
          "Cron Health Watchdog",
          "Watches stale crons, failures, and AI-credit canaries.",
          "admin alert email"
        ),
        employeeFor(
          "daily-sandra-briefing",
          "Daily Sandra Briefing",
          "Sends the one daily money, member, needs-me, and content email.",
          "email to Sandra"
        ),
        {
          name: "Diagnostics APIs",
          role: "Expose cron status and admin errors for the Team panel.",
          status: "watching",
          lastRun: null,
          lastResult: `${Number((diagnosticsRows as any[])[0]?.errors_24h || 0)} admin errors in the last 24h.`,
          destination: "/api/admin/diagnostics/cron-status + /api/admin/diagnostics/errors",
          source: "admin_email_errors",
        },
      ],
      diagnostics: {
        errors24h: Number((diagnosticsRows as any[])[0]?.errors_24h || 0),
        source: "admin_email_errors",
      },
    },
  }
}
