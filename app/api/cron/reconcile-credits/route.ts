import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"

const sql = neon(process.env.DATABASE_URL!)

const WELCOME_BONUS_DESC = "Free blueprint credits (welcome bonus)"
const WELCOME_BONUS_AMOUNT = 2
const MONTHLY_GRANT_DESC = "Monthly Creator Studio grant"
const MONTHLY_CREDITS = 200

async function hasIsTestModeColumn() {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_name = 'credit_transactions'
      AND column_name = 'is_test_mode'
  `
  return result[0]?.count === 1
}

async function getMissingWelcomeUsers() {
  return await sql`
    WITH active_subs AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
    ),
    paid_blueprint AS (
      SELECT DISTINCT user_id
      FROM blueprint_subscribers
      WHERE paid_blueprint_purchased = TRUE AND user_id IS NOT NULL
    ),
    free_users AS (
      SELECT u.id
      FROM users u
      LEFT JOIN active_subs s ON s.user_id = u.id
      LEFT JOIN paid_blueprint p ON p.user_id = u.id
      WHERE s.user_id IS NULL AND p.user_id IS NULL
    ),
    free_grants AS (
      SELECT user_id
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
        AND description = ${WELCOME_BONUS_DESC}
      GROUP BY user_id
      HAVING COUNT(*) >= 1
    )
    SELECT fu.id AS user_id
    FROM free_users fu
    LEFT JOIN free_grants fg ON fg.user_id = fu.id
    WHERE fg.user_id IS NULL
  `
}

async function grantWelcomeCredits(userId: string, hasTestMode: boolean) {
  const existing = await sql`
    SELECT 1
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND transaction_type = 'bonus'
      AND description = ${WELCOME_BONUS_DESC}
    LIMIT 1
  `
  if (existing.length > 0) {
    return false
  }

  const [credits] = await sql`
    SELECT balance, total_purchased
    FROM user_credits
    WHERE user_id = ${userId}
  `

  const currentBalance = Number(credits?.balance || 0)
  const newBalance = currentBalance + WELCOME_BONUS_AMOUNT

  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
    VALUES (${userId}, ${newBalance}, ${WELCOME_BONUS_AMOUNT}, 0, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = ${newBalance},
      total_purchased = user_credits.total_purchased + ${WELCOME_BONUS_AMOUNT},
      updated_at = NOW()
  `

  if (hasTestMode) {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${WELCOME_BONUS_AMOUNT}, 'bonus', ${WELCOME_BONUS_DESC},
        ${newBalance}, FALSE, NOW()
      )
    `
  } else {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, created_at
      )
      VALUES (
        ${userId}, ${WELCOME_BONUS_AMOUNT}, 'bonus', ${WELCOME_BONUS_DESC},
        ${newBalance}, NOW()
      )
    `
  }

  return true
}

async function getEligibleMembers() {
  return await sql`
    WITH active_members AS (
      SELECT DISTINCT user_id, product_type
      FROM subscriptions
      WHERE status = 'active'
        AND product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
    ),
    monthly_grants AS (
      SELECT user_id, MAX(created_at) AS last_grant
      FROM credit_transactions
      WHERE transaction_type = 'subscription_grant'
        AND description ILIKE 'Monthly % grant'
      GROUP BY user_id
    )
    SELECT am.user_id, am.product_type, mg.last_grant
    FROM active_members am
    LEFT JOIN monthly_grants mg ON mg.user_id = am.user_id
    WHERE mg.last_grant IS NULL OR mg.last_grant < NOW() - INTERVAL '40 days'
  `
}

