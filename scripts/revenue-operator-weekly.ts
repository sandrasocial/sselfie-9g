/**
 * Aggregate-only, read-only weekly Revenue Operator pack.
 *
 * Usage:
 *   pnpm revenue:weekly -- --as-of 2026-08-10T07:00:00.000Z --window-days 7
 *
 * Writes ignored JSON + Markdown files under output/automation. It never sends,
 * mutates a provider, changes a customer record, or prints customer-level data.
 */

/* eslint-disable no-console -- CLI returns aggregate source status and output paths. */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend } from "resend"
import Stripe from "stripe"

import { MAYA_TIER_PILOT } from "../lib/business/maya-tier-pilot"

import {
  reconcileCash,
  type CashReconciliation,
  type LedgerPayment,
  type LiveChargeTruth,
} from "../lib/revenue-operator/cash-reconciliation"
import { getConfiguredMembershipPriceIds, isMembershipSubscription } from "../lib/revenue/membership-subscription-filter"
import { calculateSubscriptionAmount, getSubscriptionCoupon } from "../lib/revenue/subscription-amount"
import {
  buildRevenueOperatorPack,
  createComparisonWindows,
  parseCompletedGatesPack,
  parsePreviousDecisionPack,
  renderRevenueOperatorMarkdown,
  type FunnelWindow,
  type CompletedGate,
  type PreviousDecision,
  type RevenueOperatorInput,
  type SourceHealth,
  type SourceName,
} from "../lib/revenue-operator/weekly-pack"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

type SqlClient = ReturnType<typeof neon>

const PROMPT_VAULT_CAMPAIGN_KEYS = [
  "prompt_vault_proof_recovery_2026_08",
  "prompt_vault_proof_event_2026_08",
] as const
const PROMPT_VAULT_BROADCASTS = [
  { id: "fa3ec7a9-bf83-427f-b561-ec34f99f2c4f", scheduledAt: "2026-08-11T08:30:00.000Z" },
  { id: "34ac74a1-5216-45d1-9665-885815debfde", scheduledAt: "2026-08-13T08:45:00.000Z" },
  { id: "8d6e9101-c4fd-468a-8d16-ea197fc56a1b", scheduledAt: "2026-08-15T09:00:00.000Z" },
] as const
const PROMPT_VAULT_RESPONSE_WINDOW_MS = 72 * 60 * 60 * 1000
const MAYA_VALUE_TEST_CAMPAIGN_KEY = MAYA_TIER_PILOT.campaignKey
const PROTECTED_JOB_MAX_AGE_HOURS: Record<string, number> = {
  "resolve-pending-payments": 2,
  "reconcile-subscriptions": 2,
  "prompt-vault-checkout-recovery": 2,
  "payment-reconciliation": 36,
}

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function n(value: unknown): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function id(value: unknown): string | null {
  const normalized = String(value || "").trim()
  return normalized || null
}

function productLabel(value: unknown): string {
  const key = String(value || "unknown")
  return ({
    prompt_vault: "Prompt Vault",
    sselfie_studio_membership: "SSELFIE SUITE",
    starter_kit: "Starter Kit",
    presets_bundle: "Presets",
    presets_single: "Presets",
    credit_topup: "Credit top-up",
    selfie_visibility_bundle: "One Selfie Visibility Bundle",
  } as Record<string, string>)[key] || key
}

function source(
  sourceName: SourceName,
  status: SourceHealth["status"],
  checkedAt: string,
  affects?: string,
  freshestRecordAt?: string | null
): SourceHealth {
  return { source: sourceName, status, checkedAt, affects, freshestRecordAt }
}

