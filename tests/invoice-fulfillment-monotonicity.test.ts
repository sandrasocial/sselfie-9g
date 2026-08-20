// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  grantMonthlyCredits: vi.fn(),
  grantReferencedBonusCredits: vi.fn(),
  claimEvent: vi.fn(),
  markEventProcessed: vi.fn(),
  markEventFailed: vi.fn(),
  completeReferralForPurchase: vi.fn(),
  sendEmail: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  markRevenueEnginePurchase: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: mocks.retrieveSubscription },
    customers: { retrieve: vi.fn() },
  },
}))
vi.mock("@/lib/credits", () => ({
  grantMonthlyCredits: mocks.grantMonthlyCredits,
  grantReferencedBonusCredits: mocks.grantReferencedBonusCredits,
  SUBSCRIPTION_CREDITS: { sselfie_studio_membership: 100, vault_maya: 30 },
}))
vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: mocks.claimEvent,
  markEventProcessed: mocks.markEventProcessed,
  markEventFailed: mocks.markEventFailed,
}))
vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: mocks.completeReferralForPurchase,
  isReferralPurchaseEligible: vi.fn(() => true),
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: mocks.logAnalyticsEvent }))
vi.mock("@/lib/payments/shared", () => ({
  markRevenueEnginePurchase: mocks.markRevenueEnginePurchase,
}))
vi.mock("@/lib/launch/cash-launch-pricing", () => ({
  getSubscriptionPlanFromMetadata: vi.fn(() => "monthly"),
}))
vi.mock("@/lib/business/maya-tier-pilot", () => ({
  creditGrantProductForMayaPlan: vi.fn(() => "sselfie_studio_membership"),
}))

function invoiceEvent(input: {
  eventId: string
  type?: "invoice.paid" | "invoice.payment_succeeded"
  livemode?: boolean
  billingReason?: "subscription_create" | "subscription_cycle"
}) {
  return {
    id: input.eventId,
    type: input.type || "invoice.payment_succeeded",
    livemode: input.livemode ?? true,
    data: {
      object: {
        id: "in_once_1",
        object: "invoice",
        subscription: "sub_once_1",
        customer: "cus_once_1",
        status: "paid",
        amount_paid: 9700,
        currency: "eur",
        created: 1_780_000_000,
        description: "Membership renewal",
        metadata: {},
        status_transitions: { paid_at: 1_780_000_010 },
        billing_reason: input.billingReason || "subscription_create",
        period_start: 1_780_000_000,
        period_end: 1_782_592_000,
      },
    },
  } as any
}

function queryText(strings: TemplateStringsArray): string {
  return strings.join(" ").replace(/\s+/g, " ").trim()
}

