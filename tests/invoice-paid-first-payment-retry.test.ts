// @vitest-environment node
// Regression coverage for the 2026-07-02 founding-annual incident: the first invoice of a
// brand-new subscription arrives BEFORE checkout.session.completed creates the user +
// subscription rows. The handler must fail (so Stripe retries) instead of silently skipping,
// or the payment never lands in stripe_payments.

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()
const retrieveCustomerMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: retrieveSubscriptionMock },
    customers: { retrieve: retrieveCustomerMock },
  },
}))

vi.mock("@/lib/credits", () => ({
  addCredits: vi.fn(),
  grantMonthlyCredits: vi.fn().mockResolvedValue({ success: true, newBalance: 200 }),
  SUBSCRIPTION_CREDITS: { sselfie_studio_membership: 200 },
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: vi.fn(),
  isReferralPurchaseEligible: vi.fn(() => false),
}))

vi.mock("@/lib/payments/shared", () => ({
  markRevenueEnginePurchase: vi.fn(),
}))

vi.mock("@/lib/launch/cash-launch-pricing", () => ({
  getSubscriptionPlanFromMetadata: vi.fn(() => "founding_annual"),
}))

function buildInvoiceEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type: "invoice.payment_succeeded",
    livemode: true,
    data: {
      object: {
        id: "in_test_1",
        created: Math.floor(Date.now() / 1000) - 30,
        billing_reason: "subscription_create",
        customer: "cus_test_1",
        amount_paid: 69700,
        currency: "eur",
        status: "paid",
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) - 20 },
        metadata: {},
        parent: { subscription_details: { subscription: "sub_test_1" } },
        ...overrides,
      },
    },
  } as any
}

describe("handleInvoicePaid first-payment race", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // No subscriptions row and no users row exist yet (checkout fulfillment hasn't run).
    sqlMock.mockResolvedValue([])
    retrieveSubscriptionMock.mockResolvedValue({
      id: "sub_test_1",
      status: "active",
      customer: "cus_test_1",
      metadata: { product_type: "sselfie_studio_membership_annual" },
      items: { data: [{ current_period_start: 1, current_period_end: 2 }] },
    })
    retrieveCustomerMock.mockResolvedValue({
      id: "cus_test_1",
      deleted: false,
      email: "new-buyer@example.com",
    })
  })

  it("throws on a fresh subscription_create invoice with no matching rows so Stripe retries", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(handleInvoicePaid(buildInvoiceEvent())).rejects.toThrow(
      /failing so Stripe retries/
    )
  })

  it("still skips quietly for renewal invoices with no matching rows", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(
      handleInvoicePaid(buildInvoiceEvent({ billing_reason: "subscription_cycle" }))
    ).resolves.toBeUndefined()
  })

  it("still skips quietly for stale subscription_create invoices (older than 48h)", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const staleCreated = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60
    await expect(
      handleInvoicePaid(buildInvoiceEvent({ created: staleCreated }))
    ).resolves.toBeUndefined()
  })

  it("does not throw when the subscription row already exists", async () => {
    // First query (subscriptions lookup) finds the row; later queries return empty.
    sqlMock.mockResolvedValueOnce([
      { user_id: "user-1", product_type: "sselfie_studio_membership", current_period_start: null },
    ])
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(handleInvoicePaid(buildInvoiceEvent())).resolves.toBeUndefined()
  })
})