async function loadLedger(
  sql: SqlClient,
  windows: ReturnType<typeof createComparisonWindows>,
  extraPaymentIds: string[] = []
): Promise<LedgerPayment[]> {
  const extraIds = extraPaymentIds.length ? extraPaymentIds : ["__none__"]
  const rows = (await sql`
    WITH ranked AS (
      SELECT
        stripe_payment_id,
        stripe_invoice_id,
        product_type,
        currency,
        amount_cents,
        payment_date,
        utm_campaign,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(NULLIF(stripe_payment_id, ''), id::text)
          ORDER BY payment_date DESC, id DESC
        ) AS duplicate_rank
      FROM stripe_payments
      WHERE status IN ('succeeded', 'paid')
        AND COALESCE(is_test_mode, FALSE) = FALSE
        AND amount_cents > 0
        AND (
          (payment_date >= ${windows.previous.start} AND payment_date < ${windows.current.end})
          OR stripe_payment_id = ANY(${extraIds}::text[])
          OR stripe_invoice_id = ANY(${extraIds}::text[])
        )
    )
    SELECT stripe_payment_id, stripe_invoice_id, product_type, currency, amount_cents,
      payment_date::text, utm_campaign
    FROM ranked
    WHERE duplicate_rank = 1
    ORDER BY payment_date, stripe_payment_id
  `) as Array<Record<string, unknown>>
  return rows.flatMap(row => {
    const paymentId = id(row.stripe_payment_id)
    if (!paymentId) return []
    return [{
      paymentId,
      invoiceId: id(row.stripe_invoice_id),
      product: productLabel(row.product_type),
      currency: String(row.currency || "UNKNOWN"),
      amountMinor: n(row.amount_cents),
      paidAt: String(row.payment_date),
      utmCampaign: id(row.utm_campaign),
    }]
  })
}

function chargeTruth(charge: Stripe.Charge): LiveChargeTruth {
  const legacyInvoice = id((charge as Stripe.Charge & { invoice?: string | Stripe.Invoice | null }).invoice)
  return {
    chargeId: charge.id,
    paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
    invoiceIds: legacyInvoice ? [legacyInvoice] : [],
    currency: charge.currency,
    grossMinor: charge.amount,
    refunds: [],
    createdAt: new Date(charge.created * 1000).toISOString(),
    livemode: charge.livemode,
    paid: charge.paid,
    status: charge.status,
  }
}

