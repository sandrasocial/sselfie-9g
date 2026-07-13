// @vitest-environment node

import fs from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ROOT = process.cwd()
const sqlMock = vi.fn()
const constructEventMock = vi.fn()
const checkWebhookRateLimitMock = vi.fn()
const addCreditsMock = vi.fn()
const grantMonthlyCreditsMock = vi.fn()

vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "uuid_test_bonus"),
}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
  getDb: vi.fn(() => sqlMock),
}))

vi.mock("@/lib/stripe", () => ({
  getStripeWebhookSecret: vi.fn(() => process.env.STRIPE_WEBHOOK_SECRET || "whsec_test"),
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: "sub_bonus_1",
        customer: "cus_bonus_1",
        status: "active",
        current_period_start: 1710000000,
        current_period_end: 1712592000,
        metadata: {
          bonus_credits: "4",
          product_type: "sselfie_studio_membership",
        },
      })),
    },
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  checkWebhookRateLimit: checkWebhookRateLimitMock,
}))

vi.mock("@/lib/credits", () => ({
  addCredits: addCreditsMock,
  grantOneTimeSessionCredits: vi.fn(),
  grantMonthlyCredits: grantMonthlyCreditsMock,
  grantPaidBlueprintCredits: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("@/lib/user-mapping", () => ({
  getOrCreateNeonUser: vi.fn(),
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/email/templates/welcome-email", () => ({
  generateWelcomeEmail: vi.fn(),
}))

vi.mock("@/lib/email/templates/paid-blueprint-delivery", () => ({
  generatePaidBlueprintDeliveryEmail: vi.fn(),
  PAID_BLUEPRINT_DELIVERY_SUBJECT: "subject",
}))

vi.mock("@/lib/email/templates/selfie-guide-paid-delivery", () => ({
  generateSelfieGuidePaidDeliveryEmail: vi.fn(),
  SELFIE_GUIDE_PAID_DELIVERY_SUBJECT: "subject",
}))

vi.mock("@/lib/email/templates/payment-failed", () => ({
  generatePaymentFailedEmail: vi.fn(),
}))

vi.mock("@/lib/email/templates/brand-strategy-setup-notification", () => ({
  generateBrandStrategySetupNotificationEmail: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn(),
}))

vi.mock("@/lib/webhook-monitoring", () => ({
  logWebhookError: vi.fn(),
  alertWebhookError: vi.fn(),
  isCriticalError: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  addOrUpdateResendContact: vi.fn().mockResolvedValue({ success: true, contactId: "contact_bonus_1" }),
  updateContactTags: vi.fn(),
  addContactToSegment: vi.fn(),
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/brand-engine/offer-checkout-config", () => ({
  isBrandEngineCheckoutProductType: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/freebie/selfie-guide-access", () => ({
  ensurePaidSelfieGuideSubscriber: vi.fn(),
}))

vi.mock("@/lib/payments/handlers/presets", () => ({
  handlePresetsCheckout: vi.fn(),
}))

vi.mock("@/lib/payments/handlers/selfie-visibility-bundle", () => ({
  handleSelfieVisibilityBundleCheckout: vi.fn(),
}))

vi.mock("@/lib/academy-entitlements", () => ({
  upsertPurchaseEntitlement: vi.fn(),
}))

vi.mock("@/lib/email/recipient-name", () => ({
  getFirstNameForEmail: vi.fn().mockReturnValue("Sandra"),
}))

vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: vi.fn().mockResolvedValue({ status: "skipped" }),
  isReferralPurchaseEligible: vi.fn().mockReturnValue(false),
  isReferralSignupEligible: vi.fn().mockReturnValue(false),
  trackReferralSignup: vi.fn().mockResolvedValue({ status: "skipped" }),
}))

vi.mock("@/lib/referrals/routing", () => ({
  normalizeReferralCode: vi.fn().mockReturnValue(null),
}))

