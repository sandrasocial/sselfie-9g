// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  grantCredits: vi.fn(),
  sendEmail: vi.fn(),
  logAnalytics: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: { paymentIntents: { retrieve: mocks.retrievePaymentIntent } },
}))
vi.mock("@/lib/credits", () => ({
  grantPaidBlueprintCredits: mocks.grantCredits,
  shouldFulfillStripePurchaseCredits: (livemode: boolean) => livemode,
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/email/templates/paid-blueprint-delivery", () => ({
  PAID_BLUEPRINT_DELIVERY_SUBJECT: "Your paid blueprint",
  generatePaidBlueprintDeliveryEmail: vi.fn(() => ({ html: "<p>ready</p>", text: "ready" })),
}))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: mocks.logAnalytics }))

const context = {
  event: {
    id: "evt_paid_blueprint",
    type: "checkout.session.completed",
    livemode: true,
  },
  session: {
    id: "cs_paid_blueprint",
    mode: "payment",
    payment_status: "paid",
    amount_total: 9700,
    currency: "usd",
    payment_intent: "pi_paid_blueprint",
    customer: "cus_paid_blueprint",
    customer_details: { email: "buyer@example.com", name: "Buyer" },
    metadata: { product_type: "paid_blueprint", user_id: "user_1" },
  },
  isPaymentPaid: true,
  customerEmail: "buyer@example.com",
  userId: "user_1",
  referralPurchaseUserId: "user_1",
  source: "landing_page",
  credits: 60,
} as any

function defaultSql(strings: TemplateStringsArray) {
  const query = strings.join(" ")
  if (query.includes("SELECT id FROM subscriptions")) {
    return [{ id: 1 }]
  }
  if (query.includes("SELECT id, paid_blueprint_purchased")) {
    return [{ id: 2, paid_blueprint_purchased: true, user_id: "user_1" }]
  }
  if (query.includes("FROM feed_layouts")) {
    return []
  }
  if (query.includes("SELECT id FROM email_logs")) {
    return []
  }
  if (query.includes("paid_blueprint_photo_urls")) {
    return [{ name: "Buyer", access_token: "stable-token", paid_blueprint_photo_urls: [] }]
  }
  return []
}

describe("paid blueprint credit/access/delivery resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockImplementation(defaultSql)
    mocks.retrievePaymentIntent.mockResolvedValue({
      amount: 9700,
      customer: "cus_paid_blueprint",
    })
    mocks.grantCredits.mockResolvedValue({
      success: true,
      granted: true,
      newBalance: 60,
    })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email_1" })
    mocks.logAnalytics.mockResolvedValue(undefined)
  })

  it("sends keyed delivery only after the atomic grant succeeds", async () => {
    const { handlePaidBlueprintCheckout } = await import("@/lib/payments/handlers/paid-blueprint")

    await handlePaidBlueprintCheckout(context)

    expect(mocks.grantCredits).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "paid-blueprint-delivery:cs_paid_blueprint",
      })
    )
    expect(mocks.grantCredits.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendEmail.mock.invocationCallOrder[0]
    )

    const deliveryDedupe = mocks.sql.mock.calls.find(([strings]) =>
      strings.join(" ").includes("SELECT id FROM email_logs")
    )
    expect(deliveryDedupe?.[0].join(" ")).toContain("status IN ('sent', 'delivered')")
  })

  it("observes a guest purchase only after resolving its privacy-safe user identity", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("SELECT id FROM users WHERE email")) {
        return [{ id: "guest_user_2" }]
      }
      return defaultSql(strings)
    })
    const guestContext = {
      ...context,
      userId: null,
      referralPurchaseUserId: null,
      session: {
        ...context.session,
        metadata: { product_type: "paid_blueprint" },
      },
    }
    const { handlePaidBlueprintCheckout } = await import("@/lib/payments/handlers/paid-blueprint")

    await handlePaidBlueprintCheckout(guestContext)

    expect(mocks.logAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "purchase",
        userId: "guest_user_2",
      })
    )
    const lookupIndex = mocks.sql.mock.calls.findIndex(([strings]) =>
      strings.join(" ").includes("SELECT id FROM users WHERE email")
    )
    expect(lookupIndex).toBeGreaterThanOrEqual(0)
    expect(mocks.sql.mock.invocationCallOrder[lookupIndex]).toBeLessThan(
      mocks.logAnalytics.mock.invocationCallOrder[0]
    )
  })

  it("throws access persistence failures so Stripe can replay", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("SELECT id FROM subscriptions")) return []
      if (query.includes("INSERT INTO subscriptions")) throw new Error("subscription unavailable")
      return defaultSql(strings)
    })
    const { handlePaidBlueprintCheckout } = await import("@/lib/payments/handlers/paid-blueprint")

    await expect(handlePaidBlueprintCheckout(context)).rejects.toThrow("subscription unavailable")
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("does not count failed email logs as delivered and retries failed delivery", async () => {
    mocks.sendEmail.mockResolvedValue({ success: false, error: "provider unavailable" })
    const { handlePaidBlueprintCheckout } = await import("@/lib/payments/handlers/paid-blueprint")

    await expect(handlePaidBlueprintCheckout(context)).rejects.toThrow("provider unavailable")
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })
})
