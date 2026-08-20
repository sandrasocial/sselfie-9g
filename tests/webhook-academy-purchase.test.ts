// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const constructEventMock = vi.fn()
const checkWebhookRateLimitMock = vi.fn()
const addOrUpdateResendContactMock = vi.fn()
const sendEmailMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "uuid_test_123"),
}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: vi.fn(() => "whsec_test"),
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

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn(),
  shouldEnforceLiveSubscriptionRows: vi.fn(() => false),
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
      if (query.includes("INSERT INTO webhook_events") && query.includes("RETURNING id")) {
        return [{ id: 1 }]
      }
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
      }) as any
    )

    expect(response.status).toBe(200)

    const queries = sqlMock.mock.calls.map(([strings]) =>
      Array.isArray(strings) ? strings.join(" ") : String(strings)
    )

    expect(
      queries.some(
        query =>
          query.includes("INSERT INTO academy_course_purchases") &&
          query.includes("stripe_payment_intent_id") &&
          query.includes("amount_paid") &&
          query.includes("currency")
      )
    ).toBe(true)

    expect(
      queries.some(query => query.includes("CREATE TABLE IF NOT EXISTS academy_course_purchases"))
    ).toBe(false)

    expect(
      queries.some(
        query => query.includes("INSERT INTO user_tags") && query.includes("WHERE NOT EXISTS")
      )
    ).toBe(true)

    expect(
      queries.some(
        query =>
          query.includes("INSERT INTO user_tags (user_id, tag)") && !query.includes("created_at")
      )
    ).toBe(true)
  })

  it("grants the suite and all three workbook entitlements for visibility_suite purchases", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_visibility_suite_1",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_suite_1",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 9700,
          currency: "eur",
          payment_intent: "pi_suite_123",
          customer_details: {
            email: "suite-test@example.com",
            name: "Suite Test",
          },
          customer_email: "suite-test@example.com",
          metadata: {
            product_type: "visibility_suite",
            product_id: "visibility_suite",
            user_id: "user_456",
            source: "visibility_suite_paid",
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

    const serializedCalls = sqlMock.mock.calls.map(call =>
      JSON.stringify({
        query: Array.isArray(call[0]) ? call[0].join(" ") : String(call[0]),
        values: call.slice(1),
      })
    )

    for (const productId of ["visibility_suite", "what_to_say", "show_up", "get_paid"]) {
      expect(serializedCalls.some(call => call.includes(productId))).toBe(true)
    }

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your Visibility To Paid Suite is ready",
        text: expect.stringContaining("Open your Visibility path"),
        tags: ["academy", "visibility_suite"],
      })
    )
  })

  it("returns 500 before delivery when an Academy entitlement upsert fails so Stripe can replay", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO webhook_events") && query.includes("RETURNING id")) {
        return [{ id: 1 }]
      }
      if (query.includes("INSERT INTO user_entitlements")) {
        throw new Error("entitlement write unavailable")
      }
      return []
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any
    )

    expect(response.status).toBe(500)
    expect(sendEmailMock).not.toHaveBeenCalled()

    expect(
      sqlMock.mock.calls.some(
        call =>
          queryTextForCall(call).includes("UPDATE webhook_events") &&
          JSON.stringify(call.slice(1)).includes("failed")
      )
    ).toBe(true)
  })

  it("reclaims a failed Academy event and delivers once after every entitlement succeeds", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_suite_replay_1",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_suite_replay_1",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 9700,
          currency: "eur",
          payment_intent: "pi_suite_replay_1",
          customer_details: { email: "suite-replay@example.com", name: "Suite Replay" },
          customer_email: "suite-replay@example.com",
          metadata: {
            product_type: "visibility_suite",
            product_id: "visibility_suite",
            user_id: "user_replay_1",
          },
        },
      },
    })

    const expectedGrantIds = [
      "visibility_suite",
      "what_to_say",
      "show_up",
      "get_paid",
      "concept_cards_pack",
      "caption_sprint",
      "feed_reset_9grid",
      "ai_photo_refresh",
    ]
    const successfulGrantIds = new Set<string>()
    let eventStatus: "missing" | "claimed" | "failed" | "processed" = "missing"
    let failFirstEntitlement = true

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(" ")

      if (
        query.includes("INSERT INTO webhook_events") &&
        query.includes("provider") &&
        query.includes("RETURNING id")
      ) {
        if (eventStatus === "missing") {
          eventStatus = "claimed"
          return [{ id: 1 }]
        }
        return []
      }

      if (
        query.includes("UPDATE webhook_events") &&
        query.includes("status = 'failed'") &&
        query.includes("RETURNING id")
      ) {
        if (eventStatus === "failed") {
          eventStatus = "claimed"
          return [{ id: 1 }]
        }
        return []
      }

      if (query.includes("UPDATE webhook_events")) {
        if (values.includes("failed")) eventStatus = "failed"
        if (values.includes("processed")) eventStatus = "processed"
        return []
      }

      if (query.includes("INSERT INTO user_entitlements")) {
        if (failFirstEntitlement) {
          failFirstEntitlement = false
          throw new Error("temporary entitlement write failure")
        }
        const productId = values[1]
        if (typeof productId === "string") successfulGrantIds.add(productId)
      }

      return []
    })
    sendEmailMock.mockImplementation(async () => {
      expect(Array.from(successfulGrantIds).sort()).toEqual(expectedGrantIds.slice().sort())
      return { success: true }
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const request = () =>
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any

    const firstResponse = await POST(request())
    expect(firstResponse.status).toBe(500)
    expect(eventStatus).toBe("failed")
    expect(sendEmailMock).not.toHaveBeenCalled()

    const replayResponse = await POST(request())
    expect(replayResponse.status).toBe(200)
    expect(eventStatus).toBe("processed")
    expect(Array.from(successfulGrantIds).sort()).toEqual(expectedGrantIds.slice().sort())
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})

function queryTextForCall(call: unknown[]): string {
  const strings = call[0]
  return Array.isArray(strings) ? strings.join(" ") : String(strings)
}