describe("selfie guide bonus credits smoke", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"

    checkWebhookRateLimitMock.mockResolvedValue({ success: true })
    grantMonthlyCreditsMock.mockResolvedValue({ success: true, newBalance: 200 })
    addCreditsMock.mockResolvedValue({ success: true, newBalance: 204 })

    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("INSERT INTO webhook_events") && query.includes("RETURNING id")) {
        return [{ id: 1 }]
      }
      if (query.includes("SELECT user_id, product_type, current_period_start") && query.includes("FROM subscriptions")) {
        return [
          {
            user_id: "user_bonus_1",
            product_type: "sselfie_studio_membership",
            current_period_start: new Date("2026-04-01T00:00:00.000Z"),
          },
        ]
      }
      if (query.includes("AND transaction_type = 'subscription_grant'") && query.includes("stripe_payment_id")) {
        return []
      }
      if (query.includes("FROM credit_transactions") && query.includes("transaction_type = 'bonus'")) {
        return []
      }
      if (query.includes("SELECT email, display_name FROM users WHERE id")) {
        return [{ email: "bonus-test@example.com", display_name: "Bonus Test" }]
      }
      if (query.includes("SELECT email FROM users WHERE id")) {
        return [{ email: "bonus-test@example.com" }]
      }
      if (query.includes("SELECT") && query.includes("FROM freebie_subscribers")) {
        return []
      }

      return []
    })

    constructEventMock.mockReturnValue({
      id: "evt_invoice_bonus_1",
      type: "invoice.payment_succeeded",
      livemode: true,
      data: {
        object: {
          id: "in_bonus_1",
          object: "invoice",
          subscription: "sub_bonus_1",
          customer: "cus_bonus_1",
          status: "paid",
          amount_paid: 9700,
          currency: "eur",
          created: 1710000000,
          description: "Studio membership",
          metadata: {},
          status_transitions: { paid_at: 1710000100 },
          billing_reason: "subscription_create",
          period_start: 1710000000,
          period_end: 1712592000,
        },
      },
    })
  })

  it("wires checkout bonus param through metadata fields", () => {
    const membershipPage = fs.readFileSync(path.join(ROOT, "app/checkout/membership/page.tsx"), "utf8")
    const membershipClient = fs.readFileSync(
      path.join(ROOT, "app/checkout/membership/membership-checkout-client.tsx"),
      "utf8",
    )
    const landingCheckout = fs.readFileSync(path.join(ROOT, "app/actions/landing-checkout.ts"), "utf8")

    expect(membershipPage).toContain('params.bonus === "4credits" ? 4 : undefined')
    expect(membershipClient).toContain('if (bonus) params.set("bonus", bonus)')
    expect(landingCheckout).toContain("bonus_credits")
  })

  it("grants one-time bonus credits on first paid membership invoice", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(grantMonthlyCreditsMock).toHaveBeenCalledWith("user_bonus_1", "sselfie_studio_membership", false)
    expect(addCreditsMock).toHaveBeenCalledWith(
      "user_bonus_1",
      4,
      "bonus",
      "Selfie Guide membership bonus (4 credits)",
      "in_bonus_1",
      false,
      { source: "stripe_webhook:selfie_guide_bonus" },
    )
  })

  it("does not grant duplicate bonus credits for the same invoice", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("INSERT INTO webhook_events") && query.includes("RETURNING id")) {
        return [{ id: 1 }]
      }
      if (query.includes("SELECT user_id, product_type, current_period_start") && query.includes("FROM subscriptions")) {
        return [
          {
            user_id: "user_bonus_1",
            product_type: "sselfie_studio_membership",
            current_period_start: new Date("2026-04-01T00:00:00.000Z"),
          },
        ]
      }
      if (query.includes("AND transaction_type = 'subscription_grant'") && query.includes("stripe_payment_id")) {
        return []
      }
      // Simulate idempotency hit: bonus already granted for this invoice.
      if (query.includes("FROM credit_transactions") && query.includes("transaction_type = 'bonus'")) {
        return [{ id: 123 }]
      }
      if (query.includes("SELECT email, display_name FROM users WHERE id")) {
        return [{ email: "bonus-test@example.com", display_name: "Bonus Test" }]
      }
      if (query.includes("SELECT email FROM users WHERE id")) {
        return [{ email: "bonus-test@example.com" }]
      }

      return []
    })

    const { POST } = await import("@/app/api/webhooks/stripe/route")
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(grantMonthlyCreditsMock).toHaveBeenCalledTimes(1)
    expect(addCreditsMock).not.toHaveBeenCalled()
  })
})
