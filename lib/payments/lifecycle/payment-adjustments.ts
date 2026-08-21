import type Stripe from "stripe"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"

const PAYMENT_ADJUSTMENT_EVENT_TYPES = [
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
] as const

type PaymentAdjustmentEventType = (typeof PAYMENT_ADJUSTMENT_EVENT_TYPES)[number]
type AdjustmentType = "refund" | "dispute"
type ReviewState = "matched" | "unmatched" | "ambiguous"
type ReconciliationTarget = { type: "refund" | "dispute" | "charge"; id: string }

type PaymentRow = {
  id: number
  stripe_payment_id?: string | null
  stripe_invoice_id?: string | null
  stripe_subscription_id?: string | null
  checkout_session_id?: string | null
  product_type?: string | null
  status?: string | null
  amount_cents?: number | null
  currency?: string | null
  is_test_mode?: boolean | null
}

type PaymentMapping = {
  localPaymentId: number | null
  invoiceId: string | null
  checkoutSessionId: string | null
  stripeSubscriptionId: string | null
  productType: string | null
  reviewState: ReviewState
  reviewReason: string
}

type ChargeContext = {
  charge: Stripe.Charge | null
  chargeId: string | null
  paymentIntentId: string | null
  invoiceIds: string[]
  checkoutSessionIds: string[]
  livemode: boolean
  unavailableReviewReason?: "no_charge_or_payment_intent" | "no_resolvable_charge"
}

type BalanceMovement = {
  transaction: Stripe.BalanceTransaction
  sourceRole: "refund" | "refund_failure" | "dispute"
}

type AdjustmentSnapshot = {
  adjustmentType: AdjustmentType
  adjustmentId: string
  charge: ChargeContext
  mapping: PaymentMapping
  status: string
  amountCents: number
  currency: string
  chargeFullyRefunded: boolean | null
  reasonCode: string | null
  occurredAt: Date
  movements: BalanceMovement[]
  snapshotObservedAt: Date
}

type PersistenceContext = {
  sourceEventId: string
  sourceEventType: string
}

export type PaymentAdjustmentObservation = {
  adjustmentType: AdjustmentType
  adjustmentId: string
  livemode: boolean
  status: string
  amountCents: number
  currency: string
  reviewState: ReviewState
  reviewReason: string
  balanceTransactionIds: string[]
}

function objectId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === "string" && id.length > 0 ? id : null
  }
  return null
}

function eventObjectId(event: Stripe.Event): string {
  const id = objectId(event.data.object)
  if (!id) throw new Error(`Stripe ${event.type} event has no object id`)
  return id
}

