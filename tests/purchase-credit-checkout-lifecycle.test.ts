// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  persistAttribution: vi.fn(),
  addContact: vi.fn(),
  updateTags: vi.fn(),
  sendEmail: vi.fn(),
  ensurePublicAuth: vi.fn(),
  oneTime: vi.fn(),
  topup: vi.fn(),
  transform: vi.fn(),
  blueprint: vi.fn(),
  markRevenue: vi.fn(),
  markConversion: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { retrieve: mocks.retrievePaymentIntent },
    checkout: { sessions: { retrieve: vi.fn() } },
  },
}))
vi.mock("@/lib/revenue-engine/checkout-attribution", () => ({
  ensureRevenueEngineSchema: vi.fn(),
  persistCheckoutAttributionContact: mocks.persistAttribution,
}))
vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: mocks.addContact,
  updateContactTags: mocks.updateTags,
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/email/templates/welcome-email", () => ({
  generateWelcomeEmail: vi.fn(() => ({ html: "<p>ready</p>", text: "ready" })),
}))
vi.mock("@/lib/payments/public-checkout-account", () => ({
  ensureExistingNeonPublicCheckoutAuth: mocks.ensurePublicAuth,
}))
vi.mock("@/lib/payments/handlers/one-time-session", () => ({
  handleOneTimeSessionCheckout: mocks.oneTime,
}))
vi.mock("@/lib/payments/handlers/credit-topup", () => ({
  handleCreditTopupCheckout: mocks.topup,
}))
vi.mock("@/lib/payments/handlers/transform", () => ({
  isTransformProductType: (value: unknown) =>
    value === "transform_starter" || value === "transform_topup",
  handleTransformCheckout: mocks.transform,
}))
vi.mock("@/lib/payments/handlers/paid-blueprint", () => ({
  handlePaidBlueprintCheckout: mocks.blueprint,
}))
vi.mock("@/lib/payments/shared", () => ({
  markRevenueEnginePurchase: mocks.markRevenue,
  markEmailLogConversionForCheckout: mocks.markConversion,
}))
vi.mock("@/lib/events/idempotency", () => ({
  markEventFailed: vi.fn(),
  markEventProcessed: vi.fn(),
}))
vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: vi.fn(),
  isReferralPurchaseEligible: vi.fn(() => false),
  isReferralSignupEligible: vi.fn(() => false),
  trackReferralSignup: vi.fn(),
}))
vi.mock("@/lib/referrals/routing", () => ({ normalizeReferralCode: vi.fn(() => null) }))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: vi.fn() }))
vi.mock("@/lib/brand-engine/offer-checkout-config", () => ({
  isBrandEngineCheckoutProductType: vi.fn(() => false),
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/supabase/find-auth-user-by-email", () => ({
  findAuthUserByEmail: vi.fn(),
}))
vi.mock("@/lib/user-mapping", () => ({ getOrCreateNeonUser: vi.fn() }))

type PurchaseType =
  | "credit_topup"
  | "one_time_session"
  | "transform_starter"
  | "transform_topup"
  | "paid_blueprint"

function eventFor(params: {
  productType: PurchaseType
  livemode: boolean
  paid: boolean
  eventType?: "checkout.session.completed" | "checkout.session.async_payment_succeeded"
}) {
  const suffix = `${params.productType}_${params.livemode ? "live" : "test"}_${params.paid ? "paid" : "unpaid"}`
  return {
    id: `evt_${suffix}`,
    type: params.eventType || "checkout.session.completed",
    livemode: params.livemode,
    data: {
      object: {
        id: `cs_${params.productType}`,
        object: "checkout.session",
        mode: "payment",
        payment_status: params.paid ? "paid" : "unpaid",
        amount_total: 3700,
        currency: "usd",
        payment_intent: `pi_${params.productType}`,
        customer: `cus_${params.productType}`,
        customer_email: "buyer@example.com",
        customer_details: { email: "buyer@example.com", name: "Buyer" },
        metadata: {
          product_type: params.productType,
          user_id: "user_1",
          credits: "10",
          source: params.productType.startsWith("transform_") ? "transform_paid" : "app",
        },
      },
    },
  } as any
}

