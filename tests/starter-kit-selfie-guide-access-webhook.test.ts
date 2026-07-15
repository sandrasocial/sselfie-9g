import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.hoisted(() => vi.fn())
const constructEventMock = vi.hoisted(() => vi.fn())
const retrievePaymentIntentMock = vi.hoisted(() => vi.fn())
const checkWebhookRateLimitMock = vi.hoisted(() => vi.fn())
const markEventProcessedMock = vi.hoisted(() => vi.fn())
const markEventFailedMock = vi.hoisted(() => vi.fn())
const handleStarterKitCheckoutMock = vi.hoisted(() => vi.fn())
const createAdminClientMock = vi.hoisted(() => vi.fn())
const getOrCreateNeonUserMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
  getDb: vi.fn(() => sqlMock),
  getDbClient: vi.fn(() => sqlMock),
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

vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: checkWebhookRateLimitMock,
}))

vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: vi.fn().mockResolvedValue({ duplicate: false, storage: "event-idempotency" }),
  markEventProcessed: markEventProcessedMock,
  markEventFailed: markEventFailedMock,
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: vi.fn().mockResolvedValue({ success: true, contactId: "contact_1" }),
  updateContactTags: vi.fn().mockResolvedValue({ success: true }),
  addContactToSegment: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/user-mapping", () => ({
  getOrCreateNeonUser: getOrCreateNeonUserMock,
}))

vi.mock("@/lib/payments/shared", () => ({
  generatePasswordSetupLinkForPurchase: vi.fn().mockResolvedValue("https://sselfie.ai/auth/setup-password"),
  markEmailLogConversionForCheckout: vi.fn().mockResolvedValue(undefined),
  markRevenueEnginePurchase: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/payments/handlers/starter-kit", () => ({
  handleStarterKitCheckout: handleStarterKitCheckoutMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "email_1" }),
}))

vi.mock("@/lib/credits", () => ({
  addCredits: vi.fn(),
  grantOneTimeSessionCredits: vi.fn(),
  grantMonthlyCredits: vi.fn(),
  grantPaidBlueprintCredits: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn(),
}))

vi.mock("@/lib/brand-engine/offer-checkout-config", () => ({
  isBrandEngineCheckoutProductType: vi.fn().mockReturnValue(false),
}))

describe("Starter Kit checkout from Selfie Guide access", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    delete process.env.RESEND_BETA_SEGMENT_ID

    checkWebhookRateLimitMock.mockResolvedValue({ success: true })
    markEventProcessedMock.mockResolvedValue(undefined)
    markEventFailedMock.mockResolvedValue(undefined)
    retrievePaymentIntentMock.mockResolvedValue({
      id: "pi_starter_kit_selfie_guide",
      amount: 3700,
      currency: "usd",
      customer: "cus_starter_kit_selfie_guide",
    })
    handleStarterKitCheckoutMock.mockResolvedValue(undefined)
    getOrCreateNeonUserMock.mockResolvedValue({ id: "neon_starter_kit_user" })
    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "auth_starter_kit_user" } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {
                action_link: "https://sselfie.ai/auth/confirm?token=starter&type=recovery",
              },
            },
            error: null,
          }),
        },
      },
    })
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      if (query.includes("SELECT id FROM users WHERE email")) return []
      return []
    })
    constructEventMock.mockReturnValue({
      id: "evt_starter_kit_selfie_guide",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_starter_kit_selfie_guide",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 3700,
          currency: "usd",
          payment_intent: "pi_starter_kit_selfie_guide",
          customer: "cus_starter_kit_selfie_guide",
          customer_details: {
            email: "starter-kit-buyer@example.com",
            name: "Starter Buyer",
          },
          customer_email: "starter-kit-buyer@example.com",
          metadata: {
            product_type: "starter_kit",
            product_id: "starter_kit",
            source: "selfie_guide_access",
            checkout_source: "selfie_guide_access_bridge",
            guide_cta: "starter_kit",
          },
        },
      },
    })
  })

  it("treats the guide access bridge as a public paid checkout source", () => {
    const webhook = readFileSync("lib/payments/lifecycle/checkout-session-completed.ts", "utf8")
    const allowlistStart = webhook.indexOf("const isPublicPaidCheckoutSource =")
    const allowlistEnd = webhook.indexOf("if (!customerEmail)", allowlistStart)
    const allowlist = webhook.slice(allowlistStart, allowlistEnd)

    expect(allowlist).toContain('source === "selfie_guide_access"')
  })

  it("creates a user and reaches Starter Kit fulfillment for guide-access guest buyers", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any
    )

    expect(response.status).toBe(200)
    expect(getOrCreateNeonUserMock).toHaveBeenCalledWith(
      "auth_starter_kit_user",
      "starter-kit-buyer@example.com",
      null
    )
    expect(handleStarterKitCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "starter-kit-buyer@example.com",
        userId: "neon_starter_kit_user",
        source: "selfie_guide_access",
        isPaymentPaid: true,
      })
    )
    expect(markEventProcessedMock).toHaveBeenCalledWith("stripe", "evt_starter_kit_selfie_guide")

    const reviewInsert = sqlMock.mock.calls.some(([strings]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      return query.includes("INSERT INTO webhook_events_needs_review")
    })
    expect(reviewInsert).toBe(false)
  })

  it("creates a user and reaches Starter Kit fulfillment for expired One Selfie fallback buyers", async () => {
    const event = constructEventMock()
    event.id = "evt_starter_kit_expired_fallback"
    event.data.object.id = "cs_starter_kit_expired_fallback"
    event.data.object.metadata.source = "one_selfie_expired_fallback"
    event.data.object.metadata.checkout_source = "one_selfie_expired_fallback"
    constructEventMock.mockClear()
    constructEventMock.mockReturnValue(event)

    const { POST } = await import("@/app/api/webhooks/stripe/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any
    )

    expect(response.status).toBe(200)
    expect(getOrCreateNeonUserMock).toHaveBeenCalledWith(
      "auth_starter_kit_user",
      "starter-kit-buyer@example.com",
      null
    )
    expect(handleStarterKitCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "starter-kit-buyer@example.com",
        userId: "neon_starter_kit_user",
        source: "one_selfie_expired_fallback",
        isPaymentPaid: true,
      })
    )

    const reviewInsert = sqlMock.mock.calls.some(([strings]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings)
      return query.includes("INSERT INTO webhook_events_needs_review")
    })
    expect(reviewInsert).toBe(false)
  })
})