describe("paid invoice business-key fulfillment", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("SELECT user_id, product_type") && query.includes("FROM subscriptions")) {
        return [
          {
            user_id: "user-once-1",
            product_type: "sselfie_studio_membership",
            plan: "monthly",
            current_period_start: new Date("2026-05-27T00:00:00.000Z"),
          },
        ]
      }
      if (query.includes("SELECT email, display_name FROM users")) {
        return [{ email: "member@example.com", display_name: "Member Example" }]
      }
      if (query.includes("SELECT email FROM users")) {
        return [{ email: "member@example.com" }]
      }
      return []
    })
    mocks.retrieveSubscription.mockResolvedValue({
      id: "sub_once_1",
      customer: "cus_once_1",
      status: "active",
      current_period_start: 1_780_000_000,
      current_period_end: 1_782_592_000,
      metadata: { bonus_credits: "4", product_type: "sselfie_studio_membership" },
    })
    mocks.grantMonthlyCredits.mockResolvedValue({
      success: true,
      granted: true,
      newBalance: 100,
    })
    mocks.grantReferencedBonusCredits.mockResolvedValue({
      success: true,
      granted: true,
      newBalance: 104,
    })
    mocks.completeReferralForPurchase.mockResolvedValue({
      success: true,
      status: "completed",
      referralId: 42,
      referrerId: "referrer-1",
    })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "msg_1" })
    mocks.markEventProcessed.mockResolvedValue(undefined)
    mocks.markEventFailed.mockResolvedValue(undefined)
  })

  it("fulfills invoice.paid plus invoice.payment_succeeded once across distinct event IDs", async () => {
    let completed = false
    mocks.claimEvent.mockImplementation(async input => {
      expect(input).toMatchObject({
        provider: "stripe-invoice-fulfillment",
        eventId: "in_once_1",
        allowStaleClaimReclaim: true,
      })
      return completed
        ? { claimed: false, duplicate: true, duplicateStatus: "processed" }
        : { claimed: true, duplicate: false, duplicateStatus: null }
    })
    mocks.markEventProcessed.mockImplementation(async (provider, eventId) => {
      if (provider === "stripe-invoice-fulfillment" && eventId === "in_once_1") completed = true
    })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await handleInvoicePaid(invoiceEvent({ eventId: "evt_paid", type: "invoice.paid" }))
    await handleInvoicePaid(
      invoiceEvent({ eventId: "evt_succeeded", type: "invoice.payment_succeeded" })
    )

    expect(mocks.grantMonthlyCredits).toHaveBeenCalledTimes(1)
    expect(mocks.grantReferencedBonusCredits).toHaveBeenCalledTimes(1)
    expect(mocks.completeReferralForPurchase).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "membership-credit-renewal:in_once_1" })
    )
  })

  it("makes a fresh concurrent invoice claim retryable before any customer effect", async () => {
    mocks.claimEvent.mockResolvedValue({
      claimed: false,
      duplicate: true,
      duplicateStatus: "in_progress",
    })
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")

    await expect(handleInvoicePaid(invoiceEvent({ eventId: "evt_concurrent" }))).rejects.toThrow(
      /already in progress/
    )
    expect(mocks.grantMonthlyCredits).not.toHaveBeenCalled()
    expect(mocks.grantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mocks.completeReferralForPurchase).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("serializes concurrent invoice event types to one fulfillment journey", async () => {
    let state: "idle" | "in_progress" | "processed" = "idle"
    let releaseMoneyWrite: (() => void) | undefined
    const moneyWriteEntered = new Promise<void>(resolve => {
      const originalSql = mocks.sql.getMockImplementation()!
      mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = queryText(strings)
        if (query.includes("INSERT INTO stripe_payments")) {
          resolve()
          await new Promise<void>(release => {
            releaseMoneyWrite = release
          })
        }
        return originalSql(strings, ...values)
      })
    })
    mocks.claimEvent.mockImplementation(async () => {
      if (state === "processed") {
        return { claimed: false, duplicate: true, duplicateStatus: "processed" }
      }
      if (state === "in_progress") {
        return { claimed: false, duplicate: true, duplicateStatus: "in_progress" }
      }
      state = "in_progress"
      return { claimed: true, duplicate: false, duplicateStatus: null }
    })
    mocks.markEventProcessed.mockImplementation(async () => {
      state = "processed"
    })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const first = handleInvoicePaid(invoiceEvent({ eventId: "evt_paid", type: "invoice.paid" }))
    await moneyWriteEntered
    const second = handleInvoicePaid(
      invoiceEvent({ eventId: "evt_succeeded", type: "invoice.payment_succeeded" })
    )
    await expect(second).rejects.toThrow(/already in progress/)
    releaseMoneyWrite?.()
    await expect(first).resolves.toBeUndefined()

    expect(mocks.grantMonthlyCredits).toHaveBeenCalledTimes(1)
    expect(mocks.grantReferencedBonusCredits).toHaveBeenCalledTimes(1)
    expect(mocks.completeReferralForPurchase).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })

  it("fails the invoice claim and leaves every customer effect untouched when money storage fails", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("SELECT user_id, product_type") && query.includes("FROM subscriptions")) {
        return [
          { user_id: "user-once-1", product_type: "sselfie_studio_membership", plan: "monthly" },
        ]
      }
      if (query.includes("INSERT INTO stripe_payments")) {
        throw new Error("money row unavailable")
      }
      return []
    })
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")

    await expect(handleInvoicePaid(invoiceEvent({ eventId: "evt_money_fail" }))).rejects.toThrow(
      "money row unavailable"
    )
    expect(mocks.markEventFailed).toHaveBeenCalledWith(
      "stripe-invoice-fulfillment",
      "in_once_1",
      expect.any(Error)
    )
    expect(mocks.grantMonthlyCredits).not.toHaveBeenCalled()
    expect(mocks.grantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mocks.completeReferralForPurchase).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("records test-mode diagnostics but performs no claim, wallet, referral, access, or email effect", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await handleInvoicePaid(invoiceEvent({ eventId: "evt_test", livemode: false }))

    expect(
      mocks.sql.mock.calls.some(([strings]) =>
        queryText(strings).includes("INSERT INTO stripe_payments")
      )
    ).toBe(true)
    expect(mocks.claimEvent).not.toHaveBeenCalled()
    expect(mocks.grantMonthlyCredits).not.toHaveBeenCalled()
    expect(mocks.grantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mocks.completeReferralForPurchase).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(
      mocks.sql.mock.calls.some(([strings]) => queryText(strings).includes("UPDATE subscriptions"))
    ).toBe(false)
  })

  it("retries safely after a post-credit failure and preserves all stable business keys", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.grantMonthlyCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 100 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 100 })
    mocks.grantReferencedBonusCredits
      .mockResolvedValueOnce({ success: false, granted: false, error: "bonus unavailable" })
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 104 })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({ eventId: "evt_replay" })
    await expect(handleInvoicePaid(event)).rejects.toThrow("bonus unavailable")
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.grantMonthlyCredits).toHaveBeenNthCalledWith(
      1,
      "user-once-1",
      "sselfie_studio_membership",
      false,
      "in_once_1"
    )
    expect(mocks.grantMonthlyCredits).toHaveBeenNthCalledWith(
      2,
      "user-once-1",
      "sselfie_studio_membership",
      false,
      "in_once_1"
    )
    expect(mocks.grantReferencedBonusCredits.mock.calls[0][0]).toEqual(
      mocks.grantReferencedBonusCredits.mock.calls[1][0]
    )
    expect(mocks.markEventFailed).toHaveBeenCalledTimes(1)
    expect(mocks.markEventProcessed).toHaveBeenCalledWith("stripe-invoice-fulfillment", "in_once_1")
  })

  it("retries a referral-stage failure before granting monthly credits", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.completeReferralForPurchase
      .mockResolvedValueOnce({
        success: false,
        status: "reward_failed",
        error: "referral wallet unavailable",
      })
      .mockResolvedValueOnce({ success: true, status: "completed" })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({ eventId: "evt_referral_retry" })
    await expect(handleInvoicePaid(event)).rejects.toThrow("referral wallet unavailable")
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.completeReferralForPurchase).toHaveBeenCalledTimes(2)
    expect(mocks.grantMonthlyCredits).toHaveBeenCalledTimes(1)
    expect(mocks.markEventFailed).toHaveBeenCalledTimes(1)
  })

  it("retries a monthly-reset failure before bonus or email fulfillment", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.grantMonthlyCredits
      .mockResolvedValueOnce({ success: false, granted: false, error: "monthly reset unavailable" })
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 100 })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({ eventId: "evt_monthly_retry" })
    await expect(handleInvoicePaid(event)).rejects.toThrow("monthly reset unavailable")
    expect(mocks.grantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.grantMonthlyCredits).toHaveBeenCalledTimes(2)
    expect(mocks.grantReferencedBonusCredits).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })

  it("retries a renewal-email failure with the same provider key", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.grantMonthlyCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 100 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 100 })
    mocks.grantReferencedBonusCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 104 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 104 })
    mocks.sendEmail
      .mockResolvedValueOnce({ success: false, error: "email provider unavailable" })
      .mockResolvedValueOnce({ success: true, messageId: "msg_replay" })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({ eventId: "evt_email_retry" })
    await expect(handleInvoicePaid(event)).rejects.toThrow("email provider unavailable")
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "membership-credit-renewal:in_once_1",
      "membership-credit-renewal:in_once_1",
    ])
  })

  it("replays safely after email when current-subscription refresh fails", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.grantMonthlyCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 100 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 100 })
    mocks.retrieveSubscription
      .mockRejectedValueOnce(new Error("Stripe subscription unavailable"))
      .mockResolvedValueOnce({
        id: "sub_once_1",
        status: "active",
        current_period_start: 1_780_000_000,
        current_period_end: 1_782_592_000,
      })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({
      eventId: "evt_subscription_retry",
      billingReason: "subscription_cycle",
    })
    await expect(handleInvoicePaid(event)).rejects.toThrow("Stripe subscription unavailable")
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.grantReferencedBonusCredits).not.toHaveBeenCalled()
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "membership-credit-renewal:in_once_1",
      "membership-credit-renewal:in_once_1",
    ])
  })

  it("replays every idempotent stage if final claim completion fails", async () => {
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false, duplicateStatus: null })
    mocks.grantMonthlyCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 100 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 100 })
    mocks.grantReferencedBonusCredits
      .mockResolvedValueOnce({ success: true, granted: true, newBalance: 104 })
      .mockResolvedValueOnce({ success: true, granted: false, newBalance: 104 })
    mocks.markEventProcessed
      .mockRejectedValueOnce(new Error("claim completion unavailable"))
      .mockResolvedValueOnce(undefined)

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const event = invoiceEvent({ eventId: "evt_claim_completion_retry" })
    await expect(handleInvoicePaid(event)).rejects.toThrow("claim completion unavailable")
    await expect(handleInvoicePaid(event)).resolves.toBeUndefined()

    expect(mocks.markEventFailed).toHaveBeenCalledTimes(1)
    expect(mocks.grantMonthlyCredits).toHaveBeenCalledTimes(2)
    expect(mocks.grantReferencedBonusCredits).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "membership-credit-renewal:in_once_1",
      "membership-credit-renewal:in_once_1",
    ])
  })
})
