// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  event: null as any,
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  retrieveCustomer: vi.fn(),
  retrieveInvoice: vi.fn(),
  sendEmail: vi.fn(),
  upsertSubscription: vi.fn(),
  signBillingRecoveryToken: vi.fn(),
  claimEvent: vi.fn(),
  markEventProcessed: vi.fn(),
  markEventFailed: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: () => "whsec_test",
  stripe: {
    webhooks: { constructEvent: vi.fn(() => mocks.event) },
    subscriptions: {
      retrieve: mocks.retrieveSubscription,
      update: mocks.updateSubscription,
    },
    customers: { retrieve: mocks.retrieveCustomer },
    invoices: { retrieve: mocks.retrieveInvoice },
  },
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/payments/lifecycle/upsert-studio-membership", () => ({
  upsertStudioMembershipSubscription: mocks.upsertSubscription,
}))
vi.mock("@/lib/payments/billing-recovery-token", () => ({
  signBillingRecoveryToken: mocks.signBillingRecoveryToken,
}))
vi.mock("@/lib/payments/lifecycle/checkout-session-completed", () => ({
  handleCheckoutSessionCompleted: vi.fn(),
}))
vi.mock("@/lib/payments/lifecycle/invoice-paid", () => ({ handleInvoicePaid: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: vi.fn(async () => ({ success: true })),
}))
vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn(() => false),
}))
vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: mocks.claimEvent,
  markEventProcessed: mocks.markEventProcessed,
  markEventFailed: mocks.markEventFailed,
}))

function request() {
  return new Request("https://sselfie.ai/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  }) as any
}

describe("test-mode subscription lifecycle isolation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.claimEvent.mockResolvedValue({
      claimed: true,
      duplicate: false,
      provider: "stripe",
      eventId: "evt_test_subscription",
      storage: "provider-event",
    })
    mocks.markEventProcessed.mockResolvedValue(undefined)
    mocks.markEventFailed.mockResolvedValue(undefined)
  })

  it.each([
    ["customer.subscription.created", "subscription"],
    ["customer.subscription.updated", "subscription"],
    ["customer.subscription.deleted", "subscription"],
    ["invoice.payment_failed", "invoice"],
  ] as const)("keeps %s out of every shared customer system", async (type, object) => {
    mocks.event = {
      id: `evt_${type}`,
      type,
      livemode: false,
      data: {
        object: {
          id: object === "invoice" ? "in_test_subscription" : "sub_test_subscription",
          object,
          customer: "cus_test_subscription",
          subscription: "sub_test_subscription",
        },
      },
    }

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled()
    expect(mocks.updateSubscription).not.toHaveBeenCalled()
    expect(mocks.retrieveCustomer).not.toHaveBeenCalled()
    expect(mocks.retrieveInvoice).not.toHaveBeenCalled()
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
    expect(mocks.signBillingRecoveryToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.markEventProcessed).toHaveBeenCalledWith("stripe", `evt_${type}`)
    expect(mocks.markEventFailed).not.toHaveBeenCalled()
  })
})
