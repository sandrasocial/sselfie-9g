import "server-only"

import { sql } from "@/lib/db/client"
import { getSingleSourceRevenueMetrics } from "@/lib/revenue/single-source"

export type RevenueTruthScorecard = {
  generatedAt: string
  sources: {
    activeMembersAndMrr: "Stripe live subscriptions via single-source"
    historicalRevenue: "stripe_payments"
    checkoutBehavior: "checkout_attribution"
    audienceBehavior: "analytics_events"
    workWithMePipeline: "brand_engine_applications + email_logs"
  }
  members: {
    active: number
    netMrr: number
    netMrrByCurrency: Record<string, number>
    grossMrr: number
    grossMrrByCurrency: Record<string, number>
    discountedMembers: number
    new30d: number
    canceled30d: number
  }
  trials: {
    active: number
    expired: number
    claimed30d: number
    firstGeneration30d: number
    downloads30d: number
    paymentFormRendered30d: number
    converted: number
  }
  membershipFunnel30d: {
    pageViews: number
    ctaClicks: number
    checkoutStarts: number
    paymentForms: number
    newPaidMembers: number
  }
  vaultCommercialPath30d: {
    firstResultStarts: number
    offerViews: number
    suiteClicks: number
    suiteDeclines: number
    presetsClicks: number
    suiteCheckoutStarts: number
    suitePayments: number
    suiteFirstPayments: number
    suiteRenewals: number
    suiteRevenue: number
    presetsCheckoutStarts: number
    presetsPayments: number
    presetsRevenue: number
  }
  products30d: Array<{
    productType: string
    payments: number
    customers: number
    revenue: number
  }>
  funnels30d: Array<{
    productType: string
    starts: number
    recoverableStarts: number
    purchases: number
    revenue: number
  }>
  workWithMe: {
    receivedTotal: number
    applications30d: number
    qualifiedOpen: number
    bookedCalls: number
    paymentLinksSent: number
    won: number
    lost: number
  }
  demandSignals: {
    topInstagram: Array<{
      hook: string
      views: number
      comments: number
      saves: number
      shares: number
      permalink: string | null
    }>
    topFreePromptCopies: Array<{ title: string; copies: number }>
    topEmailConverters: Array<{ emailType: string; clicks: number; conversions: number }>
  }
  notes: string[]
}

const PRODUCT_LABELS: Record<string, string> = {
  prompt_vault: "Prompt Vault",
  starter_kit: "Starter Kit",
  sselfie_studio_membership: "SSELFIE SUITE",
  selfie_to_brand_shoot_system: "Selfie to Brand Shoot",
  selfie_to_brand_shoot: "Selfie to Brand Shoot",
  work_with_me: "Work With Me",
}

function productLabel(productType: string | null | undefined) {
  if (!productType) return "Unlabeled"
  return PRODUCT_LABELS[productType] || productType
}

