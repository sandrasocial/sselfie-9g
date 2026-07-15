// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { signBillingRecoveryToken } from "@/lib/payments/billing-recovery-token"

const sqlMock = vi.fn()
const retrieveInvoiceMock = vi.fn()
const payInvoiceMock = vi.fn()
const retrieveCustomerMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()
const updateSubscriptionMock = vi.fn()

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    invoices: { retrieve: retrieveInvoiceMock, pay: payInvoiceMock },
    customers: { retrieve: retrieveCustomerMock },
    subscriptions: {
      retrieve: retrieveSubscriptionMock,
      update: updateSubscriptionMock,
    },
  },
}))

describe("GET /api/stripe/recover-payment/complete", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.ADMIN_ACTION_SECRET = "test-secret-that-is-long-enough-for-hmac"
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    sqlMock.mockResolvedValue([{ stripe_customer_id: "cus_recovery_123", status: "past_due" }])
    retrieveInvoiceMock.mockResolvedValue({
      id: "in_recovery_123",
      status: "open",
      customer: "cus_recovery_123",
      subscription: "sub_recovery_123",
    })
    retrieveCustomerMock.mockResolvedValue({
      id: "cus_recovery_123",
      deleted: false,
      invoice_settings: { default_payment_method: "pm_new_123" },
    })
    retrieveSubscriptionMock.mockResolvedValue({
      id: "sub_recovery_123",
      status: "past_due",
      customer: "cus_recovery_123",
    })
    updateSubscriptionMock.mockResolvedValue({ id: "sub_recovery_123" })
    payInvoiceMock.mockResolvedValue({ id: "in_recovery_123", status: "paid" })
  })

  it("copies the new card to only the signed live subscription and lets Stripe retry later", async () => {
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const { GET } = await import("@/app/api/stripe/recover-payment/complete/route")
    const response = await GET(
      new NextRequest(
        `https://sselfie.ai/api/stripe/recover-payment/complete?token=${encodeURIComponent(token)}`
      )
    )

    expect(updateSubscriptionMock).toHaveBeenCalledWith("sub_recovery_123", {
      default_payment_method: "pm_new_123",
    })
    expect(payInvoiceMock).not.toHaveBeenCalled()
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://sselfie.ai/app?billing=updated")
  })

  it("does not update or charge when Stripe says the subscription was canceled", async () => {
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_recovery_123",
      status: "canceled",
      customer: "cus_recovery_123",
    })
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const { GET } = await import("@/app/api/stripe/recover-payment/complete/route")
    const response = await GET(
      new NextRequest(
        `https://sselfie.ai/api/stripe/recover-payment/complete?token=${encodeURIComponent(token)}`
      )
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://sselfie.ai/app?billing=canceled")
    expect(updateSubscriptionMock).not.toHaveBeenCalled()
    expect(payInvoiceMock).not.toHaveBeenCalled()
  })

  it("is safe to replay because the callback never initiates a charge", async () => {
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const { GET } = await import("@/app/api/stripe/recover-payment/complete/route")
    const requestUrl = `https://sselfie.ai/api/stripe/recover-payment/complete?token=${encodeURIComponent(token)}`

    await GET(new NextRequest(requestUrl))
    await GET(new NextRequest(requestUrl))

    expect(payInvoiceMock).not.toHaveBeenCalled()
  })

  it("never retries an invoice that does not belong to the signed subscription", async () => {
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
    const { GET } = await import("@/app/api/stripe/recover-payment/complete/route")
    const response = await GET(
      new NextRequest(
        `https://sselfie.ai/api/stripe/recover-payment/complete?token=${encodeURIComponent(token)}`
      )
    )

    expect(response.status).toBe(400)
    expect(updateSubscriptionMock).not.toHaveBeenCalled()
    expect(payInvoiceMock).not.toHaveBeenCalled()
  })
})
