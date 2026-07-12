// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const constructEventMock = vi.fn()
const retrievePaymentIntentMock = vi.fn()
const checkWebhookRateLimitMock = vi.fn()
const markEventFailedMock = vi.fn()
const markEventProcessedMock = vi.fn()
const handlePromptVaultCheckoutMock = vi.fn()
const handlePresetsCheckoutMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: vi.fn(() => "whsec_test"),
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    paymentIntents: {
      retrieve: retrievePaymentIntentMock,
    },
  },
}))

vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: vi.fn().mockResolvedValue({ duplicate: false, storage: "event-idempotency" }),
  markEventFailed: markEventFailedMock,
  markEventProcessed: markEventProcessedMock,
}))

vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: checkWebhookRateLimitMock,
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: vi.fn().mockResolvedValue({ success: true, contactId: "contact_1" }),
  updateContactTags: vi.fn(),
  addContactToSegment: vi.fn(),
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/payments/handlers/prompt-vault", () => ({
  handlePromptVaultCheckout: handlePromptVaultCheckoutMock,
}))

vi.mock("@/lib/payments/handlers/presets", () => ({
  handlePresetsCheckout: handlePresetsCheckoutMock,
}))

vi.mock("@/lib/credits", () => ({
  addCredits: vi.fn(),
  grantOneTimeSessionCredits: vi.fn(),
  grantMonthlyCredits: vi.fn(),
  grantPaidBlueprintCredits: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("@/lib/user-mapping", () => ({
  getOrCreateNeonUser: vi.fn(),
}))

vi.mock("@/lib/email/templates/welcome-email", () => ({
  generateWelcomeEmail: vi.fn(),
}))

vi.mock("@/lib/email/templates/paid-blueprint-delivery", () => ({
  generatePaidBlueprintDeliveryEmail: vi.fn(),
  PAID_BLUEPRINT_DELIVERY_SUBJECT: "subject",
}))

vi.mock("@/lib/email/templates/payment-failed", () => ({
  generatePaymentFailedEmail: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn(),
}))

vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/north-notifier", () => ({
  notifyNorth: vi.fn(),
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn(),
}))

vi.mock("@/lib/brand-engine/offer-checkout-config", () => ({
  isBrandEngineCheckoutProductType: vi.fn().mockReturnValue(false),
}))

describe("stripe checkout payment recording", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    checkWebhookRateLimitMock.mockResolvedValue({ success: true })
    markEventProcessedMock.mockResolvedValue(undefined)
    markEventFailedMock.mockResolvedValue(undefined)
    handlePromptVaultCheckoutMock.mockResolvedValue(undefined)
    handlePresetsCheckoutMock.mockResolvedValue(undefined)
    retrievePaymentIntentMock.mockResolvedValue({
      id: "pi_guest_prompt_vault_123",
      amount: 2700,
      currency: "usd",
      customer: "cus_guest_prompt_vault_123",
    })

    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("SELECT id FROM users WHERE email")) {
        return []
      }
      return []
    })

    constructEventMock.mockReturnValue({
      id: "evt_guest_prompt_vault_1",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_guest_prompt_vault_1",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 2700,
          currency: "usd",
          payment_intent: "pi_guest_prompt_vault_123",
          customer: "cus_guest_prompt_vault_123",
          customer_details: {
            email: "guest-vault@example.com",
            name: "Guest Vault",
          },
          customer_email: "guest-vault@example.com",
          metadata: {
            product_type: "prompt_vault",
            source: "unexpected_source",
          },
        },
      },
    })
  })

  it("records guest paid checkout revenue and fulfills Prompt Vault access even when no user can be resolved", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any
    )

    expect(response.status).toBe(200)
    expect(markEventFailedMock).not.toHaveBeenCalled()
    expect(markEventProcessedMock).toHaveBeenCalledWith("stripe", "evt_guest_prompt_vault_1")
    expect(handlePromptVaultCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "guest-vault@example.com",
        userId: null,
        source: "unexpected_source",
        isPaymentPaid: true,
      })
    )

    const stripePaymentInsert = sqlMock.mock.calls.find(([strings, ...values]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      return (
        query.includes("INSERT INTO stripe_payments") &&
        values.includes("pi_guest_prompt_vault_123") &&
        values.includes("cus_guest_prompt_vault_123") &&
        values.includes(null) &&
        values.includes(2700) &&
        values.includes("prompt_vault")
      )
    })

    expect(stripePaymentInsert).toBeTruthy()

    const reviewInsert = sqlMock.mock.calls.some(([strings]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      return query.includes("INSERT INTO webhook_events_needs_review")
    })

    expect(reviewInsert).toBe(false)
  })

  it.each([
    {
      productType: "presets_single",
      amount: 1900,
      eventId: "evt_guest_presets_single_1",
      sessionId: "cs_guest_presets_single_1",
      paymentIntentId: "pi_guest_presets_single_1",
    },
    {
      productType: "presets_bundle",
      amount: 3900,
      eventId: "evt_guest_presets_bundle_1",
      sessionId: "cs_guest_presets_bundle_1",
      paymentIntentId: "pi_guest_presets_bundle_1",
    },
  ])(
    "records and fulfills $productType by email token when no user can be resolved",
    async ({ productType, amount, eventId, sessionId, paymentIntentId }) => {
      retrievePaymentIntentMock.mockResolvedValue({
        id: paymentIntentId,
        amount,
        currency: "usd",
        customer: `cus_${productType}`,
      })
      constructEventMock.mockReturnValue({
        id: eventId,
        type: "checkout.session.completed",
        livemode: true,
        data: {
          object: {
            id: sessionId,
            object: "checkout.session",
            mode: "payment",
            payment_status: "paid",
            amount_total: amount,
            currency: "usd",
            payment_intent: paymentIntentId,
            customer: `cus_${productType}`,
            customer_details: {
              email: "guest-presets@example.com",
              name: "Guest Presets",
            },
            customer_email: "guest-presets@example.com",
            metadata: {
              product_type: productType,
              source: "presets_landing",
            },
          },
        },
      })

      const { POST } = await import("@/app/api/webhooks/stripe/route")
      const response = await POST(
        new Request("http://localhost/api/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": "sig_test" },
          body: "{}",
        }) as any
      )

      expect(response.status).toBe(200)
      expect(markEventFailedMock).not.toHaveBeenCalled()
      expect(handlePresetsCheckoutMock).toHaveBeenCalledTimes(1)
      expect(handlePresetsCheckoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: "guest-presets@example.com",
          userId: null,
          source: "presets_landing",
          isPaymentPaid: true,
        })
      )
      expect(markEventProcessedMock).toHaveBeenCalledWith("stripe", eventId)

      const reviewInsert = sqlMock.mock.calls.some(([strings]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
        return query.includes("INSERT INTO webhook_events_needs_review")
      })
      expect(reviewInsert).toBe(false)
    }
  )
})