function unixDate(value: number): Date {
  return new Date(value * 1000)
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

async function listInvoiceIds(paymentIntentId: string, livemode: boolean): Promise<string[]> {
  const ids: string[] = []
  let startingAfter: string | undefined
  do {
    const page = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    for (const payment of page.data) {
      if (Boolean(payment.livemode) !== livemode) {
        throw new Error(`Stripe invoice payment ${payment.id} livemode mismatch`)
      }
      ids.push(objectId(payment.invoice) ?? "")
    }
    if (!page.has_more || page.data.length === 0) break
    startingAfter = page.data.at(-1)?.id
  } while (startingAfter)
  return unique(ids)
}

async function listCheckoutSessionIds(
  paymentIntentId: string,
  livemode: boolean
): Promise<string[]> {
  const ids: string[] = []
  let startingAfter: string | undefined
  do {
    const page = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    for (const session of page.data) {
      if (Boolean(session.livemode) !== livemode) {
        throw new Error(`Stripe Checkout session ${session.id} livemode mismatch`)
      }
      ids.push(session.id)
    }
    if (!page.has_more || page.data.length === 0) break
    startingAfter = page.data.at(-1)?.id
  } while (startingAfter)
  return unique(ids)
}

async function resolveChargeContext(
  chargeId: string,
  expectedLivemode?: boolean
): Promise<ChargeContext> {
  const charge = await stripe.charges.retrieve(chargeId)
  const livemode = Boolean(charge.livemode)
  if (expectedLivemode !== undefined && livemode !== expectedLivemode) {
    throw new Error(`Stripe charge ${charge.id} livemode mismatch`)
  }
  const paymentIntentId = objectId(charge.payment_intent)
  const directInvoiceId = objectId((charge as Stripe.Charge & { invoice?: unknown }).invoice)
  const [cloverInvoiceIds, checkoutSessionIds] = paymentIntentId
    ? await Promise.all([
        listInvoiceIds(paymentIntentId, livemode),
        listCheckoutSessionIds(paymentIntentId, livemode),
      ])
    : [[], []]
  return {
    charge,
    chargeId: charge.id,
    paymentIntentId,
    invoiceIds: unique([directInvoiceId, ...cloverInvoiceIds]),
    checkoutSessionIds,
    livemode,
  }
}

async function resolveRefundCharge(
  refund: Stripe.Refund,
  expectedLivemode: boolean
): Promise<ChargeContext> {
  const refundLivemode = (refund as Stripe.Refund & { livemode?: unknown }).livemode
  if (typeof refundLivemode === "boolean" && refundLivemode !== expectedLivemode) {
    throw new Error(`Stripe refund ${refund.id} livemode mismatch`)
  }
  let chargeId = objectId(refund.charge)
  const refundPaymentIntentId = objectId(refund.payment_intent)
  if (!chargeId && refundPaymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(refundPaymentIntentId)
    if (Boolean(paymentIntent.livemode) !== expectedLivemode) {
      throw new Error(`Stripe refund ${refund.id} PaymentIntent livemode mismatch`)
    }
    chargeId = objectId(paymentIntent.latest_charge)
  }
  if (!chargeId) {
    return {
      charge: null,
      chargeId: null,
      paymentIntentId: refundPaymentIntentId,
      invoiceIds: [],
      checkoutSessionIds: [],
      livemode: expectedLivemode,
      unavailableReviewReason: refundPaymentIntentId
        ? "no_resolvable_charge"
        : "no_charge_or_payment_intent",
    }
  }
  const context = await resolveChargeContext(chargeId, expectedLivemode)
  if (objectId(refund.charge) && objectId(refund.charge) !== context.chargeId) {
    throw new Error(`Stripe refund ${refund.id} charge mismatch`)
  }
  if (
    refundPaymentIntentId &&
    context.paymentIntentId &&
    refundPaymentIntentId !== context.paymentIntentId
  ) {
    throw new Error(`Stripe refund ${refund.id} PaymentIntent mismatch`)
  }
  return context
}

async function mapLocalPayment(charge: ChargeContext): Promise<PaymentMapping> {
  if (!charge.charge || !charge.chargeId) {
    return {
      localPaymentId: null,
      invoiceId: null,
      checkoutSessionId: null,
      stripeSubscriptionId: null,
      productType: null,
      reviewState: "unmatched",
      reviewReason: charge.unavailableReviewReason ?? "no_resolvable_charge",
    }
  }
  const paymentReferences = unique([charge.chargeId, charge.paymentIntentId])
  const rows = (await sql`
    SELECT
      id, stripe_payment_id, stripe_invoice_id, stripe_subscription_id,
      checkout_session_id, product_type, status, amount_cents, currency, is_test_mode
    FROM stripe_payments
    WHERE stripe_payment_id = ANY(${paymentReferences})
       OR stripe_invoice_id = ANY(${charge.invoiceIds})
       OR checkout_session_id = ANY(${charge.checkoutSessionIds})
    ORDER BY id ASC
  `) as PaymentRow[]

  const canonicalRows = rows.filter(row => row.status !== "duplicate")
  const sameModeRows = canonicalRows.filter(row => Boolean(row.is_test_mode) === !charge.livemode)
  const unmatched = (reviewReason: string): PaymentMapping => ({
    localPaymentId: null,
    invoiceId: charge.invoiceIds.length === 1 ? charge.invoiceIds[0] : null,
    checkoutSessionId: charge.checkoutSessionIds.length === 1 ? charge.checkoutSessionIds[0] : null,
    stripeSubscriptionId: null,
    productType: null,
    reviewState: "unmatched",
    reviewReason,
  })
  if (sameModeRows.length > 1) {
    return { ...unmatched("multiple_local_payments"), reviewState: "ambiguous" }
  }
  if (sameModeRows.length === 0) {
    return unmatched(
      canonicalRows.length > 0
        ? "livemode_mismatch"
        : rows.length > 0
          ? "only_duplicate_payment_rows"
          : "no_local_payment"
    )
  }
  const row = sameModeRows[0]
  if (Number(row.amount_cents) !== charge.charge.amount) return unmatched("gross_amount_mismatch")
  if (String(row.currency ?? "").toLowerCase() !== charge.charge.currency.toLowerCase()) {
    return unmatched("currency_mismatch")
  }
  return {
    localPaymentId: row.id,
    invoiceId:
      row.stripe_invoice_id ?? (charge.invoiceIds.length === 1 ? charge.invoiceIds[0] : null),
    checkoutSessionId:
      row.checkout_session_id ??
      (charge.checkoutSessionIds.length === 1 ? charge.checkoutSessionIds[0] : null),
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    productType: row.product_type ?? null,
    reviewState: "matched",
    reviewReason: "exact_local_payment",
  }
}

async function resolveMovements(
  references: Array<{ id: string | null; sourceRole: BalanceMovement["sourceRole"] }>
): Promise<BalanceMovement[]> {
  const roles = new Map<string, BalanceMovement["sourceRole"]>()
  for (const reference of references) {
    if (reference.id && !roles.has(reference.id)) roles.set(reference.id, reference.sourceRole)
  }
  return Promise.all(
    [...roles].map(async ([id, sourceRole]) => ({
      transaction: await stripe.balanceTransactions.retrieve(id),
      sourceRole,
    }))
  )
}

async function refreshRefundSnapshot(
  refundId: string,
  expectedLivemode: boolean
): Promise<AdjustmentSnapshot> {
  const refund = await stripe.refunds.retrieve(refundId, { expand: ["charge"] })
  const snapshotObservedAt = new Date()
  const charge = await resolveRefundCharge(refund, expectedLivemode)
  if (
    refund.amount <= 0 ||
    (charge.charge &&
      (refund.currency.toLowerCase() !== charge.charge.currency.toLowerCase() ||
        refund.amount > charge.charge.amount))
  ) {
    throw new Error(`Stripe refund ${refund.id} money mismatch`)
  }
  return {
    adjustmentType: "refund",
    adjustmentId: refund.id,
    charge,
    mapping: await mapLocalPayment(charge),
    status: refund.status ?? "unknown",
    amountCents: refund.amount,
    currency: refund.currency,
    chargeFullyRefunded: charge.charge
      ? charge.charge.amount_refunded >= charge.charge.amount
      : null,
    reasonCode: refund.reason ?? null,
    occurredAt: unixDate(refund.created),
    movements: await resolveMovements([
      { id: objectId(refund.balance_transaction), sourceRole: "refund" },
      { id: objectId(refund.failure_balance_transaction), sourceRole: "refund_failure" },
    ]),
    snapshotObservedAt,
  }
}

async function refreshDisputeSnapshot(
  disputeId: string,
  expectedLivemode: boolean
): Promise<AdjustmentSnapshot> {
  const dispute = await stripe.disputes.retrieve(disputeId)
  const snapshotObservedAt = new Date()
  const livemode = Boolean(dispute.livemode)
  if (livemode !== expectedLivemode) {
    throw new Error(`Stripe dispute ${dispute.id} livemode mismatch`)
  }
  const chargeId = objectId(dispute.charge)
  if (!chargeId) throw new Error(`Stripe dispute ${dispute.id} has no charge`)
  const charge = await resolveChargeContext(chargeId, livemode)
  if (
    !charge.charge ||
    dispute.currency.toLowerCase() !== charge.charge.currency.toLowerCase() ||
    dispute.amount <= 0
  ) {
    throw new Error(`Stripe dispute ${dispute.id} money mismatch`)
  }
  return {
    adjustmentType: "dispute",
    adjustmentId: dispute.id,
    charge,
    mapping: await mapLocalPayment(charge),
    status: dispute.status,
    amountCents: dispute.amount,
    currency: dispute.currency,
    chargeFullyRefunded: null,
    reasonCode: dispute.reason,
    occurredAt: unixDate(dispute.created),
    movements: await resolveMovements(
      dispute.balance_transactions.map(transaction => ({
        id: objectId(transaction),
        sourceRole: "dispute" as const,
      }))
    ),
    snapshotObservedAt,
  }
}

async function persistAdjustment(
  snapshot: AdjustmentSnapshot,
  context: PersistenceContext
): Promise<void> {
  await sql.transaction(tx => [
    tx`
      INSERT INTO stripe_payment_adjustments (
        livemode, adjustment_type, stripe_adjustment_id, stripe_charge_id,
        stripe_payment_intent_id, stripe_invoice_id, stripe_checkout_session_id,
        stripe_subscription_id, local_payment_id, product_type, object_status,
        review_state, review_reason, amount_cents, currency, charge_fully_refunded,
        reason_code, source_event_id, source_event_type, snapshot_observed_at,
        occurred_at, updated_at
      ) VALUES (
        ${snapshot.charge.livemode}, ${snapshot.adjustmentType}, ${snapshot.adjustmentId},
        ${snapshot.charge.chargeId}, ${snapshot.charge.paymentIntentId},
        ${snapshot.mapping.invoiceId}, ${snapshot.mapping.checkoutSessionId},
        ${snapshot.mapping.stripeSubscriptionId}, ${snapshot.mapping.localPaymentId},
        ${snapshot.mapping.productType}, ${snapshot.status}, ${snapshot.mapping.reviewState},
        ${snapshot.mapping.reviewReason}, ${snapshot.amountCents}, ${snapshot.currency},
        ${snapshot.chargeFullyRefunded}, ${snapshot.reasonCode}, ${context.sourceEventId},
        ${context.sourceEventType}, ${snapshot.snapshotObservedAt}, ${snapshot.occurredAt}, NOW()
      )
      ON CONFLICT (livemode, adjustment_type, stripe_adjustment_id)
      DO UPDATE SET
        stripe_charge_id = EXCLUDED.stripe_charge_id,
        stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
        stripe_invoice_id = EXCLUDED.stripe_invoice_id,
        stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        local_payment_id = EXCLUDED.local_payment_id,
        product_type = EXCLUDED.product_type,
        object_status = EXCLUDED.object_status,
        review_state = EXCLUDED.review_state,
        review_reason = EXCLUDED.review_reason,
        amount_cents = EXCLUDED.amount_cents,
        currency = EXCLUDED.currency,
        charge_fully_refunded = EXCLUDED.charge_fully_refunded,
        reason_code = EXCLUDED.reason_code,
        source_event_id = EXCLUDED.source_event_id,
        source_event_type = EXCLUDED.source_event_type,
        snapshot_observed_at = EXCLUDED.snapshot_observed_at,
        occurred_at = EXCLUDED.occurred_at,
        updated_at = NOW()
      WHERE stripe_payment_adjustments.snapshot_observed_at <= EXCLUDED.snapshot_observed_at
    `,
    ...snapshot.movements.map(
      movement => tx`
        INSERT INTO stripe_payment_adjustment_movements (
          livemode, adjustment_type, stripe_adjustment_id,
          stripe_balance_transaction_id, source_role, balance_transaction_type,
          reporting_category, balance_status, amount_cents, fee_cents, net_cents,
          currency, source_event_id, occurred_at
        ) VALUES (
          ${snapshot.charge.livemode}, ${snapshot.adjustmentType}, ${snapshot.adjustmentId},
          ${movement.transaction.id}, ${movement.sourceRole}, ${movement.transaction.type},
          ${movement.transaction.reporting_category}, ${movement.transaction.status},
          ${movement.transaction.amount}, ${movement.transaction.fee}, ${movement.transaction.net},
          ${movement.transaction.currency}, ${context.sourceEventId},
          ${unixDate(movement.transaction.created)}
        )
        ON CONFLICT (livemode, stripe_balance_transaction_id) DO NOTHING
      `
    ),
  ])
}

function observation(snapshot: AdjustmentSnapshot): PaymentAdjustmentObservation {
  return {
    adjustmentType: snapshot.adjustmentType,
    adjustmentId: snapshot.adjustmentId,
    livemode: snapshot.charge.livemode,
    status: snapshot.status,
    amountCents: snapshot.amountCents,
    currency: snapshot.currency,
    reviewState: snapshot.mapping.reviewState,
    reviewReason: snapshot.mapping.reviewReason,
    balanceTransactionIds: snapshot.movements.map(movement => movement.transaction.id),
  }
}

async function listChargeRefundIds(chargeId: string, expectedLivemode: boolean): Promise<string[]> {
  const charge = await stripe.charges.retrieve(chargeId)
  if (Boolean(charge.livemode) !== expectedLivemode) {
    throw new Error(`Stripe charge ${charge.id} livemode mismatch`)
  }
  const ids: string[] = []
  let startingAfter: string | undefined
  do {
    const page = await stripe.refunds.list({
      charge: chargeId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    ids.push(...page.data.map(item => item.id))
    if (!page.has_more || page.data.length === 0) break
    startingAfter = page.data.at(-1)?.id
  } while (startingAfter)
  return unique(ids)
}

export function isPaymentAdjustmentEventType(value: string): value is PaymentAdjustmentEventType {
  return PAYMENT_ADJUSTMENT_EVENT_TYPES.includes(value as PaymentAdjustmentEventType)
}

const MAX_RECONCILIATION_WINDOW_MS = 31 * 24 * 60 * 60 * 1000

function validateReconciliationWindow(input: {
  since?: Date
  until?: Date
  expectedLivemode?: boolean
}): { since: Date; until: Date; expectedLivemode: boolean } {
  if (typeof input.expectedLivemode !== "boolean") {
    throw new Error("An explicit live/test mode is required")
  }
  if (!(input.since instanceof Date) || !(input.until instanceof Date)) {
    throw new Error("Explicit since and until timestamps are required")
  }
  if (!Number.isFinite(input.since.getTime()) || !Number.isFinite(input.until.getTime())) {
    throw new Error("since and until must be valid timestamps")
  }
  const windowMs = input.until.getTime() - input.since.getTime()
  if (windowMs <= 0) throw new Error("until must be after since")
  if (windowMs > MAX_RECONCILIATION_WINDOW_MS) {
    throw new Error("Reconciliation windows cannot exceed 31 days")
  }
  return {
    since: input.since,
    until: input.until,
    expectedLivemode: input.expectedLivemode,
  }
}

async function discoverAdjustmentTargets(input: {
  since: Date
  until: Date
}): Promise<ReconciliationTarget[]> {
  const created = {
    gte: Math.floor(input.since.getTime() / 1000),
    lte: Math.floor(input.until.getTime() / 1000),
  }
  const targets: ReconciliationTarget[] = []

  let refundCursor: string | undefined
  do {
    const page = await stripe.refunds.list({
      created,
      limit: 100,
      ...(refundCursor ? { starting_after: refundCursor } : {}),
    })
    targets.push(...page.data.map(item => ({ type: "refund" as const, id: item.id })))
    if (!page.has_more || page.data.length === 0) break
    refundCursor = page.data.at(-1)?.id
  } while (refundCursor)

  let disputeCursor: string | undefined
  do {
    const page = await stripe.disputes.list({
      created,
      limit: 100,
      ...(disputeCursor ? { starting_after: disputeCursor } : {}),
    })
    targets.push(...page.data.map(item => ({ type: "dispute" as const, id: item.id })))
    if (!page.has_more || page.data.length === 0) break
    disputeCursor = page.data.at(-1)?.id
  } while (disputeCursor)

  return targets
}

export async function reconcilePaymentAdjustmentWindow(input: {
  since?: Date
  until?: Date
  expectedLivemode?: boolean
  record?: boolean
}): Promise<{ mode: "dry_run" | "record"; observations: PaymentAdjustmentObservation[] }> {
  const window = validateReconciliationWindow(input)
  const targets = await discoverAdjustmentTargets(window)
  return reconcilePaymentAdjustmentTargets({
    targets,
    expectedLivemode: window.expectedLivemode,
    record: input.record,
  })
}

export async function reconcilePaymentAdjustmentTargets(input: {
  targets: ReconciliationTarget[]
  expectedLivemode: boolean
  record?: boolean
}): Promise<{ mode: "dry_run" | "record"; observations: PaymentAdjustmentObservation[] }> {
  if (typeof input.expectedLivemode !== "boolean") {
    throw new Error("An explicit live/test mode is required")
  }
  const snapshots: AdjustmentSnapshot[] = []
  for (const target of input.targets) {
    if (target.type === "refund") {
      snapshots.push(await refreshRefundSnapshot(target.id, input.expectedLivemode))
    } else if (target.type === "dispute") {
      snapshots.push(await refreshDisputeSnapshot(target.id, input.expectedLivemode))
    } else {
      for (const refundId of await listChargeRefundIds(target.id, input.expectedLivemode)) {
        snapshots.push(await refreshRefundSnapshot(refundId, input.expectedLivemode))
      }
    }
  }
  if (input.record) {
    for (const snapshot of snapshots) {
      await persistAdjustment(snapshot, {
        sourceEventId: `manual_reconciliation:${snapshot.adjustmentType}:${snapshot.adjustmentId}`,
        sourceEventType: `reconciliation.${snapshot.adjustmentType}`,
      })
    }
  }
  return {
    mode: input.record ? "record" : "dry_run",
    observations: snapshots.map(observation),
  }
}

export async function handlePaymentAdjustmentEvent(event: Stripe.Event): Promise<void> {
  if (!isPaymentAdjustmentEventType(event.type)) {
    throw new Error(`Unsupported Stripe payment adjustment event: ${event.type}`)
  }
  const expectedLivemode = Boolean(event.livemode)
  const snapshots: AdjustmentSnapshot[] = []
  if (event.type.startsWith("refund.")) {
    snapshots.push(await refreshRefundSnapshot(eventObjectId(event), expectedLivemode))
  } else if (event.type === "charge.refunded") {
    for (const refundId of await listChargeRefundIds(eventObjectId(event), expectedLivemode)) {
      snapshots.push(await refreshRefundSnapshot(refundId, expectedLivemode))
    }
  } else {
    snapshots.push(await refreshDisputeSnapshot(eventObjectId(event), expectedLivemode))
  }
  for (const snapshot of snapshots) {
    await persistAdjustment(snapshot, {
      sourceEventId: event.id,
      sourceEventType: event.type,
    })
  }
}

export async function getPaymentAdjustmentReviewQueue(
  input: {
    limit?: number
    livemode?: boolean
  } = {}
): Promise<{
  reviewQueue: Array<{
    adjustmentId: string
    adjustmentType: string
    status: string
    reviewReason: string
    observedAt: string
    mode: "live" | "test"
  }>
}> {
  const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 100)))
  const rows =
    input.livemode === undefined
      ? await sql`
          SELECT
            stripe_adjustment_id,
            adjustment_type,
            object_status,
            review_reason,
            snapshot_observed_at,
            livemode
          FROM stripe_payment_adjustments
          WHERE review_state IN ('unmatched', 'ambiguous')
          ORDER BY snapshot_observed_at DESC, stripe_adjustment_id ASC
          LIMIT ${limit}
        `
      : await sql`
          SELECT
            stripe_adjustment_id,
            adjustment_type,
            object_status,
            review_reason,
            snapshot_observed_at,
            livemode
          FROM stripe_payment_adjustments
          WHERE review_state IN ('unmatched', 'ambiguous')
            AND livemode = ${input.livemode}
          ORDER BY snapshot_observed_at DESC, stripe_adjustment_id ASC
          LIMIT ${limit}
        `
  return {
    reviewQueue: rows.map(row => ({
      adjustmentId: String(row.stripe_adjustment_id),
      adjustmentType: String(row.adjustment_type),
      status: String(row.object_status),
      reviewReason: String(row.review_reason),
      observedAt: new Date(row.snapshot_observed_at).toISOString(),
      mode: row.livemode ? "live" : "test",
    })),
  }
}

