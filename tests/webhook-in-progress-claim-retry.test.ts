// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  claimEventMock,
  constructEventMock,
  handleCheckoutSessionCompletedMock,
  markEventFailedMock,
  markEventProcessedMock,
} = vi.hoisted(() => ({
  claimEventMock: vi.fn(),
  constructEventMock: vi.fn(),
  handleCheckoutSessionCompletedMock: vi.fn(),
  markEventFailedMock: vi.fn(),
  markEventProcessedMock: vi.fn(),
}))

vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: () => "whsec_test",
  stripe: { webhooks: { constructEvent: constructEventMock } },
}))
vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: vi.fn(async () => ({ success: true })),
}))
vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn(() => false),
}))
vi.mock("@/lib/payments/lifecycle/checkout-session-completed", () => ({
  handleCheckoutSessionCompleted: handleCheckoutSessionCompletedMock,
}))
vi.mock("@/lib/payments/lifecycle/invoice-paid", () => ({ handleInvoicePaid: vi.fn() }))
vi.mock("@/lib/payments/lifecycle/subscription-events", () => ({
  handleSubscriptionCreated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
}))
vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: claimEventMock,
  markEventFailed: markEventFailedMock,
  markEventProcessed: markEventProcessedMock,
}))

function request() {
  return new Request("https://sselfie.ai/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  }) as any
}

describe("Stripe webhook in-progress claim recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    constructEventMock.mockReturnValue({
      id: "evt_recovery",
      type: "checkout.session.completed",
      livemode: true,
      data: { object: { id: "cs_recovery", object: "checkout.session" } },
    })
    handleCheckoutSessionCompletedMock.mockResolvedValue(undefined)
    markEventFailedMock.mockResolvedValue(undefined)
    markEventProcessedMock.mockResolvedValue(undefined)
  })

  it("returns non-2xx for a fresh five-minute claimed event so Stripe retries", async () => {
    claimEventMock.mockResolvedValue({
      claimed: false,
      duplicate: true,
      duplicateStatus: "in_progress",
      provider: "stripe",
      eventId: "evt_recovery",
      storage: "provider-event",
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(request())

    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(handleCheckoutSessionCompletedMock).not.toHaveBeenCalled()
    expect(markEventProcessedMock).not.toHaveBeenCalled()
  })

  it("acknowledges an already processed duplicate with 200", async () => {
    claimEventMock.mockResolvedValue({
      claimed: false,
      duplicate: true,
      duplicateStatus: "processed",
      provider: "stripe",
      eventId: "evt_recovery",
      storage: "provider-event",
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(handleCheckoutSessionCompletedMock).not.toHaveBeenCalled()
  })

  it("keeps a stale non-Academy claim in progress and returns retryable non-2xx", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_recovery",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_recovery",
          object: "checkout.session",
          metadata: { product_type: "credit_topup" },
        },
      },
    })
    claimEventMock.mockImplementation(async input => {
      expect(input.allowStaleClaimReclaim).toBe(false)
      return {
        claimed: false,
        duplicate: true,
        duplicateStatus: "in_progress",
        provider: "stripe",
        eventId: "evt_recovery",
        storage: "provider-event",
      }
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(handleCheckoutSessionCompletedMock).not.toHaveBeenCalled()
  })

  it.each([
    ["checkout.session.completed", "academy_mini_product"],
    ["checkout.session.completed", "visibility_suite"],
    ["checkout.session.async_payment_succeeded", "academy_mini_product"],
  ])(
    "opts exact Academy event %s / %s into stale reclaim and completes processing",
    async (eventType, productType) => {
      constructEventMock.mockReturnValue({
        id: "evt_recovery",
        type: eventType,
        livemode: true,
        data: {
          object: {
            id: "cs_recovery",
            object: "checkout.session",
            metadata: { product_type: productType },
          },
        },
      })
      claimEventMock.mockImplementation(async input => {
        expect(input.allowStaleClaimReclaim).toBe(true)
        return {
          claimed: true,
          duplicate: false,
          duplicateStatus: null,
          provider: "stripe",
          eventId: "evt_recovery",
          storage: "provider-event",
        }
      })

      const { POST } = await import("@/app/api/webhooks/stripe/route")
      const response = await POST(request())

      expect(response.status).toBe(200)
      expect(handleCheckoutSessionCompletedMock).toHaveBeenCalledTimes(1)
      expect(markEventProcessedMock).toHaveBeenCalledWith("stripe", "evt_recovery")
    }
  )

  it.each(["invoice.paid", "invoice.payment_succeeded"])(
    "opts exact %s events into stale reclaim now that invoice fulfillment uses a business-key claim",
    async eventType => {
      constructEventMock.mockReturnValue({
        id: "evt_invoice_recovery",
        type: eventType,
        livemode: true,
        data: {
          object: {
            id: "in_recovery",
            object: "invoice",
          },
        },
      })
      claimEventMock.mockImplementation(async input => {
        expect(input.allowStaleClaimReclaim).toBe(true)
        return {
          claimed: true,
          duplicate: false,
          duplicateStatus: null,
          provider: "stripe",
          eventId: "evt_invoice_recovery",
          storage: "provider-event",
        }
      })

      const { POST } = await import("@/app/api/webhooks/stripe/route")
      const response = await POST(request())

      expect(response.status).toBe(200)
      expect(markEventProcessedMock).toHaveBeenCalledWith("stripe", "evt_invoice_recovery")
    }
  )

  it.each([
    ["checkout.session.completed", undefined],
    ["checkout.session.completed", "academy_mini_product_v2"],
    ["invoice.payment_failed", "academy_mini_product"],
  ])("does not opt near-match event %s / %s into stale reclaim", async (eventType, productType) => {
    constructEventMock.mockReturnValue({
      id: "evt_recovery",
      type: eventType,
      livemode: true,
      data: {
        object: {
          id: "cs_recovery",
          object: "checkout.session",
          metadata: productType ? { product_type: productType } : {},
        },
      },
    })
    claimEventMock.mockImplementation(async input => {
      expect(input.allowStaleClaimReclaim).toBe(false)
      return {
        claimed: false,
        duplicate: true,
        duplicateStatus: "in_progress",
        provider: "stripe",
        eventId: "evt_recovery",
        storage: "provider-event",
      }
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(handleCheckoutSessionCompletedMock).not.toHaveBeenCalled()
  })
})
