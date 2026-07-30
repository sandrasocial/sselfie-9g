// @vitest-environment node
// Regression coverage for the 2026-07-02 founding-annual incident: the first invoice of a
// brand-new subscription arrives BEFORE checkout.session.completed creates the user +
// subscription rows. The handler must fail (so Stripe retries) instead of silently skipping,
// or the payment never lands in stripe_payments.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const sqlMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()
const retrieveCustomerMock = vi.fn()
const grantMonthlyCreditsMock = vi.fn()

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: retrieveSubscriptionMock },
    customers: { retrieve: retrieveCustomerMock },
  },
}))

vi.mock("@/lib/credits", () => ({
  addCredits: vi.fn(),
  grantMonthlyCredits: grantMonthlyCreditsMock,
  SUBSCRIPTION_CREDITS: { sselfie_studio_membership: 100, vault_maya: 30 },
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/referrals/service", () => ({
  completeReferralForPurchase: vi.fn(),
  isReferralPurchaseEligible: vi.fn(() => false),
}))

vi.mock("@/lib/payments/shared", () => ({
  markRevenueEnginePurchase: vi.fn(),
}))

vi.mock("@/lib/launch/cash-launch-pricing", () => ({
  getSubscriptionPlanFromMetadata: vi.fn(() => "founding_annual"),
}))

function buildInvoiceEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type: "invoice.payment_succeeded",
    livemode: true,
    data: {
      object: {
        id: "in_test_1",
        created: Math.floor(Date.now() / 1000) - 30,
        billing_reason: "subscription_create",
        customer: "cus_test_1",
        amount_paid: 69700,
        currency: "eur",
        status: "paid",
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) - 20 },
        metadata: {},
        parent: { subscription_details: { subscription: "sub_test_1" } },
        ...overrides,
      },
    },
  } as any
}

describe("handleInvoicePaid first-payment race", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    grantMonthlyCreditsMock.mockReset()
    grantMonthlyCreditsMock.mockResolvedValue({ success: true, newBalance: 100 })
    // No subscriptions row and no users row exist yet (checkout fulfillment hasn't run).
    sqlMock.mockResolvedValue([])
    retrieveSubscriptionMock.mockResolvedValue({
      id: "sub_test_1",
      status: "active",
      customer: "cus_test_1",
      metadata: { product_type: "sselfie_studio_membership_annual" },
      items: { data: [{ current_period_start: 1, current_period_end: 2 }] },
    })
    retrieveCustomerMock.mockResolvedValue({
      id: "cus_test_1",
      deleted: false,
      email: "new-buyer@example.com",
    })
  })

  it("throws on a fresh subscription_create invoice with no matching rows so Stripe retries", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(handleInvoicePaid(buildInvoiceEvent())).rejects.toThrow(
      /failing so Stripe retries/
    )
  })

  it("still skips quietly for renewal invoices with no matching rows", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(
      handleInvoicePaid(buildInvoiceEvent({ billing_reason: "subscription_cycle" }))
    ).resolves.toBeUndefined()
  })

  it("still skips quietly for stale subscription_create invoices (older than 48h)", async () => {
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    const staleCreated = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60
    await expect(
      handleInvoicePaid(buildInvoiceEvent({ created: staleCreated }))
    ).resolves.toBeUndefined()
  })

  it("does not throw when the subscription row already exists", async () => {
    // First query (subscriptions lookup) finds the row; later queries return empty.
    sqlMock.mockResolvedValueOnce([
      { user_id: "user-1", product_type: "sselfie_studio_membership", current_period_start: null },
    ])
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await expect(handleInvoicePaid(buildInvoiceEvent())).resolves.toBeUndefined()
  })

  it("fails the webhook so Stripe retries when a paid monthly credit reset fails", async () => {
    sqlMock.mockResolvedValueOnce([
      { user_id: "user-1", product_type: "vault_maya", current_period_start: null },
    ])
    grantMonthlyCreditsMock.mockResolvedValue({
      success: false,
      newBalance: 0,
      error: "temporary credit database failure",
    })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")

    await expect(handleInvoicePaid(buildInvoiceEvent({ amount_paid: 1900 }))).rejects.toThrow(
      "temporary credit database failure"
    )
  })

  it("keys the stripe_payments row on the invoice id even when legacy charge/payment_intent fields are present", async () => {
    // Pre-Clover payloads carried invoice.charge / invoice.payment_intent, and the old
    // `chargeId || paymentIntentId || invoice.id` fallback keyed the row on ch_/pi_ ids.
    // The webhook + backfills then recorded the same renewal under different ids (84
    // duplicate rows cleaned 2026-07-06). One invoice = one row keyed in_....
    sqlMock.mockResolvedValueOnce([
      { user_id: "user-1", product_type: "sselfie_studio_membership", current_period_start: null },
    ])
    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await handleInvoicePaid(
      buildInvoiceEvent({ charge: "ch_legacy_1", payment_intent: "pi_legacy_1" })
    )

    const insertCall = sqlMock.mock.calls.find(call =>
      String(call[0]?.join?.("?")).includes("INSERT INTO stripe_payments")
    )
    expect(insertCall).toBeDefined()
    const values = insertCall!.slice(1)
    expect(values).toContain("in_test_1")
    expect(values).not.toContain("ch_legacy_1")
    expect(values).not.toContain("pi_legacy_1")
  })

  it("carries the original checkout attribution onto renewal revenue rows", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM subscriptions") && query.includes("stripe_subscription_id")) {
        return [
          {
            user_id: "user-1",
            product_type: "sselfie_studio_membership",
            current_period_start: null,
          },
        ]
      }
      if (query.includes("FROM checkout_attribution") && query.includes("stripe_subscription_id")) {
        return [
          {
            session_id: "cs_vault_suite_1",
            user_email: "vault-buyer@example.com",
            source: "prompt_vault_post_purchase_upsell",
            utm_source: "prompt_vault",
            utm_medium: "post_purchase",
            utm_campaign: "vault_to_suite",
            utm_content: "vault_buyer_offer",
            checkout_source: "prompt_vault_post_purchase_offer",
            cta_keyword: null,
            prompt_number: null,
            entry_post_slug: null,
            buyer_stage: "micro",
          },
        ]
      }
      return []
    })

    const { handleInvoicePaid } = await import("@/lib/payments/lifecycle/invoice-paid")
    await handleInvoicePaid(
      buildInvoiceEvent({
        id: "in_vault_renewal_1",
        billing_reason: "subscription_cycle",
        amount_paid: 9700,
      })
    )

    const insertCall = sqlMock.mock.calls.find(call =>
      String(call[0]?.join?.("?")).includes("INSERT INTO stripe_payments")
    )
    expect(insertCall).toBeDefined()
    const values = insertCall!.slice(1)
    expect(values).toContain("cs_vault_suite_1")
    expect(values).toContain("vault-buyer@example.com")
    expect(values).toContain("prompt_vault_post_purchase_upsell")
    expect(values).toContain("vault_to_suite")
    expect(values).toContain("prompt_vault_post_purchase_offer")
    expect(values).toContain("micro")
  })

  it("passes the paid invoice id into the atomic monthly credit reset", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/payments/lifecycle/invoice-paid.ts"),
      "utf8"
    )
    expect(source).toContain("false, // Always false for production payments")
    expect(source).toContain("invoiceId\n          )")
    expect(source).not.toContain("WITH recent_credit_grant AS")
  })
})
