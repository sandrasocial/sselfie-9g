// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const generatePaymentFailedEmailMock = vi.fn()
const logWebhookErrorMock = vi.fn()
const alertWebhookErrorMock = vi.fn()
const retrieveCustomerMock = vi.fn()

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
  },
}))

describe("invoice.payment_failed lifecycle", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

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
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("SELECT user_id FROM subscriptions")) {
        return [{ user_id: "user_payment_failed_1" }]
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
    const { handleInvoicePaymentFailed } = await import(
      "@/lib/payments/lifecycle/subscription-events"
    )

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
        },
      },
    } as any)

    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("UPDATE subscriptions")
    )
    expect(updateCall).toBeTruthy()
    expect(updateCall?.[1]).toBe("sub_payment_failed_1")

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.com",
        emailType: "payment-failed",
        tags: ["billing", "payment-failed"],
      })
    )
    expect(logWebhookErrorMock).not.toHaveBeenCalled()
    expect(alertWebhookErrorMock).not.toHaveBeenCalled()
  })
})
