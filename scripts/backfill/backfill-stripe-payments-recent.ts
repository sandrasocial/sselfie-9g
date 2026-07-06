/**
 * Backfill recent Stripe payments into stripe_payments (idempotent).
 *
 * Usage:
 *   DRY_RUN=true DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
 *   DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
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

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-01-28.clover" })
const sql = neon(DATABASE_URL)
const DRY_RUN = process.env.DRY_RUN === "true"
const DAYS = Number(process.env.DAYS || 90)
const BLUEPRINT_ONLY = process.env.BLUEPRINT_ONLY === "true"

async function ensureStripePaymentAttributionSchema() {
  if (DRY_RUN) return
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS customer_email TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_session_id TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS source TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_source TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_medium TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_campaign TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_content TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_source TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS cta_keyword TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS entry_post_slug TEXT`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS buyer_stage TEXT`
  await sql`CREATE INDEX IF NOT EXISTS stripe_payments_customer_email_idx ON stripe_payments (LOWER(customer_email), payment_date DESC)`
  await sql`CREATE INDEX IF NOT EXISTS stripe_payments_checkout_session_idx ON stripe_payments (checkout_session_id)`
}

function metadataString(metadata: Record<string, any> | undefined | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

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
  customer_email?: string | null
  checkout_session_id?: string | null
  source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  checkout_source?: string | null
  cta_keyword?: string | null
  entry_post_slug?: string | null
  buyer_stage?: string | null
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
      customer_email,
      checkout_session_id,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      checkout_source,
      cta_keyword,
      entry_post_slug,
      buyer_stage,
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
      ${record.customer_email || null},
      ${record.checkout_session_id || null},
      ${record.source || null},
      ${record.utm_source || null},
      ${record.utm_medium || null},
      ${record.utm_campaign || null},
      ${record.utm_content || null},
      ${record.checkout_source || null},
      ${record.cta_keyword || null},
      ${record.entry_post_slug || null},
      ${record.buyer_stage || null},
      ${record.payment_date},
      ${record.is_test_mode},
      NOW(),
      NOW()
    )
    ON CONFLICT (stripe_payment_id)
    DO UPDATE SET
      status = ${record.status},
      user_id = COALESCE(stripe_payments.user_id, EXCLUDED.user_id),
      amount_cents = EXCLUDED.amount_cents,
      currency = EXCLUDED.currency,
      payment_type = ${record.payment_type},
      product_type = ${record.product_type || null},
      metadata = COALESCE(stripe_payments.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      customer_email = COALESCE(stripe_payments.customer_email, ${record.customer_email || null}),
      checkout_session_id = COALESCE(stripe_payments.checkout_session_id, ${record.checkout_session_id || null}),
      source = COALESCE(stripe_payments.source, ${record.source || null}),
      utm_source = COALESCE(stripe_payments.utm_source, ${record.utm_source || null}),
      utm_medium = COALESCE(stripe_payments.utm_medium, ${record.utm_medium || null}),
      utm_campaign = COALESCE(stripe_payments.utm_campaign, ${record.utm_campaign || null}),
      utm_content = COALESCE(stripe_payments.utm_content, ${record.utm_content || null}),
      checkout_source = COALESCE(stripe_payments.checkout_source, ${record.checkout_source || null}),
      cta_keyword = COALESCE(stripe_payments.cta_keyword, ${record.cta_keyword || null}),
      entry_post_slug = COALESCE(stripe_payments.entry_post_slug, ${record.entry_post_slug || null}),
      buyer_stage = COALESCE(stripe_payments.buyer_stage, ${record.buyer_stage || null}),
      updated_at = NOW()
    WHERE stripe_payments.status IS DISTINCT FROM 'duplicate'
  `
}

async function markCheckoutAttributionCompletedFromSession(input: {
  session_id: string
  stripe_payment_id: string
  stripe_customer_id?: string | null
  user_id?: string | null
  user_email?: string | null
  amount_cents: number
  currency: string
  purchased_at: Date
}) {
  if (DRY_RUN) return
  await sql`
    UPDATE checkout_attribution
    SET
      status = 'completed',
      stripe_payment_id = COALESCE(stripe_payment_id, ${input.stripe_payment_id}),
      stripe_customer_id = COALESCE(stripe_customer_id, ${input.stripe_customer_id || null}),
      user_id = COALESCE(user_id, ${input.user_id || null}),
      user_email = COALESCE(user_email, ${input.user_email || null}),
      purchase_value_cents = COALESCE(purchase_value_cents, ${input.amount_cents}),
      purchase_currency = COALESCE(purchase_currency, ${input.currency}),
      purchased_at = COALESCE(purchased_at, ${input.purchased_at}),
      recovered_at = CASE
        WHEN recovery_email_sent_at IS NOT NULL THEN COALESCE(recovered_at, ${input.purchased_at})
        ELSE recovered_at
      END,
      updated_at = NOW()
    WHERE session_id = ${input.session_id}
  `
}

async function backfillPaymentIntents(startTs: number, invoiceLinkedPaymentIds: Set<string>) {
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
      const paymentIntent = pi as Stripe.PaymentIntent & { invoice?: string | Stripe.Invoice | null }
      if (paymentIntent.status !== "succeeded") continue
      if (paymentIntent.invoice) continue // pre-Basil shape; absent on Clover
      // Clover removed pi.invoice, which let renewal PIs slip through as one-time rows and
      // double-count subscription revenue (8 dup rows, Jun 2026). The invoices backfill now
      // runs first and reports every payment id it owns via invoice.payments.
      if (invoiceLinkedPaymentIds.has(paymentIntent.id)) continue

      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id
      const fallbackCustomerId = `payment_intent:${paymentIntent.id}`
      const resolvedCustomerId = customerId || fallbackCustomerId

      const userId = customerId ? await findUserIdByCustomerId(customerId) : null
      const description = paymentIntent.description || ""
      const meta = paymentIntent.metadata || {}
      const { payment_type, product_type } = resolvePaymentType(meta, description)

      await upsertStripePayment({
        stripe_payment_id: paymentIntent.id,
        stripe_customer_id: resolvedCustomerId,
        user_id: userId,
        amount_cents: paymentIntent.amount,
        currency: paymentIntent.currency || "usd",
        status: "succeeded",
        payment_type,
        product_type,
        description,
        metadata: meta,
        payment_date: new Date(paymentIntent.created * 1000),
        is_test_mode: !paymentIntent.livemode,
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
  // Every payment/charge id owned by an invoice in this window, so the PI and charge
  // backfills can skip them instead of re-recording the same money under another id.
  const linkedPaymentIds = new Set<string>()

  while (hasMore) {
    const invoices = await stripe.invoices.list({
      limit: 100,
      status: "paid",
      created: { gte: startTs },
      starting_after: startingAfter,
      expand: ["data.payments"],
    })

    for (const invoice of invoices.data) {
      processed += 1
      const paidInvoice = invoice as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null
        charge?: string | Stripe.Charge | null
        payment_intent?: string | Stripe.PaymentIntent | null
        parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } }
      }
      // Legacy invoice.charge / invoice.payment_intent (pre-Basil shapes).
      for (const legacy of [paidInvoice.charge, paidInvoice.payment_intent]) {
        const id = typeof legacy === "string" ? legacy : legacy?.id
        if (id) linkedPaymentIds.add(id)
      }
      // Clover shape: invoice.payments carries the linked payment intents/charges.
      for (const p of paidInvoice.payments?.data ?? []) {
        const pay = p.payment
        const piId = typeof pay?.payment_intent === "string" ? pay.payment_intent : pay?.payment_intent?.id
        const chId = typeof pay?.charge === "string" ? pay.charge : pay?.charge?.id
        if (piId) linkedPaymentIds.add(piId)
        if (chId) linkedPaymentIds.add(chId)
      }

      // Basil/Clover moved invoice.subscription to parent.subscription_details.subscription;
      // reading only the old shape silently skipped every renewal (Jun 2026 backfill runs).
      const rawSubscription =
        paidInvoice.subscription ?? paidInvoice.parent?.subscription_details?.subscription
      const subscriptionId = typeof rawSubscription === "string" ? rawSubscription : rawSubscription?.id
      const customerId =
        typeof paidInvoice.customer === "string" ? paidInvoice.customer : paidInvoice.customer?.id
      if (!subscriptionId || !customerId) continue

      let productType = "sselfie_studio_membership"
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        productType = subscription.metadata?.product_type || "sselfie_studio_membership"
      } catch {
        // fallback to default
      }

      // Always key invoice rows on the invoice id. Preferring charge/payment_intent ids
      // made the key depend on the API version's payload shape, so the same renewal got
      // recorded under ch_/py_ AND in_ ids across eras (84 duplicate rows cleaned
      // 2026-07-06; idx_stripe_payments_invoice_unique now enforces one row per invoice).
      const paymentId = paidInvoice.id

      const userId = await findUserIdByCustomerId(customerId)

      await upsertStripePayment({
        stripe_payment_id: paymentId,
        stripe_invoice_id: paidInvoice.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        user_id: userId,
        amount_cents: paidInvoice.amount_paid,
        currency: paidInvoice.currency || "usd",
        status: paidInvoice.status || "succeeded",
        payment_type: "subscription",
        product_type: productType,
        description: paidInvoice.description || `Subscription payment - ${productType}`,
        metadata: paidInvoice.metadata || {},
        payment_date: new Date(paidInvoice.created * 1000),
        is_test_mode: !paidInvoice.livemode,
      })
      stored += 1
    }

    hasMore = invoices.has_more
    if (invoices.data.length > 0) {
      startingAfter = invoices.data[invoices.data.length - 1].id
    }
  }

  return { processed, stored, linkedPaymentIds }
}

async function backfillCharges(startTs: number, invoiceLinkedPaymentIds: Set<string>) {
  let hasMore = true
  let startingAfter: string | undefined
  let processed = 0
  let stored = 0
  let fallbackCustomer = 0

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: startTs },
      starting_after: startingAfter,
    })

    for (const charge of charges.data) {
      processed += 1
      const paidCharge = charge as Stripe.Charge & {
        invoice?: string | Stripe.Invoice | null
        payment_intent?: string | Stripe.PaymentIntent | null
      }
      if (!paidCharge.paid || paidCharge.refunded) continue
      if (paidCharge.invoice) continue // pre-Basil shape; absent on Clover
      if (paidCharge.payment_intent) continue // handled by payment intents / checkout sessions backfill
      if (invoiceLinkedPaymentIds.has(paidCharge.id)) continue // invoice-owned on Clover shapes

      const customerId =
        typeof paidCharge.customer === "string" ? paidCharge.customer : paidCharge.customer?.id
      const fallbackCustomerId =
        paidCharge.billing_details?.email ? `email:${paidCharge.billing_details.email}` : `charge:${paidCharge.id}`
      const resolvedCustomerId = customerId || fallbackCustomerId
      if (!customerId) fallbackCustomer += 1

      const userId =
        (customerId ? await findUserIdByCustomerId(customerId) : null) ||
        (paidCharge.billing_details?.email ? await findUserIdByEmail(paidCharge.billing_details.email).catch(() => null) : null)
      const description = paidCharge.description || ""
      const meta = paidCharge.metadata || {}
      const { payment_type, product_type } = resolvePaymentType(meta, description)

      await upsertStripePayment({
        stripe_payment_id: paidCharge.id,
        stripe_customer_id: resolvedCustomerId,
        user_id: userId,
        amount_cents: paidCharge.amount,
        currency: paidCharge.currency || "usd",
        status: paidCharge.status || "succeeded",
        payment_type,
        product_type,
        description,
        metadata: meta,
        payment_date: new Date(paidCharge.created * 1000),
        is_test_mode: !paidCharge.livemode,
      })
      stored += 1
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    }
  }

  return { processed, stored, fallbackCustomer }
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
      const customerEmail =
        session.customer_details?.email?.trim().toLowerCase() ||
        session.customer_email?.trim().toLowerCase() ||
        null

      const userId =
        (session.metadata?.user_id as string | undefined) ||
        (paymentIntent && typeof paymentIntent === "object" ? (paymentIntent.metadata?.user_id as string | undefined) : undefined) ||
        (customerEmail ? await findUserIdByEmail(customerEmail).catch(() => null) : null)
      const stripePaymentId = paymentIntentId || session.id

      await upsertStripePayment({
        stripe_payment_id: stripePaymentId,
        stripe_customer_id: resolvedCustomerId,
        user_id: userId || null,
        amount_cents: amount,
        currency: session.currency || "usd",
        status: "succeeded",
        payment_type,
        product_type,
        description: description || "Checkout session payment",
        metadata: meta,
        customer_email: customerEmail,
        checkout_session_id: session.id,
        source: metadataString(meta, "source"),
        utm_source: metadataString(meta, "utm_source"),
        utm_medium: metadataString(meta, "utm_medium"),
        utm_campaign: metadataString(meta, "utm_campaign"),
        utm_content: metadataString(meta, "utm_content"),
        checkout_source: metadataString(meta, "checkout_source"),
        cta_keyword: metadataString(meta, "cta_keyword"),
        entry_post_slug: metadataString(meta, "entry_post_slug"),
        buyer_stage: metadataString(meta, "buyer_stage"),
        payment_date: new Date((session.created || 0) * 1000),
        is_test_mode: !session.livemode,
      })
      await markCheckoutAttributionCompletedFromSession({
        session_id: session.id,
        stripe_payment_id: stripePaymentId,
        stripe_customer_id: resolvedCustomerId,
        user_id: userId || null,
        user_email: customerEmail,
        amount_cents: amount,
        currency: session.currency || "usd",
        purchased_at: new Date((session.created || 0) * 1000),
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

  await ensureStripePaymentAttributionSchema()
  // Invoices run first: they own subscription money and report the payment/charge ids
  // they cover, so the PI/charge passes never re-record the same money under another id.
  const invoiceResult = await backfillInvoices(startTs)
  const piResult = await backfillPaymentIntents(startTs, invoiceResult.linkedPaymentIds)
  const chargeResult = await backfillCharges(startTs, invoiceResult.linkedPaymentIds)
  const sessionResult = await backfillCheckoutSessions(startTs)

  console.log("[BACKFILL] Payment intents processed:", piResult.processed, "stored:", piResult.stored)
  console.log("[BACKFILL] Invoices processed:", invoiceResult.processed, "stored:", invoiceResult.stored)
  console.log(
    "[BACKFILL] Charges processed:",
    chargeResult.processed,
    "stored:",
    chargeResult.stored,
    "fallback customer:",
    chargeResult.fallbackCustomer,
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