async function listLiveChargeTruth(
  stripe: Stripe,
  windows: ReturnType<typeof createComparisonWindows>
): Promise<LiveChargeTruth[]> {
  const charges: Stripe.Charge[] = []
  let startingAfter: string | undefined
  do {
    const page = await stripe.charges.list({
      limit: 100,
      created: {
        gte: Math.floor(new Date(windows.previous.start).getTime() / 1000),
        lt: Math.ceil(new Date(windows.current.end).getTime() / 1000),
      },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    charges.push(...page.data)
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined
  } while (startingAfter)

  const truths = charges.map(chargeTruth)
  const byCharge = new Map(truths.map(item => [item.chargeId, item]))
  const upsertCharge = (charge: Stripe.Charge) => {
    const existing = byCharge.get(charge.id)
    if (existing) return existing
    const truth = chargeTruth(charge)
    truths.push(truth)
    byCharge.set(truth.chargeId, truth)
    return truth
  }

  let refundStartingAfter: string | undefined
  do {
    const page = await stripe.refunds.list({
      limit: 100,
      created: {
        gte: Math.floor(new Date(windows.previous.start).getTime() / 1000),
        lt: Math.ceil(new Date(windows.current.end).getTime() / 1000),
      },
      expand: ["data.charge"],
      ...(refundStartingAfter ? { starting_after: refundStartingAfter } : {}),
    })
    for (const refund of page.data) {
      const expandedCharge = typeof refund.charge === "object" && refund.charge ? refund.charge : null
      const chargeId = typeof refund.charge === "string" ? refund.charge : expandedCharge?.id || null
      if (!chargeId) continue
      const truth = byCharge.get(chargeId) || upsertCharge(expandedCharge || await stripe.charges.retrieve(chargeId))
      if (!truth.refunds.some(item => item.refundId === refund.id)) {
        truth.refunds.push({
          refundId: refund.id,
          amountMinor: refund.amount,
          createdAt: new Date(refund.created * 1000).toISOString(),
        })
      }
    }
    refundStartingAfter = page.has_more ? page.data.at(-1)?.id : undefined
  } while (refundStartingAfter)

  return truths
}

async function attachInvoiceIds(
  stripe: Stripe,
  truths: LiveChargeTruth[],
  ledger: LedgerPayment[]
): Promise<void> {
  const byCharge = new Map(truths.map(item => [item.chargeId, item]))
  const byPaymentIntent = new Map(truths.flatMap(item => item.paymentIntentId ? [[item.paymentIntentId, item] as const] : []))
  const unresolvedInvoices = [...new Set(ledger.flatMap(row => row.invoiceId ? [row.invoiceId] : row.paymentId.startsWith("in_") ? [row.paymentId] : []))]
    .filter(invoiceId => !truths.some(item => item.invoiceIds.includes(invoiceId)))

  for (const invoiceId of unresolvedInvoices) {
    let invoiceStartingAfter: string | undefined
    do {
      const page = await stripe.invoicePayments.list({
        invoice: invoiceId,
        status: "paid",
        limit: 100,
        expand: ["data.payment.charge", "data.payment.payment_intent.latest_charge"],
        ...(invoiceStartingAfter ? { starting_after: invoiceStartingAfter } : {}),
      })
      for (const payment of page.data) {
        const chargeValue = payment.payment.charge
        const intentValue = payment.payment.payment_intent
        const directCharge = typeof chargeValue === "string" ? byCharge.get(chargeValue) : chargeValue ? byCharge.get(chargeValue.id) : null
        const paymentIntentId = typeof intentValue === "string" ? intentValue : intentValue?.id || null
        const intentCharge = paymentIntentId ? byPaymentIntent.get(paymentIntentId) : null
        const expandedLatest = typeof intentValue === "object" && intentValue
          ? intentValue.latest_charge
          : null
        const latestCharge = typeof expandedLatest === "string"
          ? byCharge.get(expandedLatest)
          : expandedLatest
            ? byCharge.get(expandedLatest.id)
            : null
        const truth = directCharge || intentCharge || latestCharge
        if (truth && !truth.invoiceIds.includes(invoiceId)) truth.invoiceIds.push(invoiceId)
      }
      invoiceStartingAfter = page.has_more ? page.data.at(-1)?.id : undefined
    } while (invoiceStartingAfter)
  }
}

type PromptVaultDelivery = {
  exposureComplete: boolean
  measurementMaturesAt: string
  freshestRecordAt: string | null
}

async function loadPromptVaultDelivery(resend: Resend, asOf: Date): Promise<PromptVaultDelivery> {
  const broadcasts = await Promise.all(PROMPT_VAULT_BROADCASTS.map(async expected => {
    const { data, error } = await resend.broadcasts.get(expected.id)
    if (error || !data) throw new Error(`Unable to verify approved broadcast ${expected.id}`)
    const record = data as unknown as Record<string, unknown>
    return {
      status: String(record.status || "unknown"),
      sentAt: id(record.sent_at),
      scheduledAt: id(record.scheduled_at) || expected.scheduledAt,
    }
  }))
  const allSent = broadcasts.every(item => item.status === "sent" && item.sentAt)
  const latestDelivery = broadcasts
    .map(item => item.sentAt || item.scheduledAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || PROMPT_VAULT_BROADCASTS.at(-1)!.scheduledAt
  const measurementMaturesAt = new Date(
    new Date(latestDelivery).getTime() + PROMPT_VAULT_RESPONSE_WINDOW_MS
  ).toISOString()
  return {
    exposureComplete: allSent && asOf.getTime() >= new Date(measurementMaturesAt).getTime(),
    measurementMaturesAt,
    freshestRecordAt: allSent ? latestDelivery : null,
  }
}

async function loadMembership(stripe: Stripe): Promise<NonNullable<RevenueOperatorInput["membership"]>> {
  const subscriptions: Stripe.Subscription[] = []
  let startingAfter: string | undefined
  do {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.discounts.source.coupon"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    subscriptions.push(...page.data)
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined
  } while (startingAfter)

  const configuredPriceIds = getConfiguredMembershipPriceIds()
  const members = subscriptions.filter(subscription => isMembershipSubscription(subscription, configuredPriceIds))
  const netMrrByCurrency = members.reduce<Record<string, number>>((totals, subscription) => {
    const currency = String(subscription.items.data[0]?.price?.currency || "unknown").toUpperCase()
    totals[currency] = Math.round(((totals[currency] || 0) + calculateSubscriptionAmount(subscription)) * 100) / 100
    return totals
  }, {})
  const discounted = members.filter(subscription => {
    const coupon = getSubscriptionCoupon(subscription)
    return n(coupon?.percent_off) > 0 || n(coupon?.amount_off) > 0
  }).length
  return { active: members.length, discounted, netMrrByCurrency }
}

type PromptBehavior = {
  current: Omit<FunnelWindow, "checkoutStarts" | "qualifyingPayments" | "campaignAttributedPayments">
  previous: Omit<FunnelWindow, "checkoutStarts" | "qualifyingPayments" | "campaignAttributedPayments">
  freshestRecordAt: string | null
}

async function loadPromptBehavior(sql: SqlClient, windows: ReturnType<typeof createComparisonWindows>): Promise<PromptBehavior> {
  const [row] = (await sql`
    SELECT
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'ai_prompts_subscribed')::int AS current_leads,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.previous.start} AND created_at < ${windows.previous.end} AND event_name = 'ai_prompts_subscribed')::int AS previous_leads,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'ai_prompts_prompt_copied')::int AS current_prompt_copies,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.previous.start} AND created_at < ${windows.previous.end} AND event_name = 'ai_prompts_prompt_copied')::int AS previous_prompt_copies,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.current.start} AND event_name IN ('ai_prompts_prompt_vault_click', 'ai_prompts_locked_vault_tile_click'))::int AS current_handoff_clicks,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.previous.start} AND created_at < ${windows.previous.end} AND event_name IN ('ai_prompts_prompt_vault_click', 'ai_prompts_locked_vault_tile_click'))::int AS previous_handoff_clicks,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'prompt_vault_landing_view')::int AS current_vault_views,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(anon_id, ''), 'event:' || id::text)) FILTER (WHERE created_at >= ${windows.previous.start} AND created_at < ${windows.previous.end} AND event_name = 'prompt_vault_landing_view')::int AS previous_vault_views,
      MAX(created_at) FILTER (WHERE event_name IN ('ai_prompts_subscribed', 'ai_prompts_prompt_copied', 'ai_prompts_prompt_vault_click', 'ai_prompts_locked_vault_tile_click', 'prompt_vault_landing_view'))::text AS freshest_record_at
    FROM analytics_events
    WHERE created_at >= ${windows.previous.start}
      AND created_at < ${windows.current.end}
  `) as Array<Record<string, unknown>>
  return {
    current: {
      leads: n(row?.current_leads),
      promptCopies: n(row?.current_prompt_copies),
      paidHandoffClicks: n(row?.current_handoff_clicks),
      vaultViews: n(row?.current_vault_views),
    },
    previous: {
      leads: n(row?.previous_leads),
      promptCopies: n(row?.previous_prompt_copies),
      paidHandoffClicks: n(row?.previous_handoff_clicks),
      vaultViews: n(row?.previous_vault_views),
    },
    freshestRecordAt: id(row?.freshest_record_at),
  }
}

async function loadCheckoutBehavior(sql: SqlClient, windows: ReturnType<typeof createComparisonWindows>) {
  const [row] = (await sql`
    SELECT
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE created_at >= ${windows.current.start})::int AS current_checkout_starts,
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE created_at >= ${windows.previous.start} AND created_at < ${windows.previous.end})::int AS previous_checkout_starts,
      MAX(created_at)::text AS freshest_record_at
    FROM checkout_attribution
    WHERE created_at >= ${windows.previous.start}
      AND created_at < ${windows.current.end}
      AND product_type = 'prompt_vault'
      AND source <> 'codex_smoke_test'
  `) as Array<Record<string, unknown>>
  return {
    current: n(row?.current_checkout_starts),
    previous: n(row?.previous_checkout_starts),
    freshestRecordAt: id(row?.freshest_record_at),
  }
}

async function loadMaya(
  sql: SqlClient,
  windows: ReturnType<typeof createComparisonWindows>,
  netCampaignPaymentIds: string[]
) {
  const paymentIds = netCampaignPaymentIds.length ? netCampaignPaymentIds : ["__none__"]
  const [row] = (await sql`
    WITH active_access AS (
      SELECT DISTINCT user_id::text AS user_id
      FROM subscriptions
      WHERE product_type = 'sselfie_studio_membership'
        AND status = 'active'
        AND COALESCE(is_test_mode, FALSE) = FALSE
    ), jobs AS (
      SELECT
        ae.user_id::text AS user_id,
        ae.event_name,
        ae.created_at,
        ae.properties,
        NULLIF(ae.properties->>'task_id', '') AS task_id
      FROM analytics_events ae
      JOIN active_access access ON access.user_id = ae.user_id::text
      WHERE ae.created_at >= ${windows.previous.start}
        AND ae.created_at < ${windows.current.end}
        AND ae.event_name IN (
          'suite_maya_job_started',
          'suite_maya_job_finished',
          'suite_weekly_package_started',
          'suite_weekly_package_planned',
          'calendar_post_ready'
        )
    ), test_purchases AS (
      SELECT DISTINCT ON (stripe_payment_id)
        stripe_payment_id,
        user_id::text AS user_id,
        payment_date
      FROM stripe_payments
      WHERE stripe_payment_id = ANY(${paymentIds}::text[])
        AND utm_campaign = ${MAYA_VALUE_TEST_CAMPAIGN_KEY}
        AND product_type = 'sselfie_studio_membership'
        AND status IN ('succeeded', 'paid')
        AND COALESCE(is_test_mode, FALSE) = FALSE
      ORDER BY stripe_payment_id, payment_date DESC
    ), purchase_outcomes AS (
      SELECT
        purchase.stripe_payment_id,
        purchase.payment_date,
        purchase.user_id,
        COUNT(DISTINCT jobs.task_id) FILTER (
          WHERE jobs.event_name = 'suite_maya_job_finished'
            AND jobs.properties->>'outcome' = 'completed'
            AND jobs.properties->>'job' = 'finish_calendar_post'
            AND jobs.created_at >= purchase.payment_date
            AND jobs.created_at <= purchase.payment_date + INTERVAL '10 days'
        ) AS outcomes_in_ten_days,
        BOOL_OR(
          jobs.event_name = 'suite_maya_job_finished'
          AND jobs.properties->>'outcome' = 'completed'
          AND jobs.properties->>'job' = 'finish_calendar_post'
          AND jobs.created_at >= purchase.payment_date
          AND jobs.created_at <= purchase.payment_date + INTERVAL '48 hours'
        ) AS first_outcome_in_48h
      FROM test_purchases purchase
      LEFT JOIN jobs ON jobs.user_id = purchase.user_id
      GROUP BY purchase.stripe_payment_id, purchase.payment_date, purchase.user_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM active_access) AS active_access_rows,
      COUNT(DISTINCT user_id) FILTER (WHERE created_at >= ${windows.current.start})::int AS active_members,
      COUNT(DISTINCT task_id) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'suite_maya_job_started')::int AS jobs_started,
      COUNT(DISTINCT task_id) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'suite_maya_job_finished' AND properties->>'outcome' = 'completed')::int AS jobs_completed,
      COUNT(DISTINCT task_id) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'suite_maya_job_finished' AND properties->>'outcome' = 'completed' AND properties->>'job' = 'finish_calendar_post')::int AS finished_post_jobs,
      COUNT(*) FILTER (WHERE created_at >= ${windows.current.start} AND event_name = 'calendar_post_ready')::int AS calendar_posts_ready,
      MAX(created_at)::text AS freshest_record_at,
      (SELECT COUNT(*)::int FROM test_purchases) AS qualifying_monthly_purchases,
      (SELECT COUNT(*)::int FROM purchase_outcomes WHERE payment_date <= ${windows.current.end}::timestamptz - INTERVAL '48 hours') AS first_outcome_mature_purchases,
      (SELECT COUNT(*)::int FROM purchase_outcomes WHERE payment_date <= ${windows.current.end}::timestamptz - INTERVAL '48 hours' AND first_outcome_in_48h) AS first_outcomes_within_48h,
      (SELECT COUNT(*)::int FROM purchase_outcomes WHERE payment_date <= ${windows.current.end}::timestamptz - INTERVAL '10 days') AS second_outcome_mature_purchases,
      (SELECT COUNT(*)::int FROM purchase_outcomes WHERE payment_date <= ${windows.current.end}::timestamptz - INTERVAL '10 days' AND outcomes_in_ten_days >= 2) AS second_outcomes_within_10d
    FROM jobs
  `) as Array<Record<string, unknown>>
  return {
    campaignKey: MAYA_VALUE_TEST_CAMPAIGN_KEY,
    activeAccessRows: n(row?.active_access_rows),
    activeMembers: n(row?.active_members),
    jobsStarted: n(row?.jobs_started),
    jobsCompleted: n(row?.jobs_completed),
    finishedPostJobs: n(row?.finished_post_jobs),
    calendarPostsReady: n(row?.calendar_posts_ready),
    qualifyingMonthlyPurchases: n(row?.qualifying_monthly_purchases),
    firstOutcomeMaturePurchases: n(row?.first_outcome_mature_purchases),
    firstOutcomesWithin48h: n(row?.first_outcomes_within_48h),
    secondOutcomeMaturePurchases: n(row?.second_outcome_mature_purchases),
    secondOutcomesWithin10d: n(row?.second_outcomes_within_10d),
    freshestRecordAt: id(row?.freshest_record_at),
  }
}

async function loadOperations(sql: SqlClient, asOf: string) {
  const [summary, latestRows] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM webhook_events_needs_review WHERE resolved = FALSE) AS open_payment_reviews,
        (SELECT COUNT(*)::int FROM feedback WHERE status IN ('new', 'reviewing') AND type = 'bug') AS open_bugs,
        (SELECT COUNT(*)::int
          FROM feedback
          WHERE type = 'bug'
            AND founder_test_status IS NOT NULL
            AND founder_test_status NOT IN ('verified', 'deferred')
        ) AS open_maya_release_blockers
    `,
    sql`
      SELECT DISTINCT ON (job_name) job_name, status, started_at::text
      FROM admin_cron_runs
      WHERE started_at < ${asOf}
        AND job_name IN (
          'resolve-pending-payments',
          'reconcile-subscriptions',
          'payment-reconciliation',
          'prompt-vault-checkout-recovery'
        )
      ORDER BY job_name, started_at DESC
    `,
  ])
  const row = (summary as Array<Record<string, unknown>>)[0]
  const latest = latestRows as Array<Record<string, unknown>>
  const byJob = new Map(latest.map(item => [String(item.job_name), item]))
  const staleProtectedJobs = Object.entries(PROTECTED_JOB_MAX_AGE_HOURS).flatMap(([jobName, maxAgeHours]) => {
    const job = byJob.get(jobName)
    const startedAt = id(job?.started_at)
    if (!startedAt) return [jobName]
    const age = new Date(asOf).getTime() - new Date(startedAt).getTime()
    return age > maxAgeHours * 60 * 60 * 1000 ? [jobName] : []
  })
  const failedProtectedJobs = latest.filter(item => String(item.status) === "failed").length
  const freshestRecordAt = latest
    .map(item => id(item.started_at))
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || null
  return {
    openPaymentReviews: n(row?.open_payment_reviews),
    failedProtectedJobs,
    openBugs: n(row?.open_bugs),
    openMayaReleaseBlockers: n(row?.open_maya_release_blockers),
    staleProtectedJobs,
    freshestRecordAt,
  }
}

function verifiedRecently(value: string | undefined, asOf: Date, maxAgeDays = 7): boolean {
  const time = new Date(String(value || "")).getTime()
  const age = asOf.getTime() - time
  return Number.isFinite(time) && age >= 0 && age <= maxAgeDays * 24 * 60 * 60 * 1000
}

function loadMayaTestReadiness(
  asOf: Date,
  operations: RevenueOperatorInput["operations"]
): RevenueOperatorInput["mayaTestReadiness"] {
  const cohort = new Set(
    String(process.env.MAYA_VALUE_TEST_ALLOWLIST || "")
      .split(",")
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean)
  )
  const boundedCohort = cohort.size > 0 && cohort.size <= 20
  return {
    cohortSelected: boundedCohort && verifiedRecently(process.env.MAYA_VALUE_TEST_COHORT_AUDITED_AT, asOf),
    mayaHomeAccessVerified: boundedCohort && verifiedRecently(process.env.MAYA_VALUE_TEST_ACCESS_VERIFIED_AT, asOf),
    checkoutVerified: verifiedRecently(process.env.MAYA_VALUE_TEST_CHECKOUT_VERIFIED_AT, asOf),
    defectGateClear: Boolean(operations && operations.openMayaReleaseBlockers === 0),
    invitationPrepared: readFileSync(
      resolve(process.cwd(), "docs", "business", "SSELFIE_COMEBACK_EXECUTION_PACK_2026-08-09.md"),
      "utf8"
    ).includes("Invitation draft held for the later approval pack"),
  }
}

function assertAggregateOnly(value: unknown) {
  const serialized = JSON.stringify(value)
  if (/[^\s"']+@[^\s"']+/.test(serialized)) {
    throw new Error("Revenue Operator pack blocked: email-shaped value detected")
  }
  for (const key of ["customer_email", "user_email", "user_name", "message", "attachment"]) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Revenue Operator pack blocked: customer field ${key} detected`)
    }
  }
}

