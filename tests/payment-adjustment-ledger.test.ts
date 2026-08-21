// @vitest-environment node

import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn() as any,
  retrieveRefund: vi.fn(),
  listRefunds: vi.fn(),
  retrieveCharge: vi.fn(),
  retrieveDispute: vi.fn(),
  listDisputes: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  retrieveBalanceTransaction: vi.fn(),
  listInvoicePayments: vi.fn(),
  listCheckoutSessions: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: { retrieve: mocks.retrieveRefund, list: mocks.listRefunds },
    charges: { retrieve: mocks.retrieveCharge },
    disputes: { retrieve: mocks.retrieveDispute, list: mocks.listDisputes },
    paymentIntents: { retrieve: mocks.retrievePaymentIntent },
    balanceTransactions: { retrieve: mocks.retrieveBalanceTransaction },
    invoicePayments: { list: mocks.listInvoicePayments },
    checkout: { sessions: { list: mocks.listCheckoutSessions } },
  },
}))

type SqlCall = unknown[] & { 0: TemplateStringsArray }

let paymentRows: Array<Record<string, unknown>>
let transactionCalls: SqlCall[]

function query(call: SqlCall) {
  return Array.from(call[0]).join(" ")
}

function refund(overrides: Record<string, unknown> = {}) {
  return {
    id: "re_adjustment_1",
    object: "refund",
    amount: 1900,
    currency: "usd",
    status: "succeeded",
    reason: "requested_by_customer",
    charge: "ch_adjustment_1",
    payment_intent: "pi_adjustment_1",
    balance_transaction: "txn_refund_1",
    failure_balance_transaction: undefined,
    created: 1_775_000_000,
    ...overrides,
  }
}

function balanceTransaction(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    object: "balance_transaction",
    amount: -1900,
    fee: 0,
    net: -1900,
    currency: "usd",
    created: 1_775_000_010,
    type: "refund",
    reporting_category: "refund",
    source: "re_adjustment_1",
    ...overrides,
  }
}

function charge(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch_adjustment_1",
    object: "charge",
    amount: 1900,
    amount_refunded: 1900,
    currency: "usd",
    payment_intent: "pi_adjustment_1",
    invoice: null,
    livemode: true,
    ...overrides,
  }
}

function event(type: string, object: Record<string, unknown>, livemode = true) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    type,
    livemode,
    data: { object },
  } as any
}

