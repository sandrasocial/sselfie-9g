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

function resolvePaymentType(metadata: Record<string, any>, description?: string) {
  const productType = metadata?.product_type || null
  if (productType === "credit_topup" || metadata?.package_id?.includes("credit")) {
    return { payment_type: "credit_topup", product_type: "credit_topup" }
  }
  if (productType === "paid_blueprint") {
    return { payment_type: "one_time_session", product_type: "paid_blueprint" }
  }
  if (productType === "one_time_session") {
    return { payment_type: "one_time_session", product_type: "one_time_session" }
  }
  if (description && description.toLowerCase().includes("credit")) {
    return { payment_type: "credit_topup", product_type: "credit_topup" }
  }
  return { payment_type: "one_time_session", product_type: productType }
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

async function main() {
  const startTs = getStartTimestampSeconds()
  console.log(`[BACKFILL] Recent Stripe payments (days=${DAYS}, dry run=${DRY_RUN})`)

  const piResult = await backfillPaymentIntents(startTs)
  const invoiceResult = await backfillInvoices(startTs)

  console.log("[BACKFILL] Payment intents processed:", piResult.processed, "stored:", piResult.stored)
  console.log("[BACKFILL] Invoices processed:", invoiceResult.processed, "stored:", invoiceResult.stored)
}

main().catch((error) => {
  console.error("[BACKFILL] Error:", error)
  process.exit(1)
})
