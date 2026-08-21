import { sql } from "@/lib/db/client"
import { assertBusinessEventInput } from "@/lib/integrations/contracts"

type MembershipDiscount = {
  percent: number | null
  coupon: string | null
}

export type StudioMembershipUpsert = {
  userId: string
  // Subscription entitlement being stored. Only recurring tiers are valid here;
  // vault_maya must never be widened into full studio membership.
  productType?: "sselfie_studio_membership" | "vault_maya"
  plan: string
  status: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  periodStart: number | null
  periodEnd: number | null
  isTestMode: boolean
  discount?: MembershipDiscount
  shadowMembershipStarted?: {
    checkoutSessionId: string
    occurredAt: Date
  }
}

/**
 * Store one real Stripe membership without touching trials, passes, or one-time
 * owner rows that happen to belong to the same user. Stripe's subscription ID is
 * the lifecycle identity and the database's unique conflict target.
 */
export async function upsertStudioMembershipSubscription(
  input: StudioMembershipUpsert
): Promise<void> {
  const hasDiscountSnapshot = input.discount !== undefined
  const discountPercent = input.discount?.percent ?? null
  const discountCoupon = input.discount?.coupon ?? null
  const productType =
    input.productType === "vault_maya" ? "vault_maya" : "sselfie_studio_membership"

  if (input.shadowMembershipStarted) {
    if (input.productType !== "sselfie_studio_membership") {
      throw new Error("SUITE membership start shadow requires the exact SUITE product type")
    }
    if (input.isTestMode) {
      throw new Error("SUITE membership start shadow is live-only")
    }

    const event = assertBusinessEventInput({
      eventType: "membership_started",
      schemaVersion: 1,
      aggregateType: "stripe_subscription",
      aggregateId: input.stripeSubscriptionId,
      subjectType: "membership",
      subjectId: "sselfie_studio_membership",
      userId: input.userId,
      sourceProvider: "stripe",
      sourceEventId: input.shadowMembershipStarted.checkoutSessionId,
      idempotencyKey: `suite.membership_started.v1:${input.stripeSubscriptionId}`,
      occurredAt: input.shadowMembershipStarted.occurredAt,
      attributes: {
        membership_id: "sselfie_studio_membership",
        plan_id: input.plan,
        effective_at: input.shadowMembershipStarted.occurredAt.toISOString(),
      },
    })
    const attributes = JSON.stringify(event.attributes)

    // The lock is deliberately transaction statement one. A waiter then gets a fresh
    // READ COMMITTED snapshot before the combined event/membership statement runs.
    const transactionRows = (await sql.transaction(tx => [
      tx`
        SELECT pg_advisory_xact_lock(
          hashtext(${`studio_membership:${input.stripeSubscriptionId}`})
        ) AS locked
      `,
      tx`
        WITH event_fact AS (
          INSERT INTO business_events (
            event_type, schema_version, aggregate_type, aggregate_id,
            subject_type, subject_id, user_id, source_provider, source_event_id,
            idempotency_key, occurred_at, attributes
          ) VALUES (
            ${event.eventType}, ${event.schemaVersion}, ${event.aggregateType}, ${event.aggregateId},
            ${event.subjectType}, ${event.subjectId}, ${event.userId ?? null},
            ${event.sourceProvider ?? null}, ${event.sourceEventId ?? null},
            ${event.idempotencyKey}, ${event.occurredAt.toISOString()}, ${attributes}::jsonb
          )
          ON CONFLICT (idempotency_key) DO UPDATE
          SET idempotency_key = CASE
            WHEN business_events.event_type = EXCLUDED.event_type
              AND business_events.schema_version = EXCLUDED.schema_version
              AND business_events.aggregate_type = EXCLUDED.aggregate_type
              AND business_events.aggregate_id = EXCLUDED.aggregate_id
              AND business_events.subject_type = EXCLUDED.subject_type
              AND business_events.subject_id = EXCLUDED.subject_id
              AND business_events.user_id IS NOT DISTINCT FROM EXCLUDED.user_id
              AND business_events.source_provider IS NOT DISTINCT FROM EXCLUDED.source_provider
              AND business_events.source_event_id IS NOT DISTINCT FROM EXCLUDED.source_event_id
              AND business_events.occurred_at = EXCLUDED.occurred_at
              AND business_events.attributes = EXCLUDED.attributes
            THEN EXCLUDED.idempotency_key
            ELSE NULL
          END
          RETURNING id
        ),
        updated_membership AS (
          UPDATE subscriptions s
          SET
            user_id = ${input.userId},
            product_type = ${productType},
            plan = ${input.plan},
            status = ${input.status},
            stripe_customer_id = ${input.stripeCustomerId},
            current_period_start = to_timestamp(${input.periodStart}),
            current_period_end = to_timestamp(${input.periodEnd}),
            is_test_mode = FALSE,
            discount_percent = CASE
              WHEN ${hasDiscountSnapshot} THEN ${discountPercent}
              ELSE s.discount_percent
            END,
            discount_coupon = CASE
              WHEN ${hasDiscountSnapshot} THEN ${discountCoupon}
              ELSE s.discount_coupon
            END,
            updated_at = NOW()
          FROM event_fact
          WHERE s.stripe_subscription_id = ${input.stripeSubscriptionId}
          RETURNING s.id
        ),
        inserted_membership AS (
          INSERT INTO subscriptions (
            user_id, product_type, plan, status,
            stripe_subscription_id, stripe_customer_id,
            current_period_start, current_period_end, is_test_mode,
            discount_percent, discount_coupon, created_at, updated_at
          )
          SELECT
            ${input.userId}, ${productType}, ${input.plan}, ${input.status},
            ${input.stripeSubscriptionId}, ${input.stripeCustomerId},
            to_timestamp(${input.periodStart}), to_timestamp(${input.periodEnd}), FALSE,
            ${discountPercent}, ${discountCoupon}, NOW(), NOW()
          FROM event_fact
          WHERE NOT EXISTS (SELECT 1 FROM updated_membership)
          RETURNING id
        ),
        stored_membership AS (
          SELECT id FROM updated_membership
          UNION ALL
          SELECT id FROM inserted_membership
          LIMIT 1
        )
        SELECT
          stored_membership.id AS membership_id,
          event_fact.id AS event_id
        FROM stored_membership
        CROSS JOIN event_fact
      `,
    ])) as unknown[]

    const mainRows = transactionRows[1] as Array<Record<string, unknown>> | undefined
    if (!mainRows?.[0]?.membership_id || !mainRows[0].event_id) {
      throw new Error(
        `Could not atomically store SUITE membership start ${input.stripeSubscriptionId}`
      )
    }
    return
  }

  const rows = await sql`
    WITH lock_guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtext(${`studio_membership:${input.stripeSubscriptionId}`})
      ) AS locked
    ),
    updated_membership AS (
      UPDATE subscriptions s
      SET
        user_id = ${input.userId},
        product_type = ${productType},
        plan = ${input.plan},
        status = ${input.status},
        stripe_customer_id = ${input.stripeCustomerId},
        current_period_start = to_timestamp(${input.periodStart}),
        current_period_end = to_timestamp(${input.periodEnd}),
        is_test_mode = ${input.isTestMode},
        discount_percent = CASE
          WHEN ${hasDiscountSnapshot} THEN ${discountPercent}
          ELSE s.discount_percent
        END,
        discount_coupon = CASE
          WHEN ${hasDiscountSnapshot} THEN ${discountCoupon}
          ELSE s.discount_coupon
        END,
        updated_at = NOW()
      FROM lock_guard
      WHERE s.stripe_subscription_id = ${input.stripeSubscriptionId}
      RETURNING s.id
    ),
    inserted_membership AS (
      INSERT INTO subscriptions (
        user_id,
        product_type,
        plan,
        status,
        stripe_subscription_id,
        stripe_customer_id,
        current_period_start,
        current_period_end,
        is_test_mode,
        discount_percent,
        discount_coupon,
        created_at,
        updated_at
      )
      SELECT
        ${input.userId},
        ${productType},
        ${input.plan},
        ${input.status},
        ${input.stripeSubscriptionId},
        ${input.stripeCustomerId},
        to_timestamp(${input.periodStart}),
        to_timestamp(${input.periodEnd}),
        ${input.isTestMode},
        ${discountPercent},
        ${discountCoupon},
        NOW(),
        NOW()
      FROM lock_guard
      WHERE NOT EXISTS (SELECT 1 FROM updated_membership)
      RETURNING id
    )
    SELECT id FROM updated_membership
    UNION ALL
    SELECT id FROM inserted_membership
    LIMIT 1
  `

  if (rows.length === 0) {
    throw new Error(`Could not store Stripe membership ${input.stripeSubscriptionId}`)
  }
}