describe("Stripe payment adjustment ledger", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    paymentRows = [
      {
        id: 41,
        stripe_payment_id: "pi_adjustment_1",
        stripe_invoice_id: null,
        stripe_subscription_id: null,
        checkout_session_id: "cs_adjustment_1",
        product_type: "presets_single",
        status: "succeeded",
        amount_cents: 1900,
        currency: "usd",
        is_test_mode: false,
      },
    ]
    transactionCalls = []
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const text = Array.from(strings).join(" ")
      if (text.includes("FROM stripe_payments")) return paymentRows
      if (text.includes("WHERE review_state IN ('unmatched', 'ambiguous')")) {
        return [
          {
            stripe_adjustment_id: "re_review_1",
            adjustment_type: "refund",
            object_status: "succeeded",
            review_reason: "no_local_payment",
            snapshot_observed_at: "2026-08-20T10:00:00.000Z",
            livemode: true,
          },
        ]
      }
      if (text.includes("FROM stripe_payment_adjustments")) {
        return [
          {
            currency: "usd",
            refund_count: 2,
            refund_amount_cents: 5600,
            dispute_count: 1,
            dispute_amount_cents: 4950,
            unmatched_count: 1,
            ambiguous_count: 0,
            cash_movement_net_cents: -10550,
            noneffective_refund_count: 1,
            noneffective_refund_amount_cents: 1900,
            noneffective_dispute_count: 1,
            noneffective_dispute_amount_cents: 4950,
          },
        ]
      }
      return []
    })
    mocks.sql.transaction = vi.fn(async (callback: (tx: any) => unknown[]) => {
      const tx = vi.fn(async (...call: SqlCall) => {
        transactionCalls.push(call)
        return []
      })
      return Promise.all(callback(tx))
    })
    mocks.retrieveRefund.mockResolvedValue(refund())
    mocks.retrieveCharge.mockResolvedValue(charge())
    mocks.listRefunds.mockResolvedValue({ data: [], has_more: false })
    mocks.listDisputes.mockResolvedValue({ data: [], has_more: false })
    mocks.listInvoicePayments.mockResolvedValue({ data: [], has_more: false })
    mocks.listCheckoutSessions.mockResolvedValue({ data: [], has_more: false })
    mocks.retrievePaymentIntent.mockResolvedValue({
      id: "pi_adjustment_1",
      latest_charge: "ch_adjustment_1",
      livemode: true,
    })
    mocks.retrieveBalanceTransaction.mockImplementation(async (id: string) => {
      if (id === "txn_dispute_withdrawn") {
        return balanceTransaction(id, { amount: -4950, net: -4950 })
      }
      if (id === "txn_dispute_reinstated") {
        return balanceTransaction(id, {
          amount: 4950,
          net: 4950,
          type: "adjustment",
          reporting_category: "dispute_reversal",
        })
      }
      return balanceTransaction(id)
    })
    mocks.retrieveDispute.mockResolvedValue({
      id: "dp_adjustment_1",
      object: "dispute",
      amount: 4950,
      currency: "usd",
      status: "lost",
      reason: "fraudulent",
      charge: "ch_adjustment_1",
      livemode: true,
      payment_intent: "pi_adjustment_1",
      balance_transactions: [
        balanceTransaction("txn_dispute_withdrawn", { amount: -4950, net: -4950 }),
      ],
      created: 1_775_000_100,
    })
  })

  it("refreshes a refund and records a matched adjustment plus one exact movement", async () => {
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(
      event("refund.created", refund({ amount: 1, status: "pending" }))
    )

    expect(mocks.retrieveRefund).toHaveBeenCalledWith("re_adjustment_1", {
      expand: ["charge"],
    })
    expect(mocks.retrieveCharge).toHaveBeenCalledWith("ch_adjustment_1")
    expect(transactionCalls).toHaveLength(2)

    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    const movementCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustment_movements")
    )
    expect(adjustmentCall).toBeTruthy()
    expect(adjustmentCall?.slice(1)).toEqual(
      expect.arrayContaining([
        "evt_refund_created",
        "refund",
        "re_adjustment_1",
        "ch_adjustment_1",
        "pi_adjustment_1",
        "cs_adjustment_1",
        41,
        "presets_single",
        "matched",
        "succeeded",
      ])
    )
    expect(movementCall?.slice(1)).toEqual(
      expect.arrayContaining(["txn_refund_1", "refund", -1900, 0, -1900, "usd"])
    )
    expect(mocks.retrieveBalanceTransaction).toHaveBeenCalledWith("txn_refund_1")
    expect(query(adjustmentCall!)).toContain(
      "ON CONFLICT (livemode, adjustment_type, stripe_adjustment_id)"
    )
    expect(query(movementCall!)).toContain(
      "ON CONFLICT (livemode, stripe_balance_transaction_id) DO NOTHING"
    )
  })

  it("records a failed refund and its real failure reversal balance transaction", async () => {
    mocks.retrieveRefund.mockResolvedValue(
      refund({ status: "failed", failure_balance_transaction: "txn_refund_failure_1" })
    )
    mocks.retrieveBalanceTransaction.mockImplementation(async (id: string) =>
      id === "txn_refund_failure_1"
        ? balanceTransaction(id, {
            amount: 1900,
            net: 1900,
            type: "refund_failure",
            reporting_category: "refund_reversal",
          })
        : balanceTransaction(id)
    )
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.failed", refund()))

    const movementValues = transactionCalls
      .filter(call => query(call).includes("INSERT INTO stripe_payment_adjustment_movements"))
      .flatMap(call => call.slice(1))
    expect(movementValues).toEqual(
      expect.arrayContaining(["txn_refund_1", -1900, "txn_refund_failure_1", 1900])
    )
  })

  it("enumerates every current refund from charge.refunded and records by refund business key", async () => {
    mocks.listRefunds.mockResolvedValue({
      data: [{ id: "re_adjustment_1" }, { id: "re_adjustment_2" }],
      has_more: false,
    })
    mocks.retrieveRefund.mockImplementation(async (id: string) => refund({ id }))
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("charge.refunded", charge()))

    expect(mocks.listRefunds).toHaveBeenCalledWith({
      charge: "ch_adjustment_1",
      limit: 100,
    })
    expect(mocks.retrieveRefund).toHaveBeenCalledTimes(2)
    const adjustmentIds = transactionCalls
      .filter(call => query(call).includes("INSERT INTO stripe_payment_adjustments"))
      .flatMap(call => call.slice(1))
    expect(adjustmentIds).toEqual(expect.arrayContaining(["re_adjustment_1", "re_adjustment_2"]))
  })

  it.each([
    { rows: [], mode: true, state: "unmatched", reason: "no_local_payment" },
    {
      rows: [
        { id: 1, stripe_payment_id: "pi_adjustment_1", status: "succeeded", is_test_mode: false },
        { id: 2, stripe_payment_id: "ch_adjustment_1", status: "paid", is_test_mode: false },
      ],
      mode: true,
      state: "ambiguous",
      reason: "multiple_local_payments",
    },
    {
      rows: [
        { id: 3, stripe_payment_id: "pi_adjustment_1", status: "succeeded", is_test_mode: true },
      ],
      mode: true,
      state: "unmatched",
      reason: "livemode_mismatch",
    },
  ])("persists $state review state without guessing a local payment", async fixture => {
    paymentRows = fixture.rows
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund(), fixture.mode))

    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    expect(adjustmentCall?.slice(1)).toEqual(
      expect.arrayContaining([fixture.state, fixture.reason])
    )
    expect(adjustmentCall?.slice(1)).not.toContain(1)
    expect(adjustmentCall?.slice(1)).not.toContain(2)
    expect(adjustmentCall?.slice(1)).not.toContain(3)
  })

  it("uses Clover invoice-payment and Checkout mappings before matching the original gross", async () => {
    paymentRows = [
      {
        id: 77,
        stripe_payment_id: "invoice_payment_local_reference",
        stripe_invoice_id: "in_clover_1",
        checkout_session_id: "cs_clover_1",
        product_type: "sselfie_studio_membership",
        status: "paid",
        amount_cents: 1900,
        currency: "usd",
        is_test_mode: false,
      },
    ]
    mocks.listInvoicePayments.mockResolvedValue({
      data: [{ invoice: "in_clover_1", livemode: true }],
      has_more: false,
    })
    mocks.listCheckoutSessions.mockResolvedValue({
      data: [{ id: "cs_clover_1", livemode: true }],
      has_more: false,
    })
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund()))

    expect(mocks.listInvoicePayments).toHaveBeenCalledWith({
      payment: { type: "payment_intent", payment_intent: "pi_adjustment_1" },
      limit: 100,
    })
    expect(mocks.listCheckoutSessions).toHaveBeenCalledWith({
      payment_intent: "pi_adjustment_1",
      limit: 100,
    })
    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    expect(adjustmentCall?.slice(1)).toEqual(
      expect.arrayContaining(["in_clover_1", "cs_clover_1", 77, "matched"])
    )
  })

  it.each([
    [{ amount_cents: 1800, currency: "usd" }, "gross_amount_mismatch"],
    [{ amount_cents: 1900, currency: "eur" }, "currency_mismatch"],
  ])("keeps local %s mismatch out of matched state", async (overrides, reason) => {
    paymentRows = [{ ...paymentRows[0], ...overrides }]
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund()))

    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    expect(adjustmentCall?.slice(1)).toEqual(expect.arrayContaining(["unmatched", reason]))
    expect(adjustmentCall?.slice(1)).not.toContain(41)
  })

  it("resolves a nullable refund charge through the current PaymentIntent", async () => {
    mocks.retrieveRefund.mockResolvedValue(refund({ charge: null }))
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund({ charge: null })))

    expect(mocks.retrievePaymentIntent).toHaveBeenCalledWith("pi_adjustment_1")
    expect(mocks.retrieveCharge).toHaveBeenCalledWith("ch_adjustment_1")
  })

  it("stores charge-level cumulative refund completion rather than per-refund completion", async () => {
    mocks.retrieveRefund.mockResolvedValue(refund({ amount: 900 }))
    mocks.retrieveCharge.mockResolvedValue(charge({ amount: 1900, amount_refunded: 1900 }))
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund()))

    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    expect(query(adjustmentCall!)).toContain("charge_fully_refunded")
    expect(adjustmentCall?.slice(1)).toContain(true)
  })

  it("uses a monotonic snapshot guard and keeps exact balance transactions immutable", () => {
    const source = readFileSync(
      new URL("../lib/payments/lifecycle/payment-adjustments.ts", import.meta.url),
      "utf8"
    )
    expect(source).toContain("source_event_id")
    expect(source).toContain("snapshot_observed_at")
    expect(source).toContain(
      "WHERE stripe_payment_adjustments.snapshot_observed_at <= EXCLUDED.snapshot_observed_at"
    )
    expect(source).toContain("ON CONFLICT (livemode, stripe_balance_transaction_id) DO NOTHING")
  })

  it("records lost dispute withdrawal and won reinstatement as distinct idempotent movements", async () => {
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(
      event("charge.dispute.funds_withdrawn", { id: "dp_adjustment_1" })
    )
    expect(mocks.retrieveBalanceTransaction).toHaveBeenCalledWith("txn_dispute_withdrawn")

    transactionCalls = []
    mocks.retrieveDispute.mockResolvedValueOnce({
      id: "dp_adjustment_1",
      amount: 4950,
      currency: "usd",
      status: "won",
      reason: "fraudulent",
      charge: "ch_adjustment_1",
      livemode: true,
      payment_intent: "pi_adjustment_1",
      balance_transactions: [
        balanceTransaction("txn_dispute_withdrawn", { amount: -4950, net: -4950 }),
        balanceTransaction("txn_dispute_reinstated", {
          amount: 4950,
          net: 4950,
          type: "adjustment",
          reporting_category: "dispute_reversal",
        }),
      ],
      created: 1_775_000_100,
    })
    await handlePaymentAdjustmentEvent(
      event("charge.dispute.funds_reinstated", { id: "dp_adjustment_1" })
    )
    const movementValues = transactionCalls
      .filter(call => query(call).includes("stripe_payment_adjustment_movements"))
      .flatMap(call => call.slice(1))
    expect(movementValues).toEqual(
      expect.arrayContaining(["txn_dispute_withdrawn", -4950, "txn_dispute_reinstated", 4950])
    )
  })

  it("keeps a newer succeeded fetch when an older pending fetch commits last", async () => {
    vi.useFakeTimers()
    const originalTransaction = mocks.sql.transaction
    let persisted: { status: string; observedAt: Date } | null = null
    mocks.sql.transaction = vi.fn(async (callback: (tx: any) => unknown[]) => {
      const tx = vi.fn(async (...call: SqlCall) => {
        transactionCalls.push(call)
        if (query(call).includes("INSERT INTO stripe_payment_adjustments")) {
          const candidate = { status: String(call[11]), observedAt: call[20] as Date }
          if (!persisted || persisted.observedAt <= candidate.observedAt) persisted = candidate
        }
        return []
      })
      return Promise.all(callback(tx))
    })
    let releaseOldMapping!: (value: { data: never[]; has_more: false }) => void
    const oldMapping = new Promise<{ data: never[]; has_more: false }>(resolve => {
      releaseOldMapping = resolve
    })
    mocks.retrieveRefund
      .mockResolvedValueOnce(refund({ status: "pending", balance_transaction: null }))
      .mockResolvedValueOnce(refund({ status: "succeeded" }))
    mocks.listInvoicePayments
      .mockReturnValueOnce(oldMapping)
      .mockResolvedValueOnce({ data: [], has_more: false })
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"))
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    const oldPending = handlePaymentAdjustmentEvent(event("refund.updated", refund()))
    await vi.advanceTimersByTimeAsync(0)
    vi.setSystemTime(new Date("2026-08-20T10:01:00.000Z"))
    await handlePaymentAdjustmentEvent(event("refund.updated", refund()))
    releaseOldMapping({ data: [], has_more: false })
    await oldPending

    expect(persisted).toEqual({
      status: "succeeded",
      observedAt: new Date("2026-08-20T10:01:00.000Z"),
    })
    mocks.sql.transaction = originalTransaction
    vi.useRealTimers()
  })

  it("discovers every paginated refund and dispute inside an explicit bounded mode window", async () => {
    mocks.listRefunds
      .mockResolvedValueOnce({
        data: [{ id: "re_adjustment_1" }, { id: "re_adjustment_2" }],
        has_more: true,
      })
      .mockResolvedValueOnce({ data: [{ id: "re_adjustment_3" }], has_more: false })
    mocks.listDisputes
      .mockResolvedValueOnce({ data: [{ id: "dp_adjustment_1" }], has_more: true })
      .mockResolvedValueOnce({ data: [{ id: "dp_adjustment_2" }], has_more: false })
    mocks.retrieveRefund.mockImplementation(async (id: string) => refund({ id }))
    mocks.retrieveDispute.mockImplementation(async (id: string) => ({
      id,
      object: "dispute",
      amount: 4950,
      currency: "usd",
      status: "lost",
      reason: "fraudulent",
      charge: "ch_adjustment_1",
      livemode: true,
      payment_intent: "pi_adjustment_1",
      balance_transactions: [],
      created: 1_775_000_100,
    }))
    const { reconcilePaymentAdjustmentWindow } =
      await import("@/lib/payments/lifecycle/payment-adjustments")
    const since = new Date("2026-08-01T00:00:00.000Z")
    const until = new Date("2026-08-02T00:00:00.000Z")

    const result = await reconcilePaymentAdjustmentWindow({
      since,
      until,
      expectedLivemode: true,
    })

    expect(result.mode).toBe("dry_run")
    expect(result.observations.map(item => item.adjustmentId)).toEqual([
      "re_adjustment_1",
      "re_adjustment_2",
      "re_adjustment_3",
      "dp_adjustment_1",
      "dp_adjustment_2",
    ])
    const created = {
      gte: Math.floor(since.getTime() / 1000),
      lte: Math.floor(until.getTime() / 1000),
    }
    expect(mocks.listRefunds).toHaveBeenNthCalledWith(1, { created, limit: 100 })
    expect(mocks.listRefunds).toHaveBeenNthCalledWith(2, {
      created,
      limit: 100,
      starting_after: "re_adjustment_2",
    })
    expect(mocks.listDisputes).toHaveBeenNthCalledWith(2, {
      created,
      limit: 100,
      starting_after: "dp_adjustment_1",
    })
    expect(transactionCalls).toHaveLength(0)
  })

  it.each([
    [{ since: new Date("2026-08-01"), until: new Date("2026-08-02") }, "mode"],
    [{ expectedLivemode: true }, "since and until"],
    [
      {
        expectedLivemode: true,
        since: new Date("2026-01-01"),
        until: new Date("2026-08-01"),
      },
      "31 days",
    ],
  ])("rejects an unbounded discovery input before Stripe calls: %s", async (input, message) => {
    const { reconcilePaymentAdjustmentWindow } =
      await import("@/lib/payments/lifecycle/payment-adjustments")
    await expect(reconcilePaymentAdjustmentWindow(input as any)).rejects.toThrow(message)
    expect(mocks.listRefunds).not.toHaveBeenCalled()
    expect(mocks.listDisputes).not.toHaveBeenCalled()
  })

  it("returns a currency-separated record-only report projection", async () => {
    const { getPaymentAdjustmentReportProjection } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await expect(getPaymentAdjustmentReportProjection()).resolves.toEqual({
      currencies: [
        {
          currency: "usd",
          cash: { balanceTransactionNetCents: -10550 },
          effectiveObjects: {
            refunds: { count: 2, amountCents: 5600 },
            disputes: { count: 1, amountCents: 4950 },
          },
          nonEffectiveObjects: {
            refunds: { count: 1, amountCents: 1900 },
            disputes: { count: 1, amountCents: 4950 },
          },
          review: { unmatched: 1, ambiguous: 0 },
        },
      ],
    })
    expect(
      mocks.sql.mock.calls.every((call: SqlCall) => query(call).trim().startsWith("SELECT"))
    ).toBe(true)
  })

  it("returns a bounded PII-free review queue for operator discovery", async () => {
    const { getPaymentAdjustmentReviewQueue } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await expect(getPaymentAdjustmentReviewQueue({ limit: 25 })).resolves.toEqual({
      reviewQueue: [
        {
          adjustmentId: "re_review_1",
          adjustmentType: "refund",
          status: "succeeded",
          reviewReason: "no_local_payment",
          observedAt: "2026-08-20T10:00:00.000Z",
          mode: "live",
        },
      ],
    })
    const reviewCall = mocks.sql.mock.calls.find((call: SqlCall) =>
      query(call).includes("WHERE review_state IN ('unmatched', 'ambiguous')")
    )
    expect(reviewCall?.slice(1)).toContain(25)
    expect(query(reviewCall!)).not.toMatch(/customer|email|metadata|evidence/i)
  })

  it("durably reviews a customer-balance refund with no charge or PaymentIntent", async () => {
    mocks.retrieveRefund.mockResolvedValue(
      refund({
        charge: null,
        payment_intent: null,
        livemode: true,
        balance_transaction: "txn_refund_1",
      })
    )
    const { handlePaymentAdjustmentEvent } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    await handlePaymentAdjustmentEvent(event("refund.updated", refund()))

    expect(mocks.retrieveCharge).not.toHaveBeenCalled()
    const adjustmentCall = transactionCalls.find(call =>
      query(call).includes("INSERT INTO stripe_payment_adjustments")
    )
    expect(adjustmentCall?.slice(1)).toEqual(
      expect.arrayContaining(["unmatched", "no_charge_or_payment_intent"])
    )
  })

  it("reconciles through the same refresh path and defaults to a no-write dry run", async () => {
    const { reconcilePaymentAdjustmentTargets } =
      await import("@/lib/payments/lifecycle/payment-adjustments")

    const result = await reconcilePaymentAdjustmentTargets({
      targets: [{ type: "refund", id: "re_adjustment_1" }],
      expectedLivemode: true,
    })

    expect(result.mode).toBe("dry_run")
    expect(result.observations[0]).toMatchObject({
      adjustmentType: "refund",
      adjustmentId: "re_adjustment_1",
      reviewState: "matched",
      balanceTransactionIds: ["txn_refund_1"],
    })
    expect(transactionCalls).toHaveLength(0)
  })

  it("is structurally record-only, PII-free, and leaves gross payments immutable", () => {
    const source = readFileSync(
      new URL("../lib/payments/lifecycle/payment-adjustments.ts", import.meta.url),
      "utf8"
    )
    expect(source).not.toMatch(/UPDATE\s+stripe_payments/i)
    expect(source).not.toMatch(/DELETE\s+FROM\s+stripe_payments/i)
    expect(source).not.toMatch(
      /user_entitlements|academy_course_purchases|user_credits|credit_transactions|subscriptions|preset_orders|freebie_subscribers|user_tags|sendEmail/
    )
    expect(source).not.toMatch(
      /customer_email|customer_details|raw_payload|event\.data\.object\.metadata/
    )
  })

  it("tracks exact provider business keys and mode separation in migration 72", () => {
    const migration = readFileSync(
      new URL("../db/migrations/72-create-stripe-payment-adjustment-ledger.sql", import.meta.url),
      "utf8"
    )
    expect(migration).toContain("UNIQUE (livemode, adjustment_type, stripe_adjustment_id)")
    expect(migration).toContain("UNIQUE (livemode, stripe_balance_transaction_id)")
    expect(migration).toContain("source_event_id TEXT NOT NULL")
    expect(migration).toContain("snapshot_observed_at TIMESTAMPTZ NOT NULL")
    expect(migration).toContain("fee_cents BIGINT NOT NULL")
    expect(migration).toContain("net_cents BIGINT NOT NULL")
    expect(migration).not.toMatch(/email|name|raw_payload/i)
  })

  it("ships an explicit report/reconciliation consumer that is dry-run unless --record is set", () => {
    const script = readFileSync(
      new URL("../scripts/reconcile-payment-adjustments.ts", import.meta.url),
      "utf8"
    )
    expect(script).toContain('process.argv.includes("--record")')
    expect(script).toContain("reconcilePaymentAdjustmentTargets")
    expect(script).toContain("reconcilePaymentAdjustmentWindow")
    expect(script).toContain("getPaymentAdjustmentReportProjection")
    expect(script).toContain("getPaymentAdjustmentReviewQueue")
    expect(script).toContain('--since="')
    expect(script).toContain('--until="')
    expect(script).toContain("--report")
    expect(script).toContain("Apply migration 72 before deploying webhook routing")
    expect(script).not.toMatch(
      /sendEmail|user_entitlements|user_credits|subscriptions|stripe_payments\s+SET/
    )
  })
})
