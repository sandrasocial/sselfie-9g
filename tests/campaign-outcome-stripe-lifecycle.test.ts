// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.hoisted(() => vi.fn())
const constructEventMock = vi.hoisted(() => vi.fn())
const campaignHandlerMock = vi.hoisted(() => vi.fn())
const addOrUpdateResendContactMock = vi.hoisted(() => vi.fn())
const updateContactTagsMock = vi.hoisted(() => vi.fn())
const persistCheckoutAttributionContactMock = vi.hoisted(() => vi.fn())
const completeReferralForPurchaseMock = vi.hoisted(() => vi.fn())
const markEventFailedMock = vi.hoisted(() => vi.fn())
const markEventProcessedMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: vi.fn(() => "whsec_test"),
  stripe: {
    webhooks: { constructEvent: constructEventMock },
    paymentIntents: { retrieve: vi.fn() },
  },
}))
vi.mock("@/lib/events/idempotency", () => ({
  claimEvent: vi.fn().mockResolvedValue({ duplicate: false, storage: "event-idempotency" }),
  markEventFailed: markEventFailedMock,
  markEventProcessed: markEventProcessedMock,
}))
vi.mock("@/lib/rate-limit", () => ({ checkWebhookRateLimit: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn().mockReturnValue(false),
}))
vi.mock("@/lib/payments/handlers/campaign-outcome", () => ({ handleCampaignOutcomeCheckout: campaignHandlerMock }))
vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: addOrUpdateResendContactMock,
  updateContactTags: updateContactTagsMock,
  addContactToSegment: vi.fn(),
}))
vi.mock("@/lib/revenue-engine/checkout-attribution", () => ({
  ensureRevenueEngineSchema: vi.fn(),
  persistCheckoutAttributionContact: persistCheckoutAttributionContactMock,
}))
vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: completeReferralForPurchaseMock,
  isReferralPurchaseEligible: vi.fn(() => true),
  isReferralSignupEligible: vi.fn(() => true),
  trackReferralSignup: vi.fn(),
}))
vi.mock("@/lib/credits", () => ({
  addCredits: vi.fn(),
  grantOneTimeSessionCredits: vi.fn(),
  grantMonthlyCredits: vi.fn(),
  grantPaidBlueprintCredits: vi.fn(),
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/user-mapping", () => ({ getOrCreateNeonUser: vi.fn() }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }))
vi.mock("@/lib/email/templates/welcome-email", () => ({ generateWelcomeEmail: vi.fn() }))
vi.mock("@/lib/email/templates/paid-blueprint-delivery", () => ({
  generatePaidBlueprintDeliveryEmail: vi.fn(),
  PAID_BLUEPRINT_DELIVERY_SUBJECT: "subject",
}))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: vi.fn() }))
vi.mock("@/lib/subscription", () => ({ hasStudioMembership: vi.fn() }))
vi.mock("@/lib/brand-engine/offer-checkout-config", () => ({ isBrandEngineCheckoutProductType: vi.fn(() => false) }))

function campaignEvent(input: {
  id: string
  type: "checkout.session.completed" | "checkout.session.async_payment_succeeded"
  paid: boolean
  livemode?: boolean
}) {
  return {
    id: input.id,
    type: input.type,
    livemode: input.livemode ?? true,
    data: {
      object: {
        id: "cs_campaign_delayed",
        object: "checkout.session",
        mode: "payment",
        payment_status: input.paid ? "paid" : "unpaid",
        amount_total: 9700,
        currency: "usd",
        payment_intent: "pi_campaign_delayed",
        customer: "cus_campaign_delayed",
        customer_details: { email: "buyer@example.com", name: "Buyer" },
        customer_email: "buyer@example.com",
        metadata: { product_type: "campaign_outcome", source: "campaign_outcome_paid" },
      },
    },
  }
}

async function postWebhook() {
  const { POST } = await import("@/app/api/webhooks/stripe/route")
  return POST(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  }) as any)
}

describe("campaign outcome Stripe lifecycle", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    markEventFailedMock.mockResolvedValue(undefined)
    markEventProcessedMock.mockResolvedValue(undefined)
    campaignHandlerMock.mockResolvedValue(undefined)
    addOrUpdateResendContactMock.mockResolvedValue({ success: true })
    updateContactTagsMock.mockResolvedValue({ success: true })
    persistCheckoutAttributionContactMock.mockResolvedValue(undefined)
    sqlMock.mockResolvedValue([])
  })

  it("waits on an unpaid completion and fulfills when Stripe later confirms the delayed payment", async () => {
    constructEventMock.mockReturnValueOnce(campaignEvent({
      id: "evt_campaign_unpaid",
      type: "checkout.session.completed",
      paid: false,
    }))
    const pending = await postWebhook()
    expect(pending.status).toBe(200)
    expect(campaignHandlerMock).toHaveBeenLastCalledWith(expect.objectContaining({ isPaymentPaid: false }))

    constructEventMock.mockReturnValueOnce(campaignEvent({
      id: "evt_campaign_async_paid",
      type: "checkout.session.async_payment_succeeded",
      paid: true,
    }))
    const paid = await postWebhook()
    expect(paid.status).toBe(200)
    expect(campaignHandlerMock).toHaveBeenLastCalledWith(expect.objectContaining({
      isPaymentPaid: true,
      customerEmail: "buyer@example.com",
      userId: null,
    }))
    expect(campaignHandlerMock).toHaveBeenCalledTimes(2)
  })

  it("returns 500 and never fulfills when stripe_payments cannot record the $97 sale", async () => {
    constructEventMock.mockReturnValue(campaignEvent({
      id: "evt_campaign_revenue_failure",
      type: "checkout.session.completed",
      paid: true,
    }))
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO stripe_payments")) throw new Error("database unavailable")
      return []
    })

    const response = await postWebhook()
    expect(response.status).toBe(500)
    expect(campaignHandlerMock).not.toHaveBeenCalled()
    expect(markEventFailedMock).toHaveBeenCalledWith("stripe", "evt_campaign_revenue_failure", expect.any(Error))
    expect(sqlMock.mock.calls.some(([strings]) => strings.join(" ").includes("INSERT INTO webhook_events_needs_review"))).toBe(true)
  })

  it("keeps a paid test checkout out of live marketing, account, and referral state", async () => {
    constructEventMock.mockReturnValue(campaignEvent({
      id: "evt_test_campaign_paid",
      type: "checkout.session.completed",
      paid: true,
      livemode: false,
    }))

    const response = await postWebhook()
    expect(response.status).toBe(200)
    expect(campaignHandlerMock).toHaveBeenCalledWith(expect.objectContaining({
      isPaymentPaid: true,
      userId: null,
      referralPurchaseUserId: null,
    }))
    expect(persistCheckoutAttributionContactMock).not.toHaveBeenCalled()
    expect(addOrUpdateResendContactMock).not.toHaveBeenCalled()
    expect(updateContactTagsMock).not.toHaveBeenCalled()
    expect(completeReferralForPurchaseMock).not.toHaveBeenCalled()

    const allQueries = sqlMock.mock.calls.map(([strings]) => strings.join(" ")).join("\n")
    expect(allQueries).not.toContain("UPDATE freebie_subscribers")
    expect(allQueries).not.toContain("UPDATE blueprint_subscribers")
    expect(allQueries).not.toContain("UPDATE users")
  })
})
