// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const neonFactoryMock = vi.fn(() => sqlMock)
const constructEventMock = vi.fn()
const checkWebhookRateLimitMock = vi.fn()
const addOrUpdateResendContactMock = vi.fn()
const sendEmailMock = vi.fn()

vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "uuid_test_123"),
}))

vi.mock("@/lib/db", () => ({
  neon: neonFactoryMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: checkWebhookRateLimitMock,
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: addOrUpdateResendContactMock,
  updateContactTags: vi.fn(),
  addContactToSegment: vi.fn(),
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
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

describe("stripe webhook academy purchase branch", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    delete process.env.RESEND_BETA_SEGMENT_ID

    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("SELECT id FROM webhook_events")) return []
      return []
    })

    checkWebhookRateLimitMock.mockResolvedValue({ success: true })
    addOrUpdateResendContactMock.mockResolvedValue({ success: true, contactId: "contact_1" })
    sendEmailMock.mockResolvedValue({ success: true })
    constructEventMock.mockReturnValue({
      id: "evt_academy_1",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_test_1",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 1700,
          currency: "eur",
          payment_intent: "pi_test_123",
          customer_details: {
            email: "academy-test@example.com",
            name: "Academy Test",
          },
          customer_email: "academy-test@example.com",
          metadata: {
            product_type: "academy_mini_product",
            product_id: "what_to_say",
            user_id: "user_123",
          },
        },
      },
    })
  })

  it("records academy purchase with payment fields and avoids schema-mutating CREATE TABLE calls", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any,
    )

    expect(response.status).toBe(200)

    const queries = sqlMock.mock.calls.map(([strings]) =>
      Array.isArray(strings) ? strings.join(" ") : String(strings),
    )

    expect(
      queries.some(
        (query) =>
          query.includes("INSERT INTO academy_course_purchases") &&
          query.includes("stripe_payment_intent_id") &&
          query.includes("amount_paid") &&
          query.includes("currency"),
      ),
    ).toBe(true)

    expect(
      queries.some((query) => query.includes("CREATE TABLE IF NOT EXISTS academy_course_purchases")),
    ).toBe(false)

    expect(
      queries.some(
        (query) => query.includes("INSERT INTO user_tags") && query.includes("WHERE NOT EXISTS"),
      ),
    ).toBe(true)

    expect(
      queries.some(
        (query) =>
          query.includes("INSERT INTO user_tags (user_id, tag)") && !query.includes("created_at"),
      ),
    ).toBe(true)
  })
})
