import { sql } from "@/lib/db/client"

type MembershipDiscount = {
  percent: number | null
  coupon: string | null
}

export type StudioMembershipUpsert = {
  userId: string
  plan: string
  status: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  periodStart: number | null
  periodEnd: number | null
  isTestMode: boolean
  discount?: MembershipDiscount
}

/**
 * Store one real Stripe membership without touching trials, passes, or one-time
 * owner rows that happen to belong to the same user. Stripe's subscription ID is
 * the lifecycle identity and the database's unique conflict target.
 */
export async function upsertStudioMembershipSubscription(
  input: StudioMembershipUpsert,
): Promise<void> {
  const hasDiscountSnapshot = input.discount !== undefined
  const discountPercent = input.discount?.percent ?? null
  const discountCoupon = input.discount?.coupon ?? null
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
        product_type = 'sselfie_studio_membership',
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
        'sselfie_studio_membership',
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
