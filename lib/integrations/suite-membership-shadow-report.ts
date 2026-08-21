import "server-only"

import { sql } from "@/lib/db/client"

export const SUITE_MEMBERSHIP_SHADOW_STATES = [
  "compatible",
  "missing_with_positive_initial_payment",
  "immutable_conflict",
  "orphan_event",
  "qualification_unknown",
] as const

export type SuiteMembershipShadowState = (typeof SUITE_MEMBERSHIP_SHADOW_STATES)[number]

export interface SuiteMembershipShadowSubscriptionEvidence {
  subscriptionId: string
  userId: string
  planId: string
}

export interface SuiteMembershipShadowEventEvidence {
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  subjectType: string
  subjectId: string
  userId: string | null
  sourceProvider: string | null
  sourceEventId: string | null
  idempotencyKey: string
  occurredAt: string
  attributes: Record<string, unknown>
}

export interface SuiteMembershipShadowPaymentEvidence {
  subscriptionId: string
  invoiceId: string
  amountCents: number
  currency: string
}

export interface SuiteMembershipShadowEvidence {
  state: "available"
  subscriptions: SuiteMembershipShadowSubscriptionEvidence[]
  events: SuiteMembershipShadowEventEvidence[]
  positiveInitialPayments: SuiteMembershipShadowPaymentEvidence[]
}

export type SuiteMembershipShadowEvidenceSnapshot =
  | SuiteMembershipShadowEvidence
  | { state: "unavailable"; reason: string }

export interface SuiteMembershipShadowReportRow {
  subscriptionId: string
  state: SuiteMembershipShadowState
  eventId: string | null
  sourceEventId: string | null
  positiveInitialInvoiceId: string | null
  amountCents: number | null
  currency: string | null
}

export interface SuiteMembershipShadowReport {
  version: 1
  status: "ok" | "failure"
  observedAt: string
  error?: "database_unavailable"
  rows: SuiteMembershipShadowReportRow[]
  summary: Record<SuiteMembershipShadowState, number>
}

type Row = Record<string, unknown>

function emptySummary(): Record<SuiteMembershipShadowState, number> {
  return {
    compatible: 0,
    missing_with_positive_initial_payment: 0,
    immutable_conflict: 0,
    orphan_event: 0,
    qualification_unknown: 0,
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "")
}