describe("purchase-credit checkout lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockResolvedValue([])
    mocks.retrievePaymentIntent.mockResolvedValue({
      amount: 3700,
      currency: "usd",
      customer: "cus_1",
    })
    mocks.persistAttribution.mockResolvedValue(undefined)
    mocks.addContact.mockResolvedValue({ success: true, contactId: "contact_1" })
    mocks.updateTags.mockResolvedValue(undefined)
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email_1" })
    mocks.oneTime.mockResolvedValue(undefined)
    mocks.topup.mockResolvedValue(undefined)
    mocks.transform.mockResolvedValue(undefined)
    mocks.blueprint.mockResolvedValue({ referralPurchaseUserId: "user_1" })
    mocks.markRevenue.mockResolvedValue(undefined)
    mocks.markConversion.mockResolvedValue(undefined)
  })

  it.each([
    "credit_topup",
    "one_time_session",
    "transform_starter",
    "transform_topup",
    "paid_blueprint",
  ] as const)("records only diagnostic revenue for unpaid live %s", async productType => {
    const { handleCheckoutSessionCompleted } =
      await import("@/lib/payments/lifecycle/checkout-session-completed")

    await handleCheckoutSessionCompleted(eventFor({ productType, livemode: true, paid: false }))

    const queries = mocks.sql.mock.calls.map(([strings]) => strings.join(" "))
    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain("INSERT INTO stripe_payments")
    expect(mocks.persistAttribution).not.toHaveBeenCalled()
    expect(mocks.addContact).not.toHaveBeenCalled()
    expect(mocks.updateTags).not.toHaveBeenCalled()
    expect(mocks.ensurePublicAuth).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.oneTime).not.toHaveBeenCalled()
    expect(mocks.topup).not.toHaveBeenCalled()
    expect(mocks.transform).not.toHaveBeenCalled()
    expect(mocks.blueprint).not.toHaveBeenCalled()
  })

  it.each([
    "credit_topup",
    "one_time_session",
    "transform_starter",
    "transform_topup",
    "paid_blueprint",
  ] as const)("records only diagnostic revenue for test-mode paid %s", async productType => {
    const { handleCheckoutSessionCompleted } =
      await import("@/lib/payments/lifecycle/checkout-session-completed")

    await handleCheckoutSessionCompleted(eventFor({ productType, livemode: false, paid: true }))

    const queries = mocks.sql.mock.calls.map(([strings]) => strings.join(" "))
    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain("INSERT INTO stripe_payments")
    expect(mocks.persistAttribution).not.toHaveBeenCalled()
    expect(mocks.addContact).not.toHaveBeenCalled()
    expect(mocks.updateTags).not.toHaveBeenCalled()
    expect(mocks.ensurePublicAuth).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.oneTime).not.toHaveBeenCalled()
    expect(mocks.topup).not.toHaveBeenCalled()
    expect(mocks.transform).not.toHaveBeenCalled()
    expect(mocks.blueprint).not.toHaveBeenCalled()
  })

  it.each([
    ["credit_topup", mocks.topup, "credit_topup-confirmation:cs_credit_topup"],
    ["one_time_session", mocks.oneTime, "one_time_session-confirmation:cs_one_time_session"],
    ["transform_starter", mocks.transform, "transform-purchase-confirmation:cs_transform_starter"],
  ] as const)(
    "sends keyed %s confirmation after live async fulfillment succeeds",
    async (productType, handler, idempotencyKey) => {
      const { handleCheckoutSessionCompleted } =
        await import("@/lib/payments/lifecycle/checkout-session-completed")

      await handleCheckoutSessionCompleted(
        eventFor({
          productType,
          livemode: true,
          paid: true,
          eventType: "checkout.session.async_payment_succeeded",
        })
      )

      expect(handler).toHaveBeenCalledTimes(1)
      expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey }))
      expect(handler.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.sendEmail.mock.invocationCallOrder[0]
      )
    }
  )

  it("defers an unpaid checkout and completes on the live async-paid event", async () => {
    const { handleCheckoutSessionCompleted } =
      await import("@/lib/payments/lifecycle/checkout-session-completed")

    await handleCheckoutSessionCompleted(
      eventFor({ productType: "one_time_session", livemode: true, paid: false })
    )
    expect(mocks.oneTime).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()

    await handleCheckoutSessionCompleted(
      eventFor({
        productType: "one_time_session",
        livemode: true,
        paid: true,
        eventType: "checkout.session.async_payment_succeeded",
      })
    )
    expect(mocks.oneTime).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })

  it("does not send before a failed grant and sends once when Stripe replays", async () => {
    mocks.topup
      .mockRejectedValueOnce(new Error("credit grant failed"))
      .mockResolvedValueOnce(undefined)
    const { handleCheckoutSessionCompleted } =
      await import("@/lib/payments/lifecycle/checkout-session-completed")
    const event = eventFor({ productType: "credit_topup", livemode: true, paid: true })

    await expect(handleCheckoutSessionCompleted(event)).rejects.toThrow("credit grant failed")
    expect(mocks.sendEmail).not.toHaveBeenCalled()

    await handleCheckoutSessionCompleted({ ...event, id: "evt_credit_topup_replay" })
    expect(mocks.topup).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "credit_topup-confirmation:cs_credit_topup",
      })
    )
  })
})