function toNumber(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

export async function getRevenueTruthScorecard(): Promise<RevenueTruthScorecard> {
  const [
    memberMetrics,
    trialRows,
    productRows,
    vaultPaymentRows,
    funnelRows,
    workWithMeRows,
    workWithMeReceiptRows,
    topInstagramRows,
    topFreePromptRows,
    topEmailRows,
  ] = await Promise.all([
    getSingleSourceRevenueMetrics(),
    sql`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'active' AND t.trial_ends_at > NOW())::int AS active,
        COUNT(*) FILTER (WHERE t.status = 'expired' OR t.trial_ends_at <= NOW())::int AS expired,
        COUNT(*) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days')::int AS claimed_30d,
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
    `,
    sql`
      SELECT
        product_type,
        COUNT(*)::int AS payments,
        COUNT(DISTINCT COALESCE(customer_email, stripe_customer_id))::int AS customers,
        COALESCE(SUM(amount_cents), 0)::bigint AS revenue_cents
      FROM stripe_payments
      WHERE status IN ('succeeded', 'paid')
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND payment_date >= NOW() - INTERVAL '30 days'
      GROUP BY product_type
      ORDER BY revenue_cents DESC
      LIMIT 10
    `,
    sql`
      SELECT
        COUNT(*) FILTER (
          WHERE utm_campaign = 'vault_to_suite'
            AND product_type = 'sselfie_studio_membership'
        )::int AS suite_payments,
        COUNT(*) FILTER (
          WHERE utm_campaign = 'vault_to_suite'
            AND product_type = 'sselfie_studio_membership'
            AND metadata->>'billing_reason' = 'subscription_create'
        )::int AS suite_first_payments,
        COUNT(*) FILTER (
          WHERE utm_campaign = 'vault_to_suite'
            AND product_type = 'sselfie_studio_membership'
            AND metadata->>'billing_reason' IN ('subscription_cycle', 'subscription_update')
        )::int AS suite_renewals,
        COALESCE(SUM(amount_cents) FILTER (
          WHERE utm_campaign = 'vault_to_suite'
            AND product_type = 'sselfie_studio_membership'
        ), 0)::bigint AS suite_revenue_cents,
        COUNT(*) FILTER (
          WHERE utm_campaign = 'vault_to_presets'
            AND product_type = 'presets_bundle'
        )::int AS presets_payments,
        COALESCE(SUM(amount_cents) FILTER (
          WHERE utm_campaign = 'vault_to_presets'
            AND product_type = 'presets_bundle'
        ), 0)::bigint AS presets_revenue_cents
      FROM stripe_payments
      WHERE status IN ('succeeded', 'paid')
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        AND payment_date >= NOW() - INTERVAL '30 days'
    `,
    sql`
      SELECT
        product_type,
        COUNT(*) FILTER (WHERE status = 'started')::int AS starts,
        COUNT(*) FILTER (
          WHERE status IN ('started', 'abandoned')
            AND user_email IS NOT NULL
            AND BTRIM(user_email) <> ''
        )::int AS recoverable_starts,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS purchases,
        COALESCE(SUM(purchase_value_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_cents
      FROM checkout_attribution
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY product_type
      ORDER BY starts DESC
      LIMIT 10
    `,
    sql`
      SELECT
        COUNT(*)::int AS applications_total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS applications_30d,
        COUNT(*) FILTER (WHERE pipeline_stage IN ('qualified_queue', 'contacted'))::int AS qualified_open,
        COUNT(*) FILTER (WHERE pipeline_stage IN ('call_booked', 'call_completed'))::int AS booked_calls,
        COUNT(*) FILTER (WHERE pipeline_stage = 'offer_sent')::int AS payment_links_sent,
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')::int AS won,
        COUNT(*) FILTER (WHERE pipeline_stage = 'closed_lost')::int AS lost
      FROM brand_engine_applications
      WHERE source_channel = 'work_with_me'
         OR source_channel = 'work-with-me'
         OR lead_tags ? 'work-with-me'
         OR offer_type = 'work_with_me'
    `.catch(() => []),
    sql`
      SELECT
        COUNT(DISTINCT LOWER(user_email))::int AS receipts_total,
        COUNT(DISTINCT LOWER(user_email)) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
        )::int AS receipts_30d
      FROM email_logs
      WHERE email_type = 'work_with_me_inquiry_confirmation'
        AND status IN ('sent', 'delivered')
        AND NULLIF(BTRIM(user_email), '') IS NOT NULL
    `.catch(() => []),
    sql`
      SELECT hook_line, views, comments, saves, shares, permalink
      FROM (
        SELECT DISTINCT ON (media_id)
          hook_line, views, comments, saves, shares, permalink
        FROM ig_media_snapshots
        WHERE captured_on >= CURRENT_DATE - INTERVAL '30 days'
          AND posted_at >= NOW() - INTERVAL '30 days'
        ORDER BY media_id, captured_on DESC, id DESC
      ) latest_posts
      ORDER BY COALESCE(saves, 0) DESC, COALESCE(shares, 0) DESC, COALESCE(comments, 0) DESC
      LIMIT 5
    `.catch(() => []),
    sql`
      SELECT
        COALESCE(NULLIF(properties->>'prompt_title', ''), NULLIF(properties->>'title', ''), 'Unknown prompt') AS title,
        COUNT(*)::int AS copies
      FROM analytics_events
      WHERE event_name = 'ai_prompts_prompt_copied'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY copies DESC
      LIMIT 5
    `.catch(() => []),
    sql`
      SELECT
        email_type,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL OR clicked = TRUE OR status IN ('clicked', 'converted'))::int AS clicks,
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL OR converted = TRUE OR status = 'converted')::int AS conversions
      FROM email_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY email_type
      HAVING COUNT(*) FILTER (WHERE clicked_at IS NOT NULL OR clicked = TRUE OR status IN ('clicked', 'converted')) > 0
          OR COUNT(*) FILTER (WHERE converted_at IS NOT NULL OR converted = TRUE OR status = 'converted') > 0
      -- Conversion flags can include renewals credited to multiple emails. Do not
      -- use them to rank acquisition performance without a joined purchase cohort.
      ORDER BY clicks DESC, email_type ASC
      LIMIT 8
    `.catch(() => []),
  ])

  const trial = (trialRows as any[])[0] || {}
  const workWithMe = (workWithMeRows as any[])[0] || {}
  const workWithMeReceipts = (workWithMeReceiptRows as any[])[0] || {}
  const netMrrByCurrency = memberMetrics.mrrByCurrency || {}
  const grossMrrByCurrency = memberMetrics.grossMrrByCurrency || {}

  const eventCounts = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'trial_first_generation')::int AS trial_first_generation_30d,
      COUNT(*) FILTER (
        WHERE event_name = 'suite_image_downloaded'
          AND EXISTS (
            SELECT 1 FROM subscriptions download_trial
            WHERE download_trial.user_id::text = analytics_events.user_id
              AND download_trial.product_type = 'suite_trial'
              AND (download_trial.is_test_mode = FALSE OR download_trial.is_test_mode IS NULL)
          )
      )::int AS downloads_30d,
      COUNT(*) FILTER (
        WHERE event_name = 'studio_membership_payment_form_rendered'
          AND COALESCE(properties->>'environment', 'production') = 'production'
      )::int AS payment_form_rendered_30d,
      COUNT(*) FILTER (
        WHERE event_name = 'studio_membership_page_view'
          AND properties->>'environment' = 'production'
      )::int AS membership_page_views_30d,
      COUNT(*) FILTER (
        WHERE event_name = 'studio_membership_page_cta_click'
          AND properties->>'environment' = 'production'
      )::int AS membership_cta_clicks_30d,
      (
        SELECT COUNT(*)::int
        FROM checkout_attribution membership_checkout
        WHERE membership_checkout.product_type IN (
          'sselfie_studio_membership',
          'sselfie_studio_membership_annual'
        )
          AND membership_checkout.created_at >= NOW() - INTERVAL '30 days'
      ) AS membership_checkout_starts_30d
      , COUNT(*) FILTER (
        WHERE event_name = 'prompt_vault_first_result_started'
          AND properties->>'environment' = 'production'
      )::int AS vault_first_result_starts_30d
      , COUNT(*) FILTER (
        WHERE event_name = 'prompt_vault_suite_offer_viewed'
          AND properties->>'environment' = 'production'
      )::int AS vault_offer_views_30d
      , COUNT(*) FILTER (
        WHERE event_name = 'prompt_vault_suite_offer_clicked'
          AND properties->>'environment' = 'production'
      )::int AS vault_suite_clicks_30d
      , COUNT(*) FILTER (
        WHERE event_name = 'prompt_vault_suite_offer_declined'
          AND properties->>'environment' = 'production'
      )::int AS vault_suite_declines_30d
      , COUNT(*) FILTER (
        WHERE event_name = 'prompt_vault_presets_downsell_clicked'
          AND properties->>'environment' = 'production'
      )::int AS vault_presets_clicks_30d
      , (
        SELECT COUNT(*)::int
        FROM checkout_attribution vault_suite_checkout
        WHERE vault_suite_checkout.product_type = 'sselfie_studio_membership'
          AND vault_suite_checkout.utm_campaign = 'vault_to_suite'
          AND vault_suite_checkout.created_at >= NOW() - INTERVAL '30 days'
      ) AS vault_suite_checkout_starts_30d
      , (
        SELECT COUNT(*)::int
        FROM checkout_attribution vault_presets_checkout
        WHERE vault_presets_checkout.product_type = 'presets_bundle'
          AND vault_presets_checkout.utm_campaign = 'vault_to_presets'
          AND vault_presets_checkout.created_at >= NOW() - INTERVAL '30 days'
      ) AS vault_presets_checkout_starts_30d
    FROM analytics_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `.catch(() => [
    {
      trial_first_generation_30d: 0,
      downloads_30d: 0,
      payment_form_rendered_30d: 0,
      membership_page_views_30d: 0,
      membership_cta_clicks_30d: 0,
      membership_checkout_starts_30d: 0,
      vault_first_result_starts_30d: 0,
      vault_offer_views_30d: 0,
      vault_suite_clicks_30d: 0,
      vault_suite_declines_30d: 0,
      vault_presets_clicks_30d: 0,
      vault_suite_checkout_starts_30d: 0,
      vault_presets_checkout_starts_30d: 0,
    },
  ])
  const events = (eventCounts as any[])[0] || {}
  const vaultPayments = (vaultPaymentRows as any[])[0] || {}

  return {
    generatedAt: new Date().toISOString(),
    sources: {
      activeMembersAndMrr: "Stripe live subscriptions via single-source",
      historicalRevenue: "stripe_payments",
      checkoutBehavior: "checkout_attribution",
      audienceBehavior: "analytics_events",
      workWithMePipeline: "brand_engine_applications + email_logs",
    },
    members: {
      active: memberMetrics.activeSubscriptions,
      netMrr: memberMetrics.mrr,
      netMrrByCurrency,
      grossMrr: memberMetrics.grossMrr,
      grossMrrByCurrency,
      discountedMembers: memberMetrics.discountedMembers,
      new30d: memberMetrics.newSubscribers30d,
      canceled30d: memberMetrics.canceledSubscriptions30d,
    },
    trials: {
      active: toNumber(trial.active),
      expired: toNumber(trial.expired),
      claimed30d: toNumber(trial.claimed_30d),
      firstGeneration30d: toNumber(events.trial_first_generation_30d),
      downloads30d: toNumber(events.downloads_30d),
      paymentFormRendered30d: toNumber(events.payment_form_rendered_30d),
      converted: toNumber(trial.converted),
    },
    membershipFunnel30d: {
      pageViews: toNumber(events.membership_page_views_30d),
      ctaClicks: toNumber(events.membership_cta_clicks_30d),
      checkoutStarts: toNumber(events.membership_checkout_starts_30d),
      paymentForms: toNumber(events.payment_form_rendered_30d),
      newPaidMembers: memberMetrics.newSubscribers30d,
    },
    vaultCommercialPath30d: {
      firstResultStarts: toNumber(events.vault_first_result_starts_30d),
      offerViews: toNumber(events.vault_offer_views_30d),
      suiteClicks: toNumber(events.vault_suite_clicks_30d),
      suiteDeclines: toNumber(events.vault_suite_declines_30d),
      presetsClicks: toNumber(events.vault_presets_clicks_30d),
      suiteCheckoutStarts: toNumber(events.vault_suite_checkout_starts_30d),
      suitePayments: toNumber(vaultPayments.suite_payments),
      suiteFirstPayments: toNumber(vaultPayments.suite_first_payments),
      suiteRenewals: toNumber(vaultPayments.suite_renewals),
      suiteRevenue: toNumber(vaultPayments.suite_revenue_cents) / 100,
      presetsCheckoutStarts: toNumber(events.vault_presets_checkout_starts_30d),
      presetsPayments: toNumber(vaultPayments.presets_payments),
      presetsRevenue: toNumber(vaultPayments.presets_revenue_cents) / 100,
    },
    products30d: (productRows as any[]).map(row => ({
      productType: productLabel(row.product_type),
      payments: toNumber(row.payments),
      customers: toNumber(row.customers),
      revenue: toNumber(row.revenue_cents) / 100,
    })),
    funnels30d: (funnelRows as any[]).map(row => ({
      productType: productLabel(row.product_type),
      starts: toNumber(row.starts),
      recoverableStarts: toNumber(row.recoverable_starts),
      purchases: toNumber(row.purchases),
      revenue: toNumber(row.revenue_cents) / 100,
    })),
    workWithMe: {
      receivedTotal: Math.max(
        toNumber(workWithMe.applications_total),
        toNumber(workWithMeReceipts.receipts_total)
      ),
      applications30d: Math.max(
        toNumber(workWithMe.applications_30d),
        toNumber(workWithMeReceipts.receipts_30d)
      ),
      qualifiedOpen: toNumber(workWithMe.qualified_open),
      bookedCalls: toNumber(workWithMe.booked_calls),
      paymentLinksSent: toNumber(workWithMe.payment_links_sent),
      won: toNumber(workWithMe.won),
      lost: toNumber(workWithMe.lost),
    },
    demandSignals: {
      topInstagram: (topInstagramRows as any[]).map(row => ({
        hook: String(row.hook_line || "No hook stored"),
        views: toNumber(row.views),
        comments: toNumber(row.comments),
        saves: toNumber(row.saves),
        shares: toNumber(row.shares),
        permalink: row.permalink ? String(row.permalink) : null,
      })),
      topFreePromptCopies: (topFreePromptRows as any[]).map(row => ({
        title: String(row.title || "Unknown prompt"),
        copies: toNumber(row.copies),
      })),
      topEmailConverters: (topEmailRows as any[]).map(row => ({
        emailType: String(row.email_type || "unknown"),
        clicks: toNumber(row.clicks),
        conversions: toNumber(row.conversions),
      })),
    },
    notes: [
      "Payments are charge rows, not active members.",
      "Members are active Stripe subscriptions only.",
      "MRR is net of discounts.",
      "Skool billing is not included. Suite access grants are not payment evidence.",
      "Email conversion flags are unverified attribution and can include renewals; email signals are ranked by click-marked records, not proven sales.",
      "Historical revenue uses stripe_payments.",
      "SUITE page views and CTA clicks are event counts, not unique people.",
    ],
  }
}
