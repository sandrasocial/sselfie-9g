/**
 * Backfill recent Stripe payments into stripe_payments (idempotent).
 *
 * Usage:
 *   DRY_RUN=true DAYS=30 npx tsx scripts/backfill/backfill-stripe-payments-recent.ts
 *   DAYS=30 npx tsx scripts/backfill/backfill-stripe-payments-recent.ts
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY not set")
}
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set")
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
const sql = neon(DATABASE_URL)
const DRY_RUN = process.env.DRY_RUN === "true"
const DAYS = Number(process.env.DAYS || 30)
const BLUEPRINT_ONLY = process.env.BLUEPRINT_ONLY === "true"

function getStartTimestampSeconds() {
  const now = Date.now()
  return Math.floor((now - DAYS * 24 * 60 * 60 * 1000) / 1000)
}

async function findUserIdByCustomerId(customerId: string): Promise<string | null> {
  const result = await sql`
    SELECT id FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
  `
  if (result.length > 0) return result[0].id

  const subResult = await sql`
    SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1
  `
  if (subResult.length > 0) return subResult[0].user_id

  return null
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const result = await sql`
    SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `
  if (result.length > 0) return result[0].id
  return null
}

function resolvePaymentType(metadata: Record<string, any>, description?: string, mode?: string) {
  const productTypeRaw =
    metadata?.product_type || metadata?.productType || metadata?.product_id || metadata?.productId || ""
  const packageId = metadata?.package_id || metadata?.packageId || ""
  const normalizedProductType = String(productTypeRaw).toLowerCase()
  const normalizedPackageId = String(packageId).toLowerCase()
  const normalizedDescription = (description || "").toLowerCase()
  const normalizedMode = (mode || "").toLowerCase()

  const isCreditTopup =
    normalizedProductType === "credit_topup" ||
    normalizedPackageId.includes("credit") ||
    normalizedDescription.includes("credit")

  const isPaidBlueprint =
    normalizedProductType === "paid_blueprint" ||
    normalizedProductType.includes("blueprint") ||
    normalizedPackageId.includes("blueprint") ||
    normalizedDescription.includes("blueprint")

  if (isCreditTopup) {
    return { payment_type: "credit_topup", product_type: "credit_topup", isPaidBlueprint: false }
  }
  if (isPaidBlueprint) {
    return { payment_type: "one_time_session", product_type: "paid_blueprint", isPaidBlueprint: true }
  }
  if (normalizedProductType === "one_time_session") {
    return { payment_type: "one_time_session", product_type: "one_time_session", isPaidBlueprint: false }
  }
  if (normalizedMode === "subscription") {
    return {
      payment_type: "subscription",
      product_type: normalizedProductType || "sselfie_studio_membership",
      isPaidBlueprint: false,
    }
  }
  if (
    normalizedMode === "payment" &&
    (normalizedProductType === "sselfie_studio_membership" ||
      normalizedProductType === "brand_studio_membership")
  ) {
    return { payment_type: "one_time_session", product_type: "one_time_session", isPaidBlueprint: false }
  }
  return { payment_type: "one_time_session", product_type: normalizedProductType || null, isPaidBlueprint: false }
}

async function upsertStripePayment(record: {
  stripe_payment_id: string
  stripe_invoice_id?: string | null
  stripe_subscription_id?: string | null
  stripe_customer_id: string
  user_id?: string | null
  amount_cents: number
  currency: string
  status: string
  payment_type: string
  product_type?: string | null
  description?: string | null
  metadata?: Record<string, any>
  payment_date: Date
  is_test_mode: boolean
}) {
  if (DRY_RUN) return
  await sql`
    INSERT INTO stripe_payments (
      stripe_payment_id,
      stripe_invoice_id,
      stripe_subscription_id,
      stripe_customer_id,
      user_id,
      amount_cents,
      currency,
      status,
      payment_type,
      product_type,
      description,
      metadata,
      payment_date,
      is_test_mode,
      created_at,
      updated_at
    )
    VALUES (
      ${record.stripe_payment_id},
      ${record.stripe_invoice_id || null},
      ${record.stripe_subscription_id || null},
      ${record.stripe_customer_id},
      ${record.user_id || null},
      ${record.amount_cents},
      ${record.currency},
      ${record.status},
      ${record.payment_type},
      ${record.product_type || null},
      ${record.description || null},
      ${JSON.stringify(record.metadata || {})},
      ${record.payment_date},
      ${record.is_test_mode},
      NOW(),
      NOW()
    )
    ON CONFLICT (stripe_payment_id)
    DO UPDATE SET
      status = ${record.status},
      payment_type = ${record.payment_type},
      product_type = ${record.product_type || null},
      updated_at = NOW()
  `
}

async function backfillPaymentIntents(startTs: number) {
  let hasMore = true
  let startingAfter: string | undefined
  let processed = 0
  let stored = 0

  while (hasMore) {
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: startTs },
      starting_after: startingAfter,
    })

    for (const pi of paymentIntents.data) {
      processed += 1
      if (pi.status !== "succeeded") continue
      if (pi.invoice) continue // handled by invoices backfill

      const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id
      if (!customerId) continue

      const userId = await findUserIdByCustomerId(customerId)
      const description = pi.description || ""
      const meta = pi.metadata || {}
      const { payment_type, product_type } = resolvePaymentType(meta, description)

      await upsertStripePayment({
        stripe_payment_id: pi.id,
        stripe_customer_id: customerId,
        user_id: userId,
        amount_cents: pi.amount,
        currency: pi.currency || "usd",
        status: "succeeded",
        payment_type,
        product_type,
        description,
        metadata: meta,
        payment_date: new Date(pi.created * 1000),
        is_test_mode: !pi.livemode,
      })
      stored += 1
    }

    hasMore = paymentIntents.has_more
    if (paymentIntents.data.length > 0) {
      startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id
    }
  }

  return { processed, stored }
}

async function backfillInvoices(startTs: number) {
  let hasMore = true
  let startingAfter: string | undefined
  let processed = 0
  let stored = 0

  while (hasMore) {
    const invoices = await stripe.invoices.list({
      limit: 100,
      status: "paid",
      created: { gte: startTs },
      starting_after: startingAfter,
    })

    for (const invoice of invoices.data) {
      processed += 1
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
      if (!subscriptionId || !customerId) continue

      let productType = "sselfie_studio_membership"
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        productType = subscription.metadata?.product_type || "sselfie_studio_membership"
      } catch {
        // fallback to default
      }

      const paymentId =
        (typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id) ||
        (typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id) ||
        invoice.id

      const userId = await findUserIdByCustomerId(customerId)

      await upsertStripePayment({
        stripe_payment_id: paymentId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        user_id: userId,
        amount_cents: invoice.amount_paid,
        currency: invoice.currency || "usd",
        status: invoice.status || "succeeded",
        payment_type: "subscription",
        product_type: productType,
        description: invoice.description || `Subscription payment - ${productType}`,
        metadata: invoice.metadata || {},
        payment_date: new Date(invoice.created * 1000),
        is_test_mode: !invoice.livemode,
      })
      stored += 1
    }

    hasMore = invoices.has_more
    if (invoices.data.length > 0) {
      startingAfter = invoices.data[invoices.data.length - 1].id
    }
  }

  return { processed, stored }
}

async function backfillCharges(startTs: number) {
  let hasMore = true
  let startingAfter: string | undefined
  let processed = 0
  let stored = 0
  let skippedNoCustomer = 0

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: startTs },
      starting_after: startingAfter,
    })

    for (const charge of charges.data) {
      processed += 1
      if (!charge.paid || charge.refunded) continue
      if (charge.invoice) continue // handled by invoices backfill

      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id
      if (!customerId) {
        skippedNoCustomer += 1
        continue
      }

      const userId = await findUserIdByCustomerId(customerId)
      const description = charge.description || ""
      const meta = charge.metadata || {}
      const { payment_type, product_type } = resolvePaymentType(meta, description)

      await upsertStripePayment({
        stripe_payment_id: charge.id,
        stripe_customer_id: customerId,
        user_id: userId,
        amount_cents: charge.amount,
        currency: charge.currency || "usd",
        status: charge.status || "succeeded",
        payment_type,
        product_type,
        description,
        metadata: meta,
        payment_date: new Date(charge.created * 1000),
        is_test_mode: !charge.livemode,
      })
      stored += 1
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    }
  }

  return { processed, stored, skippedNoCustomer }
}

async function backfillCheckoutSessions(startTs: number) {
  let hasMore = true
  let startingAfter: string | undefined
  let processed = 0
  let stored = 0
  let skippedUnpaid = 0
  let skippedSubscription = 0
  let skippedNonBlueprint = 0
  let fallbackCustomer = 0

  while (hasMore) {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: startTs },
      starting_after: startingAfter,
      expand: ["data.payment_intent", "data.customer"],
    })

    for (const session of sessions.data) {
      processed += 1
      if (session.payment_status !== "paid") {
        skippedUnpaid += 1
        continue
      }
      if (session.mode === "subscription") {
        skippedSubscription += 1
        continue
      }

      const paymentIntent = session.payment_intent
      const paymentIntentId =
        typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id || null

      const customerId =
        (typeof session.customer === "string" ? session.customer : session.customer?.id) ||
        (paymentIntent && typeof paymentIntent === "object"
          ? typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer?.id
          : null)

      const fallbackCustomerId =
        session.customer_email ? `email:${session.customer_email}` : `session:${session.id}`

      const resolvedCustomerId = customerId || fallbackCustomerId
      if (!customerId) {
        fallbackCustomer += 1
      }

      const description = session.metadata?.product_id || session.metadata?.product_type || session.mode
      const meta = session.metadata || {}
      const { payment_type, product_type, isPaidBlueprint } = resolvePaymentType(
        meta,
        description,
        session.mode,
      )

      if (BLUEPRINT_ONLY && product_type !== "paid_blueprint") {
        skippedNonBlueprint += 1
        continue
      }

      const amount = session.amount_total || 0
      if (amount <= 0 && !isPaidBlueprint) continue

      const userId =
        (session.metadata?.user_id as string | undefined) ||
        (paymentIntent && typeof paymentIntent === "object" ? (paymentIntent.metadata?.user_id as string | undefined) : undefined) ||
        (session.customer_email ? await findUserIdByEmail(session.customer_email).catch(() => null) : null)

      await upsertStripePayment({
        stripe_payment_id: paymentIntentId || session.id,
        stripe_customer_id: resolvedCustomerId,
        user_id: userId || null,
        amount_cents: amount,
        currency: session.currency || "usd",
        status: "succeeded",
        payment_type,
        product_type,
        description: description || "Checkout session payment",
        metadata: meta,
        payment_date: new Date((session.created || 0) * 1000),
        is_test_mode: !session.livemode,
      })
      stored += 1
    }

    hasMore = sessions.has_more
    if (sessions.data.length > 0) {
      startingAfter = sessions.data[sessions.data.length - 1].id
    }
  }

  return { processed, stored, skippedUnpaid, skippedSubscription, skippedNonBlueprint, fallbackCustomer }
}

async function main() {
  const startTs = getStartTimestampSeconds()
  console.log(`[BACKFILL] Recent Stripe payments (days=${DAYS}, dry run=${DRY_RUN})`)

  const piResult = await backfillPaymentIntents(startTs)
  const invoiceResult = await backfillInvoices(startTs)
  const chargeResult = await backfillCharges(startTs)
  const sessionResult = await backfillCheckoutSessions(startTs)

  console.log("[BACKFILL] Payment intents processed:", piResult.processed, "stored:", piResult.stored)
  console.log("[BACKFILL] Invoices processed:", invoiceResult.processed, "stored:", invoiceResult.stored)
  console.log(
    "[BACKFILL] Charges processed:",
    chargeResult.processed,
    "stored:",
    chargeResult.stored,
    "skipped (no customer):",
    chargeResult.skippedNoCustomer,
  )
  console.log(
    "[BACKFILL] Checkout sessions processed:",
    sessionResult.processed,
    "stored:",
    sessionResult.stored,
    "skipped (unpaid):",
    sessionResult.skippedUnpaid,
    "skipped (subscription):",
    sessionResult.skippedSubscription,
    "skipped (non-blueprint):",
    sessionResult.skippedNonBlueprint,
    "fallback customer:",
    sessionResult.fallbackCustomer,
  )
}

main().catch((error) => {
  console.error("[BACKFILL] Error:", error)
  process.exit(1)
})
