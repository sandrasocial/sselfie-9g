import "server-only"

import { sql } from "@/lib/db/client"
import type {
  SuiteProviderPilotConfig,
  SuiteProviderPilotEvidenceSnapshot,
} from "./suite-provider-pilot"

type Row = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "")
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value)
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function readSuiteProviderPilotEvidence(
  config: SuiteProviderPilotConfig
): Promise<SuiteProviderPilotEvidenceSnapshot> {
  if (config.state !== "ready") return { state: "not_requested" }

  try {
    const [subscriptionRows, eventRows, paymentRows, externalRows] = await Promise.all([
      sql`
        SELECT
          stripe_subscription_id, user_id, product_type, plan, status,
          current_period_end, is_test_mode
        FROM subscriptions
        WHERE user_id = ANY(${config.userIds}::text[])
          AND product_type = 'sselfie_studio_membership'
          AND stripe_subscription_id IS NOT NULL
        ORDER BY user_id, stripe_subscription_id
      `,
      sql`
        SELECT
          id, event_type, aggregate_type, aggregate_id, subject_type, subject_id,
          user_id, source_provider, source_event_id, idempotency_key, occurred_at, attributes
        FROM business_events
        WHERE user_id = ANY(${config.userIds}::text[])
          AND event_type = 'membership_started'
          AND (
            idempotency_key LIKE 'suite.membership_started.v1:%'
            OR (
              aggregate_type = 'stripe_subscription'
              AND subject_id = 'sselfie_studio_membership'
            )
          )
        ORDER BY user_id, aggregate_id, id
      `,
      sql`
        SELECT
          s.user_id, sp.stripe_subscription_id, sp.stripe_invoice_id,
          sp.amount_cents, sp.currency, sp.product_type, sp.payment_type,
          sp.status, sp.is_test_mode, sp.metadata->>'billing_reason' AS billing_reason
        FROM stripe_payments sp
        JOIN subscriptions s
          ON s.stripe_subscription_id = sp.stripe_subscription_id
        WHERE s.user_id = ANY(${config.userIds}::text[])
          AND s.product_type = 'sselfie_studio_membership'
          AND COALESCE(s.is_test_mode, FALSE) = FALSE
          AND sp.product_type = 'sselfie_studio_membership'
          AND sp.payment_type = 'subscription'
          AND sp.status IN ('paid', 'succeeded')
          AND COALESCE(sp.is_test_mode, FALSE) = FALSE
          AND sp.amount_cents > 0
          AND sp.stripe_subscription_id IS NOT NULL
          AND sp.stripe_invoice_id IS NOT NULL
          AND sp.metadata->>'billing_reason' = 'subscription_create'
        ORDER BY s.user_id, sp.stripe_subscription_id, sp.stripe_invoice_id
      `,
      sql`
        SELECT user_id
        FROM external_accounts
        WHERE user_id = ANY(${config.userIds}::text[])
          AND provider = ${config.provider}
        UNION
        SELECT user_id
        FROM external_provisioning_states
        WHERE user_id = ANY(${config.userIds}::text[])
          AND provider = ${config.provider}
        UNION
        SELECT captured_user_id AS user_id
        FROM integration_outbox
        WHERE captured_user_id = ANY(${config.userIds}::text[])
          AND provider = ${config.provider}
        ORDER BY user_id
      `,
    ])

    return {
      state: "available",
      subscriptions: (subscriptionRows as Row[]).map(row => ({
        subscriptionId: text(row.stripe_subscription_id),
        userId: text(row.user_id),
        productType: text(row.product_type),
        planId: text(row.plan),
        status: text(row.status),
        currentPeriodEnd: nullableText(row.current_period_end),
        isTestMode: row.is_test_mode === true,
      })),
      events: (eventRows as Row[]).map(row => ({
        eventId: text(row.id),
        eventType: text(row.event_type),
        aggregateType: text(row.aggregate_type),
        aggregateId: text(row.aggregate_id),
        subjectType: text(row.subject_type),
        subjectId: text(row.subject_id),
        userId: nullableText(row.user_id),
        sourceProvider: nullableText(row.source_provider),
        sourceEventId: nullableText(row.source_event_id),
        idempotencyKey: text(row.idempotency_key),
        occurredAt: new Date(text(row.occurred_at)).toISOString(),
        attributes: object(row.attributes),
      })),
      positiveInitialPayments: (paymentRows as Row[]).map(row => ({
        userId: text(row.user_id),
        subscriptionId: text(row.stripe_subscription_id),
        invoiceId: text(row.stripe_invoice_id),
        amountCents: Number(row.amount_cents),
        currency: text(row.currency).toLowerCase(),
        productType: text(row.product_type),
        paymentType: text(row.payment_type),
        status: text(row.status),
        isTestMode: row.is_test_mode === true,
        billingReason: text(row.billing_reason),
      })),
      preexistingExternalUserIds: (externalRows as Row[]).map(row => text(row.user_id)),
    }
  } catch {
    return { state: "unavailable", reason: "database unavailable" }
  }
}
