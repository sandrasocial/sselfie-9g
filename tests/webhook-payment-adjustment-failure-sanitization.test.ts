// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  claimEvent: vi.fn(),
  markEventFailed: vi.fn(),
  logWebhookError: vi.fn(),
  handlePaymentAdjustmentEvent: vi.fn(),
}))

vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: () => "whsec_test",
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
}))
vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: vi.fn(async () => ({ success: true })),
}))
vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: mocks.logWebhookError,
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn(() => false),
}))
vi.mock("@/lib/payments/lifecycle/payment-adjustments", () => ({
  handlePaymentAdjustmentEvent: mocks.handlePaymentAdjustmentEvent,
  isPaymentAdjustmentEventType: (value: string) => value.startsWith("refund."),
}))
vi.mock("@/lib/payments/lifecycle/checkout-session-completed", () => ({
  handleCheckoutSessionCompleted: vi.fn(),
}))
vi.mock("@/lib/payments/lifecycle/invoice-paid", () => ({ handleInvoicePaid: vi.fn() }))
vi.mock("@/lib/payments/lifecycle/subscription-events", () => ({
  handleSubscriptionCreated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
}))
vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: mocks.claimEvent,
  markEventFailed: mocks.markEventFailed,
  markEventProcessed: vi.fn(),
}))

describe("payment adjustment webhook failure evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructEvent.mockReturnValue({
      id: "evt_refund_failure",
      type: "refund.updated",
      livemode: true,
      data: {
        object: {
          id: "re_failure",
          object: "refund",
          customer_email: "private@example.com",
          metadata: { secret: "do-not-log" },
          evidence: { customer_communication: "private" },
        },
      },
    })
    mocks.claimEvent.mockResolvedValue({ claimed: true, duplicate: false })
    mocks.markEventFailed.mockResolvedValue(undefined)
    mocks.handlePaymentAdjustmentEvent.mockRejectedValue(new Error("ledger unavailable"))
  })

  it("logs only sanitized identifiers when record-only adjustment handling fails", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(
      new Request("https://sselfie.ai/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any
    )

    expect(response.status).toBe(500)
    expect(mocks.logWebhookError).toHaveBeenCalledTimes(1)
    const failure = mocks.logWebhookError.mock.calls[0][0]
    expect(failure.eventData).toEqual({ object_id: "re_failure", livemode: true })
    expect(JSON.stringify(failure)).not.toContain("private@example.com")
    expect(JSON.stringify(failure)).not.toContain("do-not-log")
    expect(JSON.stringify(failure)).not.toContain("customer_communication")
  })
})
