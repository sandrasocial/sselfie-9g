import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import Stripe from "stripe"
import { createCronLogger } from "@/lib/cron-logger"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"


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
  const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
  return await sql`
    WITH active_subs AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
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
  const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
  return await sql`
    WITH active_members AS (
      SELECT DISTINCT user_id, product_type
      FROM subscriptions
      WHERE status = 'active'
        AND product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
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
    WHERE mg.last_grant IS NULL OR mg.last_grant < NOW() - INTERVAL '25 days'
  `
}

async function grantMonthlyCredits(userId: string, hasTestMode: boolean) {
  // FIX B6: Use 25-day window instead of 40 days (monthly billing is ~30 days)
  // This prevents accidental double-grants while still catching missed grants
  const recent = await sql`
    SELECT 1
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND transaction_type = 'subscription_grant'
      AND description = ${MONTHLY_GRANT_DESC}
      AND created_at > NOW() - INTERVAL '25 days'
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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-01-28.clover" })
  const startTs = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)

  let processed = 0
  let stored = 0
  let skipped = 0

  // Invoices first: they own subscription money and report the payment ids they cover, so
  // the payment-intent pass never re-records the same charge under a pi_ id. On Clover the
  // old `(pi as any).invoice` guard silently stopped working (field removed) and renewals
  // were double-recorded as one-time rows (cleaned 2026-07-06).
  const invoiceLinkedPaymentIds = new Set<string>()

  const invoices = await stripe.invoices.list({
    limit: 100,
    status: "paid",
    created: { gte: startTs },
    expand: ["data.payments"],
  })

  for (const invoice of invoices.data) {
    processed += 1
    const invoiceAny = invoice as any
    for (const legacy of [invoiceAny.charge, invoiceAny.payment_intent]) {
      const id = typeof legacy === "string" ? legacy : legacy?.id
      if (id) invoiceLinkedPaymentIds.add(id)
    }
    for (const p of invoiceAny.payments?.data ?? []) {
      const piId =
        typeof p?.payment?.payment_intent === "string" ? p.payment.payment_intent : p?.payment?.payment_intent?.id
      const chId = typeof p?.payment?.charge === "string" ? p.payment.charge : p?.payment?.charge?.id
      if (piId) invoiceLinkedPaymentIds.add(piId)
      if (chId) invoiceLinkedPaymentIds.add(chId)
    }

    // Basil/Clover moved invoice.subscription to parent.subscription_details.subscription.
    const rawSubscription =
      invoiceAny.subscription ?? invoiceAny.parent?.subscription_details?.subscription
    const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
    if (!subscriptionId || !customerId) {
      skipped += 1
      continue
    }
    // One invoice = one row, always keyed on the invoice id (idx_stripe_payments_invoice_unique).
    const paymentId = invoice.id

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
      WHERE stripe_payments.status IS DISTINCT FROM 'duplicate'
    `
    stored += 1
  }

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
    const invoiceRef = (pi as any).invoice
    if (invoiceRef || invoiceLinkedPaymentIds.has(pi.id)) {
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
      WHERE stripe_payments.status IS DISTINCT FROM 'duplicate'
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
  const cronLogger = createCronLogger("reconcile-credits")
  await cronLogger.start()

  try {
    const meta = {
      path: request.nextUrl.pathname,
      method: request.method,
      ts: new Date().toISOString(),
      isVercelCron: request.headers.get("x-vercel-cron"),
      userAgent: request.headers.get("user-agent"),
      hasAuthHeader: request.headers.has("authorization"),
      vercelIdHint: request.headers.get("x-vercel-id"),
    }
    console.log(`[CRON_META] ${JSON.stringify(meta)}`)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      await cronLogger.error(new Error("CRON_SECRET not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
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

    const summary = {
      path: request.nextUrl.pathname,
      grantedWelcomeCredits: welcomeGranted,
      reconciledMembershipCredits: monthlyGranted,
      backfilledPayments: stripeReconcile ? stripeReconcile.stored : 0,
      status: "ok",
    }
    console.log(`[CRON_SUMMARY] ${JSON.stringify(summary)}`)

    await cronLogger.success(summary)

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
    await cronLogger.error(error, { reason: "Reconcile credits failed" })
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
