// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { signBillingRecoveryToken } from "@/lib/payments/billing-recovery-token"

const sqlMock = vi.fn()
const createPortalSessionMock = vi.fn()
const retrieveInvoiceMock = vi.fn()

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    invoices: { retrieve: retrieveInvoiceMock },
    billingPortal: {
      sessions: { create: createPortalSessionMock },
    },
  },
}))

describe("GET /api/stripe/recover-payment", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.ADMIN_ACTION_SECRET = "test-secret-that-is-long-enough-for-hmac"
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    sqlMock.mockResolvedValue([{ stripe_customer_id: "cus_recovery_123", status: "past_due" }])
    createPortalSessionMock.mockResolvedValue({
      url: "https://billing.stripe.com/session/recovery",
    })
    retrieveInvoiceMock.mockResolvedValue({
      id: "in_recovery_123",
      status: "open",
      customer: "cus_recovery_123",
      subscription: "sub_recovery_123",
    })
  })

  it("opens a fresh payment-method flow for only the signed subscription", async () => {
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const { GET } = await import("@/app/api/stripe/recover-payment/route")
    const response = await GET(
      new NextRequest(
        `https://sselfie.ai/api/stripe/recover-payment?token=${encodeURIComponent(token)}`
      )
    )

    expect(sqlMock).toHaveBeenCalledTimes(1)
    expect(sqlMock.mock.calls[0]?.[1]).toBe("sub_recovery_123")
    expect(retrieveInvoiceMock).toHaveBeenCalledWith("in_recovery_123")
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_recovery_123",
        flow_data: expect.objectContaining({
          type: "payment_method_update",
          after_completion: expect.objectContaining({
            redirect: expect.objectContaining({
              return_url: expect.stringContaining("/api/stripe/recover-payment/complete?token="),
            }),
          }),
        }),
      })
    )
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/session/recovery")
  })

  it("does not open Stripe when the signed invoice belongs to another subscription", async () => {
    retrieveInvoiceMock.mockResolvedValueOnce({
      id: "in_recovery_123",
      status: "open",
      customer: "cus_recovery_123",
      subscription: "sub_someone_else",
    })
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const { GET } = await import("@/app/api/stripe/recover-payment/route")
    const response = await GET(
      new NextRequest(
        `https://sselfie.ai/api/stripe/recover-payment?token=${encodeURIComponent(token)}`
      )
    )

    expect(response.status).toBe(400)
    expect(createPortalSessionMock).not.toHaveBeenCalled()
  })

  it("does not open Stripe for an invalid token", async () => {
    const { GET } = await import("@/app/api/stripe/recover-payment/route")
    const response = await GET(
      new NextRequest("https://sselfie.ai/api/stripe/recover-payment?token=bad")
    )

    expect(response.status).toBe(400)
    expect(createPortalSessionMock).not.toHaveBeenCalled()
  })
})