async function grantMonthlyCredits(userId: string, hasTestMode: boolean) {
  const recent = await sql`
    SELECT 1
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND transaction_type = 'subscription_grant'
      AND description = ${MONTHLY_GRANT_DESC}
      AND created_at > NOW() - INTERVAL '40 days'
    LIMIT 1
  `
  if (recent.length > 0) {
    return false
  }

  const [credits] = await sql`
    SELECT balance
    FROM user_credits
    WHERE user_id = ${userId}
  `

  const currentBalance = Number(credits?.balance || 0)
  const newBalance = currentBalance + MONTHLY_CREDITS

  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
    VALUES (${userId}, ${newBalance}, ${MONTHLY_CREDITS}, 0, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = ${newBalance},
      total_purchased = user_credits.total_purchased + ${MONTHLY_CREDITS},
      updated_at = NOW()
  `

  if (hasTestMode) {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${MONTHLY_CREDITS}, 'subscription_grant', ${MONTHLY_GRANT_DESC},
        ${newBalance}, FALSE, NOW()
      )
    `
  } else {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, created_at
      )
      VALUES (
        ${userId}, ${MONTHLY_CREDITS}, 'subscription_grant', ${MONTHLY_GRANT_DESC},
        ${newBalance}, NOW()
      )
    `
  }

  return true
}

async function reconcileStripePayments(days: number) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { processed: 0, stored: 0, skipped: 0, error: "STRIPE_SECRET_KEY missing" }
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
  const startTs = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)

  let processed = 0
  let stored = 0
  let skipped = 0

  const paymentIntents = await stripe.paymentIntents.list({
    limit: 100,
    created: { gte: startTs },
  })

  for (const pi of paymentIntents.data) {
    processed += 1
    if (pi.status !== "succeeded") {
      skipped += 1
      continue
    }
    if (pi.invoice) {
      skipped += 1
      continue
    }
    const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id
    if (!customerId) {
      skipped += 1
      continue
    }

    const productType = pi.metadata?.product_type || null
    const paymentType =
      productType === "credit_topup"
        ? "credit_topup"
        : "one_time_session"

    await sql`
      INSERT INTO stripe_payments (
        stripe_payment_id,
        stripe_customer_id,
        amount_cents,
        currency,
        status,
        payment_type,
        product_type,
        metadata,
        payment_date,
        is_test_mode,
        created_at,
        updated_at
      )
      VALUES (
        ${pi.id},
        ${customerId},
        ${pi.amount},
        ${pi.currency || "usd"},
        'succeeded',
        ${paymentType},
        ${productType},
        ${JSON.stringify(pi.metadata || {})},
        to_timestamp(${pi.created}),
        ${!pi.livemode},
        NOW(),
        NOW()
      )
      ON CONFLICT (stripe_payment_id)
      DO UPDATE SET
        status = 'succeeded',
        payment_type = ${paymentType},
        product_type = ${productType},
        updated_at = NOW()
    `
    stored += 1
  }

  const invoices = await stripe.invoices.list({
    limit: 100,
    status: "paid",
    created: { gte: startTs },
  })

  for (const invoice of invoices.data) {
    processed += 1
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
    if (!subscriptionId || !customerId) {
      skipped += 1
      continue
    }
    const paymentId =
      (typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id) ||
      (typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id) ||
      invoice.id

    await sql`
      INSERT INTO stripe_payments (
        stripe_payment_id,
        stripe_invoice_id,
        stripe_subscription_id,
        stripe_customer_id,
        amount_cents,
        currency,
        status,
        payment_type,
        product_type,
        metadata,
        payment_date,
        is_test_mode,
        created_at,
        updated_at
      )
      VALUES (
        ${paymentId},
        ${invoice.id},
        ${subscriptionId},
        ${customerId},
        ${invoice.amount_paid},
        ${invoice.currency || "usd"},
        ${invoice.status || "succeeded"},
        'subscription',
        'sselfie_studio_membership',
        ${JSON.stringify(invoice.metadata || {})},
        to_timestamp(${invoice.created}),
        ${!invoice.livemode},
        NOW(),
        NOW()
      )
      ON CONFLICT (stripe_payment_id)
      DO UPDATE SET
        status = ${invoice.status || "succeeded"},
        payment_type = 'subscription',
        updated_at = NOW()
    `
    stored += 1
  }

  return { processed, stored, skipped }
}

/**
 * GET /api/cron/reconcile-credits
 * Idempotent reconciliation for welcome credits, monthly membership grants,
 * and optional Stripe payments backfill (recent window).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasTestMode = await hasIsTestModeColumn()
    const missingWelcomeUsers = await getMissingWelcomeUsers()
    let welcomeGranted = 0
    for (const row of missingWelcomeUsers) {
      const granted = await grantWelcomeCredits(row.user_id, hasTestMode)
      if (granted) welcomeGranted += 1
    }

    const eligibleMembers = await getEligibleMembers()
    let monthlyGranted = 0
    for (const row of eligibleMembers) {
      const granted = await grantMonthlyCredits(row.user_id, hasTestMode)
      if (granted) monthlyGranted += 1
    }

    let stripeReconcile: { processed: number; stored: number; skipped: number; error?: string } | null = null
    const reconcileStripe = process.env.RECONCILE_STRIPE_PAYMENTS === "true"
    if (reconcileStripe) {
      const days = Number(process.env.STRIPE_RECONCILE_DAYS || 7)
      stripeReconcile = await reconcileStripePayments(days)
    }

    return NextResponse.json({
      success: true,
      welcomeMissing: missingWelcomeUsers.length,
      welcomeGranted,
      membersEligible: eligibleMembers.length,
      monthlyGranted,
      stripeReconcile,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] reconcile-credits error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