function numberValue(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function expectedKey(subscriptionId: string): string {
  return `suite.membership_started.v1:${subscriptionId}`
}

function eventSubscriptionId(event: SuiteMembershipShadowEventEvidence): string {
  const prefix = "suite.membership_started.v1:"
  return event.idempotencyKey.startsWith(prefix)
    ? event.idempotencyKey.slice(prefix.length)
    : event.aggregateId
}

function isCompatibleEvent(
  subscription: SuiteMembershipShadowSubscriptionEvidence,
  event: SuiteMembershipShadowEventEvidence
): boolean {
  const effectiveAt = event.attributes.effective_at
  return (
    event.eventType === "membership_started" &&
    event.aggregateType === "stripe_subscription" &&
    event.aggregateId === subscription.subscriptionId &&
    event.subjectType === "membership" &&
    event.subjectId === "sselfie_studio_membership" &&
    event.userId === subscription.userId &&
    event.sourceProvider === "stripe" &&
    typeof event.sourceEventId === "string" &&
    event.sourceEventId.startsWith("cs_") &&
    event.idempotencyKey === expectedKey(subscription.subscriptionId) &&
    event.attributes.membership_id === "sselfie_studio_membership" &&
    typeof event.attributes.plan_id === "string" &&
    event.attributes.plan_id.trim().length > 0 &&
    typeof effectiveAt === "string" &&
    Number.isFinite(new Date(effectiveAt).getTime()) &&
    effectiveAt === event.occurredAt
  )
}

export function createSuiteMembershipShadowReport(
  snapshot: SuiteMembershipShadowEvidenceSnapshot,
  now: Date
): SuiteMembershipShadowReport {
  const observedAt = Number.isFinite(now.getTime()) ? now.toISOString() : new Date(0).toISOString()
  const summary = emptySummary()

  if (snapshot.state === "unavailable") {
    return {
      version: 1,
      status: "failure",
      observedAt,
      error: "database_unavailable",
      rows: [],
      summary,
    }
  }

  const subscriptions = new Map(
    snapshot.subscriptions.map(row => [row.subscriptionId, row] as const)
  )
  const eventsBySubscription = new Map<string, SuiteMembershipShadowEventEvidence[]>()
  for (const event of snapshot.events) {
    const subscriptionId = eventSubscriptionId(event)
    const rows = eventsBySubscription.get(subscriptionId) ?? []
    rows.push(event)
    eventsBySubscription.set(subscriptionId, rows)
  }
  const paymentsBySubscription = new Map(
    snapshot.positiveInitialPayments.map(row => [row.subscriptionId, row] as const)
  )
  const subscriptionIds = new Set([...subscriptions.keys(), ...eventsBySubscription.keys()])
  const rows: SuiteMembershipShadowReportRow[] = []

  for (const subscriptionId of [...subscriptionIds].sort()) {
    const subscription = subscriptions.get(subscriptionId)
    const events = (eventsBySubscription.get(subscriptionId) ?? []).sort((left, right) =>
      left.eventId.localeCompare(right.eventId)
    )
    const payment = paymentsBySubscription.get(subscriptionId) ?? null
    let state: SuiteMembershipShadowState

    if (!subscription) {
      state = "orphan_event"
    } else if (events.length === 0) {
      state = "qualification_unknown"
    } else if (events.length === 1 && isCompatibleEvent(subscription, events[0])) {
      state = "compatible"
    } else {
      state = "immutable_conflict"
    }

    summary[state] += 1
    rows.push({
      subscriptionId,
      state,
      eventId: events[0]?.eventId ?? null,
      sourceEventId: events[0]?.sourceEventId ?? null,
      positiveInitialInvoiceId: payment?.invoiceId ?? null,
      amountCents: payment?.amountCents ?? null,
      currency: payment?.currency ?? null,
    })
  }

  return { version: 1, status: "ok", observedAt, rows, summary }
}

export function serializeSuiteMembershipShadowReport(report: SuiteMembershipShadowReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

export async function readSuiteMembershipShadowEvidence(): Promise<SuiteMembershipShadowEvidenceSnapshot> {
  try {
    const [subscriptionRows, eventRows, paymentRows] = await Promise.all([
      sql`
        SELECT stripe_subscription_id, user_id, plan
        FROM subscriptions
        WHERE product_type = 'sselfie_studio_membership'
          AND COALESCE(is_test_mode, FALSE) = FALSE
          AND stripe_subscription_id IS NOT NULL
        ORDER BY stripe_subscription_id
      `,
      sql`
        SELECT
          id, event_type, aggregate_type, aggregate_id, subject_type, subject_id,
          user_id, source_provider, source_event_id, idempotency_key, occurred_at, attributes
        FROM business_events
        WHERE event_type = 'membership_started'
          AND (
            idempotency_key LIKE 'suite.membership_started.v1:%'
            OR (
              aggregate_type = 'stripe_subscription'
              AND subject_id = 'sselfie_studio_membership'
            )
          )
        ORDER BY aggregate_id, id
      `,
      sql`
        SELECT
          stripe_subscription_id, stripe_invoice_id, amount_cents, currency
        FROM stripe_payments
        WHERE product_type = 'sselfie_studio_membership'
          AND payment_type = 'subscription'
          AND status IN ('paid', 'succeeded')
          AND COALESCE(is_test_mode, FALSE) = FALSE
          AND amount_cents > 0
          AND stripe_subscription_id IS NOT NULL
          AND stripe_invoice_id IS NOT NULL
          AND metadata->>'billing_reason' = 'subscription_create'
        ORDER BY stripe_subscription_id, payment_date, stripe_invoice_id
      `,
    ])

    const subscriptions = (subscriptionRows as Row[]).map(row => ({
      subscriptionId: stringValue(row.stripe_subscription_id),
      userId: stringValue(row.user_id),
      planId: stringValue(row.plan),
    }))
    const events = (eventRows as Row[]).map(row => ({
      eventId: stringValue(row.id),
      eventType: stringValue(row.event_type),
      aggregateType: stringValue(row.aggregate_type),
      aggregateId: stringValue(row.aggregate_id),
      subjectType: stringValue(row.subject_type),
      subjectId: stringValue(row.subject_id),
      userId: row.user_id === null ? null : stringValue(row.user_id),
      sourceProvider: row.source_provider === null ? null : stringValue(row.source_provider),
      sourceEventId: row.source_event_id === null ? null : stringValue(row.source_event_id),
      idempotencyKey: stringValue(row.idempotency_key),
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      attributes: objectValue(row.attributes),
    }))
    const positiveInitialPayments = (paymentRows as Row[]).map(row => ({
      subscriptionId: stringValue(row.stripe_subscription_id),
      invoiceId: stringValue(row.stripe_invoice_id),
      amountCents: numberValue(row.amount_cents),
      currency: stringValue(row.currency).toLowerCase(),
    }))

    return { state: "available", subscriptions, events, positiveInitialPayments }
  } catch {
    return { state: "unavailable", reason: "database unavailable" }
  }
}

export async function getSuiteMembershipShadowReport(
  now = new Date()
): Promise<SuiteMembershipShadowReport> {
  return createSuiteMembershipShadowReport(await readSuiteMembershipShadowEvidence(), now)
}