export async function getPaymentAdjustmentReportProjection(): Promise<{
  currencies: Array<{
    currency: string
    cash: { balanceTransactionNetCents: number }
    effectiveObjects: {
      refunds: { count: number; amountCents: number }
      disputes: { count: number; amountCents: number }
    }
    nonEffectiveObjects: {
      refunds: { count: number; amountCents: number }
      disputes: { count: number; amountCents: number }
    }
    review: { unmatched: number; ambiguous: number }
  }>
}> {
  const rows = await sql`
    SELECT
      COALESCE(adjustment_totals.currency, movement_totals.currency) AS currency,
      adjustment_totals.refund_count,
      adjustment_totals.refund_amount_cents,
      adjustment_totals.dispute_count,
      adjustment_totals.dispute_amount_cents,
      adjustment_totals.noneffective_refund_count,
      adjustment_totals.noneffective_refund_amount_cents,
      adjustment_totals.noneffective_dispute_count,
      adjustment_totals.noneffective_dispute_amount_cents,
      adjustment_totals.unmatched_count,
      adjustment_totals.ambiguous_count,
      COALESCE(movement_totals.cash_movement_net_cents, 0) AS cash_movement_net_cents
    FROM (
      SELECT
        currency,
        COUNT(*) FILTER (WHERE adjustment_type = 'refund' AND object_status = 'succeeded')::INTEGER AS refund_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE adjustment_type = 'refund' AND object_status = 'succeeded'), 0)::BIGINT AS refund_amount_cents,
        COUNT(*) FILTER (WHERE adjustment_type = 'dispute' AND object_status IN ('lost', 'won'))::INTEGER AS dispute_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE adjustment_type = 'dispute' AND object_status IN ('lost', 'won')), 0)::BIGINT AS dispute_amount_cents,
        COUNT(*) FILTER (WHERE adjustment_type = 'refund' AND object_status <> 'succeeded')::INTEGER AS noneffective_refund_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE adjustment_type = 'refund' AND object_status <> 'succeeded'), 0)::BIGINT AS noneffective_refund_amount_cents,
        COUNT(*) FILTER (WHERE adjustment_type = 'dispute' AND object_status NOT IN ('lost', 'won'))::INTEGER AS noneffective_dispute_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE adjustment_type = 'dispute' AND object_status NOT IN ('lost', 'won')), 0)::BIGINT AS noneffective_dispute_amount_cents,
        COUNT(*) FILTER (WHERE review_state = 'unmatched')::INTEGER AS unmatched_count,
        COUNT(*) FILTER (WHERE review_state = 'ambiguous')::INTEGER AS ambiguous_count
      FROM stripe_payment_adjustments
      WHERE livemode = TRUE
      GROUP BY currency
    ) adjustment_totals
    FULL OUTER JOIN (
      SELECT currency, COALESCE(SUM(net_cents), 0)::BIGINT AS cash_movement_net_cents
      FROM stripe_payment_adjustment_movements
      WHERE livemode = TRUE
      GROUP BY currency
    ) movement_totals USING (currency)
    ORDER BY COALESCE(adjustment_totals.currency, movement_totals.currency) ASC
  `
  return {
    currencies: rows.map(row => ({
      currency: String(row.currency),
      cash: {
        balanceTransactionNetCents: Number(row.cash_movement_net_cents),
      },
      effectiveObjects: {
        refunds: {
          count: Number(row.refund_count),
          amountCents: Number(row.refund_amount_cents),
        },
        disputes: {
          count: Number(row.dispute_count),
          amountCents: Number(row.dispute_amount_cents),
        },
      },
      nonEffectiveObjects: {
        refunds: {
          count: Number(row.noneffective_refund_count),
          amountCents: Number(row.noneffective_refund_amount_cents),
        },
        disputes: {
          count: Number(row.noneffective_dispute_count),
          amountCents: Number(row.noneffective_dispute_amount_cents),
        },
      },
      review: {
        unmatched: Number(row.unmatched_count),
        ambiguous: Number(row.ambiguous_count),
      },
    })),
  }
}