function readLatestOperatorState(outputDir: string): {
  previousDecision: PreviousDecision | null
  completedGates: CompletedGate[]
} {
  const candidates = readdirSync(outputDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^revenue-operator-weekly-\d{4}-\d{2}-\d{2}\.json$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
    .reverse()
  for (const name of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(resolve(outputDir, name), "utf8")) as unknown
      assertAggregateOnly(parsed)
      return {
        previousDecision: parsePreviousDecisionPack(parsed),
        completedGates: parseCompletedGatesPack(parsed),
      }
    } catch {
      continue
    }
  }
  return { previousDecision: null, completedGates: [] }
}

async function main() {
  const asOf = new Date(arg("--as-of") || new Date().toISOString())
  const generatedAt = new Date()
  const windowDays = Number(arg("--window-days") || 7)
  const windows = createComparisonWindows(asOf, windowDays)
  const asOfIso = asOf.toISOString()
  const checkedAt = generatedAt.toISOString()
  const outputDir = resolve(process.cwd(), "output", "automation")
  mkdirSync(outputDir, { recursive: true })
  const previousState = readLatestOperatorState(outputDir)
  // Enforce the read-only boundary at the database transaction layer as well as in code.
  const sql = neon(requiredEnv("DATABASE_URL"), { readOnly: true })
  const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY").replace(/\r|\n|\t/g, "").trim())
  const resend = new Resend(requiredEnv("RESEND_API_KEY").replace(/\r|\n|\t/g, "").trim())
  const sourceHealth: SourceHealth[] = []

  let cashResult: CashReconciliation = {
    cash: [],
    campaignPayments: {},
    netPaymentIdsByCampaign: {},
    unmatchedLedgerPayments: 0,
    unmatchedLiveCharges: 0,
    duplicateLedgerPayments: 0,
    unknownCurrencies: 0,
  }
  try {
    const liveCharges = await listLiveChargeTruth(stripe, windows)
    const liveIdentifiers = liveCharges.flatMap(charge => [
      charge.chargeId,
      ...(charge.paymentIntentId ? [charge.paymentIntentId] : []),
      ...charge.invoiceIds,
    ])
    const ledger = await loadLedger(sql, windows, liveIdentifiers)
    await attachInvoiceIds(stripe, liveCharges, ledger)
    cashResult = reconcileCash(ledger, liveCharges, windows)
    const reconciliationProblems =
      cashResult.unmatchedLedgerPayments +
      cashResult.unmatchedLiveCharges +
      cashResult.unknownCurrencies
    sourceHealth.push(source(
      "stripe_payments",
      reconciliationProblems ? "stale" : "ok",
      checkedAt,
      reconciliationProblems
        ? `live reconciliation incomplete: ${cashResult.unmatchedLedgerPayments} ledger, ${cashResult.unmatchedLiveCharges} Stripe, ${cashResult.unknownCurrencies} currency`
        : undefined
    ))
  } catch {
    sourceHealth.push(source("stripe_payments", "unavailable", checkedAt, "net cash and purchase gates"))
  }

  let promptDelivery: PromptVaultDelivery | null = null
  try {
    promptDelivery = await loadPromptVaultDelivery(resend, asOf)
    sourceHealth.push(source(
      "resend_broadcasts",
      "ok",
      checkedAt,
      undefined,
      promptDelivery.freshestRecordAt
    ))
  } catch {
    sourceHealth.push(source("resend_broadcasts", "unavailable", checkedAt, "Prompt Vault exposure gate"))
  }

  let membership: RevenueOperatorInput["membership"] = null
  try {
    membership = await loadMembership(stripe)
    sourceHealth.push(source("stripe_subscriptions", "ok", checkedAt))
  } catch {
    sourceHealth.push(source("stripe_subscriptions", "unavailable", checkedAt, "active members and MRR"))
  }

  let promptBehavior: PromptBehavior | null = null
  try {
    promptBehavior = await loadPromptBehavior(sql, windows)
    // This is the live append-only event store, not an external sync. Quiet activity is a real
    // zero, not stale source health; freshness is shown for context only.
    sourceHealth.push(source("analytics_events", "ok", checkedAt, undefined, promptBehavior.freshestRecordAt))
  } catch {
    sourceHealth.push(source("analytics_events", "unavailable", checkedAt, "Prompt Vault funnel"))
  }

  let checkout: Awaited<ReturnType<typeof loadCheckoutBehavior>> | null = null
  try {
    checkout = await loadCheckoutBehavior(sql, windows)
    sourceHealth.push(source("checkout_attribution", "ok", checkedAt, undefined, checkout.freshestRecordAt))
  } catch {
    sourceHealth.push(source("checkout_attribution", "unavailable", checkedAt, "Prompt Vault checkout"))
  }

  const vaultCash = cashResult.cash.filter(row => row.product === "Prompt Vault")
  const promptVault = promptBehavior && checkout && promptDelivery ? {
    campaignKey: PROMPT_VAULT_CAMPAIGN_KEYS.join(","),
    exposureComplete: promptDelivery.exposureComplete,
    measurementMaturesAt: promptDelivery.measurementMaturesAt,
    current: {
      ...promptBehavior.current,
      checkoutStarts: checkout.current,
      qualifyingPayments: vaultCash.reduce((sum, row) => sum + row.currentPayments, 0),
      campaignAttributedPayments: PROMPT_VAULT_CAMPAIGN_KEYS.reduce(
        (sum, key) => sum + (cashResult.campaignPayments[key]?.current || 0),
        0
      ),
    },
    previous: {
      ...promptBehavior.previous,
      checkoutStarts: checkout.previous,
      qualifyingPayments: vaultCash.reduce((sum, row) => sum + row.previousPayments, 0),
      campaignAttributedPayments: PROMPT_VAULT_CAMPAIGN_KEYS.reduce(
        (sum, key) => sum + (cashResult.campaignPayments[key]?.previous || 0),
        0
      ),
    },
  } : null

  let maya: RevenueOperatorInput["maya"] = null
  try {
    const loaded = await loadMaya(sql, windows, cashResult.netPaymentIdsByCampaign[MAYA_VALUE_TEST_CAMPAIGN_KEY] || [])
    maya = loaded
    sourceHealth.push(source("maya_events", "ok", checkedAt, undefined, loaded.freshestRecordAt))
  } catch {
    sourceHealth.push(source("maya_events", "unavailable", checkedAt, "Maya paid-value gate"))
  }

  let operations: RevenueOperatorInput["operations"] = null
  try {
    const loaded = await loadOperations(sql, asOfIso)
    operations = loaded
    sourceHealth.push(source(
      "protected_operations",
      loaded.staleProtectedJobs.length ? "stale" : "ok",
      checkedAt,
      loaded.staleProtectedJobs.length ? `late or missing: ${loaded.staleProtectedJobs.join(", ")}` : undefined,
      loaded.freshestRecordAt
    ))
  } catch {
    sourceHealth.push(source("protected_operations", "unavailable", checkedAt, "customer-money and fulfillment guard"))
  }

  const pack = buildRevenueOperatorPack({
    asOf: asOfIso,
    generatedAt: checkedAt,
    windowDays,
    sourceHealth,
    cash: cashResult.cash,
    membership,
    promptVault,
    maya,
    operations,
    previousDecision: previousState.previousDecision,
    completedGates: previousState.completedGates,
    mayaTestReadiness: loadMayaTestReadiness(asOf, operations),
  })
  assertAggregateOnly(pack)

  const date = asOfIso.slice(0, 10)
  const jsonPath = resolve(outputDir, `revenue-operator-weekly-${date}.json`)
  const markdownPath = resolve(outputDir, `revenue-operator-weekly-${date}.md`)
  writeFileSync(jsonPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8")
  writeFileSync(markdownPath, renderRevenueOperatorMarkdown(pack), "utf8")
  console.log(`[revenue-operator] JSON ${jsonPath}`)
  console.log(`[revenue-operator] Markdown ${markdownPath}`)
  console.log(`[revenue-operator] Sources ${sourceHealth.map(item => `${item.source}:${item.status}`).join(", ")}`)
  if (sourceHealth.some(item => item.status !== "ok")) process.exitCode = 2
}

main().catch(error => {
  console.error("[revenue-operator] failed", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
