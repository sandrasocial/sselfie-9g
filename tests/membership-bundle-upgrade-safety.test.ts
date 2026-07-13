// @vitest-environment node
import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  retrieveCustomer: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mocks.retrieveSubscription,
      update: mocks.updateSubscription,
    },
    customers: { retrieve: mocks.retrieveCustomer },
    checkout: { sessions: { update: vi.fn() } },
  },
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/user-mapping", () => ({ getOrCreateNeonUser: vi.fn() }))

function queryText(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray
  return Array.from(strings).join(" ").replace(/\s+/g, " ").trim()
}

function subscriptionMutationQueries(): string[] {
  return mocks.sql.mock.calls
    .map(queryText)
    .filter(text => /(?:INSERT INTO|UPDATE) subscriptions/i.test(text))
}

function stripeSubscription() {
  return {
    id: "sub_annual_bundle_buyer",
    customer: "cus_bundle_buyer",
    status: "active",
    current_period_start: 1_752_422_400,
    current_period_end: 1_783_958_400,
    metadata: {
      user_id: "neon_bundle_buyer",
      product_id: "sselfie_studio_membership_annual",
      product_type: "sselfie_studio_membership",
      credits: "250",
    },
    discounts: [],
  }
}

function checkoutContext() {
  return {
    event: { livemode: false },
    session: {
      id: "cs_annual_bundle_buyer",
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      subscription: "sub_annual_bundle_buyer",
      customer: "cus_bundle_buyer",
      customer_email: "buyer@example.com",
      customer_details: { email: "buyer@example.com", name: "Buyer" },
      metadata: {
        user_id: "neon_bundle_buyer",
        product_id: "sselfie_studio_membership_annual",
        product_type: "sselfie_studio_membership",
        credits: "250",
        source: "one_selfie_bundle_upsell",
      },
    },
    isPaymentPaid: true,
    maybeTrackCheckoutReferralSignup: vi.fn(),
  }
}

describe("bundle buyer annual membership safety", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.retrieveSubscription.mockReset()
    mocks.updateSubscription.mockReset()
    mocks.retrieveCustomer.mockReset()
    mocks.sendEmail.mockReset()
    mocks.sql.mockImplementation(async (...call: unknown[]) => {
      const text = queryText(call)
      return text.includes("pg_advisory_xact_lock") ? [{ id: 901 }] : []
    })
    mocks.retrieveSubscription.mockResolvedValue(stripeSubscription())
    mocks.updateSubscription.mockResolvedValue(stripeSubscription())
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email_1" })
  })

  it("uses one exact Stripe-subscription upsert and never rewrites every row for a user", () => {
    const checkoutHandler = readFileSync(
      "lib/payments/handlers/studio-membership.ts",
      "utf8",
    )
    const lifecycle = readFileSync(
      "lib/payments/lifecycle/subscription-events.ts",
      "utf8",
    )
    const upsert = readFileSync(
      "lib/payments/lifecycle/upsert-studio-membership.ts",
      "utf8",
    )

    expect(checkoutHandler).not.toMatch(
      /UPDATE subscriptions SET[\s\S]{0,700}WHERE user_id =/,
    )
    expect(lifecycle).not.toMatch(/UPDATE subscriptions SET[\s\S]{0,700}WHERE user_id =/)
    expect(upsert).toContain("pg_advisory_xact_lock")
    expect(upsert).toContain("WHERE s.stripe_subscription_id")
    expect(upsert).toContain("WHERE NOT EXISTS (SELECT 1 FROM updated_membership)")
    expect(upsert).toContain("product_type")
    expect(upsert).toContain("'sselfie_studio_membership'")
    expect(upsert).not.toContain("WHERE user_id")
    expect(upsert).not.toContain("ON CONFLICT (stripe_subscription_id)")
  })

  it("is safe when subscription.created and checkout.completed arrive in either order or replay", async () => {
    const { handleSubscriptionCreated } = await import(
      "@/lib/payments/lifecycle/subscription-events"
    )
    const { handleStudioMembershipSubscriptionCheckout } = await import(
      "@/lib/payments/handlers/studio-membership"
    )
    const subscription = stripeSubscription()

    await handleSubscriptionCreated({
      livemode: false,
      data: { object: subscription },
    } as any)
    await handleStudioMembershipSubscriptionCheckout(checkoutContext() as any)
    await handleStudioMembershipSubscriptionCheckout(checkoutContext() as any)
    await handleSubscriptionCreated({
      livemode: false,
      data: { object: subscription },
    } as any)

    const mutations = subscriptionMutationQueries()
    const mutationCalls = mocks.sql.mock.calls.filter(call =>
      /(?:INSERT INTO|UPDATE) subscriptions/i.test(queryText(call)),
    )
    expect(mutations).toHaveLength(4)
    for (const mutation of mutations) {
      expect(mutation).toContain("pg_advisory_xact_lock")
      expect(mutation).toContain("WHERE s.stripe_subscription_id")
      expect(mutation).toContain("WHERE NOT EXISTS (SELECT 1 FROM updated_membership)")
      expect(mutation).toContain("'sselfie_studio_membership'")
      expect(mutation).not.toContain("WHERE user_id")
      expect(mutation).not.toContain("ON CONFLICT (stripe_subscription_id)")
    }
    for (const call of mutationCalls) {
      expect(JSON.stringify(call.slice(1))).toContain("annual")
    }
  })
})
