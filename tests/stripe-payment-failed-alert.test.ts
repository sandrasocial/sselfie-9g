// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { hasSubscriptionAccess } from "@/lib/membership-access-policy"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const generatePaymentFailedEmailMock = vi.fn()
const logWebhookErrorMock = vi.fn()
const alertWebhookErrorMock = vi.fn()
const retrieveCustomerMock = vi.fn()
const retrieveInvoiceMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()

let localSubscriptionStatus: string | null
let hasPriorPaidSubscriptionInvoice: boolean

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/email/templates/payment-failed", () => ({
  generatePaymentFailedEmail: generatePaymentFailedEmailMock,
}))

vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: logWebhookErrorMock,
  alertWebhookError: alertWebhookErrorMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      retrieve: retrieveCustomerMock,
    },
    invoices: { retrieve: retrieveInvoiceMock },
    subscriptions: { retrieve: retrieveSubscriptionMock },
  },
}))

describe("invoice.payment_failed lifecycle", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.ADMIN_ACTION_SECRET = "test-secret-that-is-long-enough-for-hmac"
    localSubscriptionStatus = "active"
    hasPriorPaidSubscriptionInvoice = true

    sendEmailMock.mockResolvedValue({ success: true })
    generatePaymentFailedEmailMock.mockReturnValue({
      subject: "Payment issue",
      html: "<p>Payment issue</p>",
      text: "Payment issue",
    })
    retrieveCustomerMock.mockResolvedValue({
      id: "cus_payment_failed_1",
      deleted: false,
      email: "member@example.com",
      name: "Member Example",
    })
    retrieveInvoiceMock.mockResolvedValue({
      id: "in_payment_failed_1",
      status: "open",
      customer: "cus_payment_failed_1",
      subscription: "sub_payment_failed_1",
    })
    retrieveSubscriptionMock.mockResolvedValue({
      id: "sub_payment_failed_1",
      status: "past_due",
      latest_invoice: "in_payment_failed_1",
    })
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("SELECT id, status") && query.includes("FROM subscriptions")) {
        return localSubscriptionStatus
          ? [{ id: "local_subscription_1", status: localSubscriptionStatus }]
          : []
      }

      if (
        query.includes("FROM stripe_payments") &&
        query.includes("stripe_subscription_id") &&
        query.includes("status IN ('paid', 'succeeded')")
      ) {
        return hasPriorPaidSubscriptionInvoice ? [{ id: "paid_payment_1" }] : []
      }

      if (query.includes("SELECT user_id, product_type, stripe_customer_id")) {
        return [
          {
            user_id: "user_payment_failed_1",
            product_type: "sselfie_studio_membership",
            stripe_customer_id: "cus_payment_failed_1",
          },
        ]
      }

      if (query.includes("SELECT email, display_name FROM users")) {
        return [{ email: "member@example.com", display_name: "Member Example" }]
      }

      if (query.includes("SELECT id FROM email_logs")) {
        return []
      }

      return []
    })
  })

  it("handles failed subscription payment without creating a webhook-error alert", async () => {
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_1",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
          next_payment_attempt: 1781888833,
          created: 1781880000,
          attempt_count: 1,
        },
      },
    } as any)

    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("UPDATE subscriptions")
    )
    expect(updateCall).toBeTruthy()
    expect(updateCall?.[1]).toBe("past_due")
    expect(updateCall?.[2]).toBe("local_subscription_1")
    expect(updateCall?.[3]).toBe("sub_payment_failed_1")

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.com",
        emailType: "payment-failed",
        tags: ["billing", "payment-failed"],
      })
    )
    expect(generatePaymentFailedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        manageBillingUrl: expect.stringContaining("/api/stripe/recover-payment?token="),
      })
    )
    const failedPaymentCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("INSERT INTO stripe_payments")
    )
    expect(failedPaymentCall).toBeTruthy()
    expect(failedPaymentCall?.[1]).toBe("in_payment_failed_1")
    expect(failedPaymentCall?.some(value => String(value).includes("payment_recovery"))).toBe(true)
    expect(logWebhookErrorMock).not.toHaveBeenCalled()
    expect(alertWebhookErrorMock).not.toHaveBeenCalled()
  })

  it("does not downgrade or email after the exact invoice has already recovered", async () => {
    retrieveInvoiceMock.mockResolvedValueOnce({
      id: "in_payment_failed_1",
      status: "paid",
      customer: "cus_payment_failed_1",
      subscription: "sub_payment_failed_1",
    })
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: "in_payment_failed_1",
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_stale",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    expect(
      sqlMock.mock.calls.some(([strings]) => strings.join(" ").includes("UPDATE subscriptions"))
    ).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(
      sqlMock.mock.calls.some(([strings]) =>
        strings.join(" ").includes("INSERT INTO stripe_payments")
      )
    ).toBe(false)
  })

  it("ignores an older failed invoice when Stripe points at a newer latest invoice", async () => {
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: "in_newer_paid_2",
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_old_invoice",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    expect(
      sqlMock.mock.calls.some(([strings]) => strings.join(" ").includes("UPDATE subscriptions"))
    ).toBe(false)
    expect(
      sqlMock.mock.calls.some(([strings]) =>
        strings.join(" ").includes("INSERT INTO stripe_payments")
      )
    ).toBe(false)
    expect(
      sqlMock.mock.calls.some(([strings]) => strings.join(" ").includes("FROM stripe_payments"))
    ).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("fails closed when refreshed Stripe state has no exact latest invoice", async () => {
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: null,
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_missing_latest",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    expect(
      sqlMock.mock.calls.some(([strings]) => strings.join(" ").includes("UPDATE subscriptions"))
    ).toBe(false)
    expect(
      sqlMock.mock.calls.some(([strings]) =>
        strings.join(" ").includes("INSERT INTO stripe_payments")
      )
    ).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("ends unproven trial access when the first failed invoice races with active Stripe state", async () => {
    localSubscriptionStatus = "trialing"
    hasPriorPaidSubscriptionInvoice = false
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: "in_payment_failed_1",
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_initial",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("UPDATE subscriptions")
    )
    expect(updateCall?.[1]).toBe("incomplete")
    expect(updateCall?.[2]).toBe("local_subscription_1")
    expect(updateCall?.[3]).toBe("sub_payment_failed_1")
    expect(updateCall?.[0].join(" ")).not.toContain("current_period_start")
    expect(updateCall?.[0].join(" ")).not.toContain("current_period_end")
    expect(updateCall?.some(value => value === "active")).toBe(false)
  })

  it("does not promote an unproven past-due row from active Stripe state on an open invoice", async () => {
    localSubscriptionStatus = "past_due"
    hasPriorPaidSubscriptionInvoice = false
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: "in_payment_failed_1",
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_unproven",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("UPDATE subscriptions")
    )
    expect(updateCall?.[1]).toBe("incomplete")
    expect(updateCall?.some(value => value === "active")).toBe(false)
  })

  it("moves a prior-paid active renewal to old-period grace while its invoice remains open", async () => {
    localSubscriptionStatus = "active"
    hasPriorPaidSubscriptionInvoice = true
    retrieveSubscriptionMock.mockResolvedValueOnce({
      id: "sub_payment_failed_1",
      status: "active",
      latest_invoice: "in_payment_failed_1",
    })
    const { handleInvoicePaymentFailed } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleInvoicePaymentFailed({
      id: "evt_payment_failed_renewal",
      type: "invoice.payment_failed",
      livemode: true,
      data: {
        object: {
          id: "in_payment_failed_1",
          subscription: "sub_payment_failed_1",
          customer: "cus_payment_failed_1",
          amount_due: 4950,
        },
      },
    } as any)

    const paidEvidenceCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("status IN ('paid', 'succeeded')")
    )
    expect(paidEvidenceCall).toBeTruthy()
    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("UPDATE subscriptions")
    )
    expect(updateCall?.[1]).toBe("past_due")
    expect(updateCall?.[2]).toBe("local_subscription_1")
    expect(updateCall?.[3]).toBe("sub_payment_failed_1")
    expect(updateCall?.[0].join(" ")).not.toContain("current_period_end")
    expect(
      hasSubscriptionAccess({ status: "past_due", current_period_end: new Date(Date.now() - 1) })
    ).toBe(false)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})
