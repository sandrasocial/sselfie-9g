// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.hoisted(() => vi.fn())
const sendEmailMock = vi.hoisted(() => vi.fn())
const upsertEntitlementMock = vi.hoisted(() => vi.fn())
const upsertStarterKitSubscriberMock = vi.hoisted(() => vi.fn())
const upsertPromptVaultSubscriberMock = vi.hoisted(() => vi.fn())
const upsertPresetOrderMock = vi.hoisted(() => vi.fn())
const updateContactTagsMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))

vi.mock("@/lib/credits-cached", () => ({ invalidateCreditCache: vi.fn() }))

vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }))

vi.mock("@/lib/academy-entitlements", () => ({
  upsertPurchaseEntitlement: upsertEntitlementMock,
}))

vi.mock("@/lib/payments/handlers/starter-kit", () => ({
  upsertStarterKitSubscriber: upsertStarterKitSubscriberMock,
}))

vi.mock("@/lib/payments/handlers/prompt-vault", () => ({
  upsertPromptVaultSubscriber: upsertPromptVaultSubscriberMock,
}))

vi.mock("@/lib/presets/orders", () => ({
  upsertPresetOrderForPurchase: upsertPresetOrderMock,
}))

vi.mock("@/lib/resend/manage-contact", () => ({
  updateContactTags: updateContactTagsMock,
}))

function queryText(call: unknown[]) {
  const strings = call[0] as TemplateStringsArray
  return Array.isArray(strings) ? strings.join(" ") : String(strings)
}

describe("One Selfie Visibility Bundle fixed SUITE pass", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockResolvedValue([])
  })

  it("grants a separate 30-day pass and safely supersedes an active free trial", async () => {
    const endsAt = new Date("2026-08-12T16:00:00.000Z")
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("grant_log") && query.includes("pass_result")) {
        return [{ created: true, balance_after: 200, trial_ends_at: endsAt }]
      }
      return []
    })

    const {
      SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS,
      SELFIE_VISIBILITY_BUNDLE_PASS_DAYS,
      grantSelfieVisibilityBundlePass,
    } = await import("@/lib/trial/selfie-visibility-bundle-pass")

    const result = await grantSelfieVisibilityBundlePass({
      userId: "user_1",
      stripePaymentId: "pi_bundle_1",
      stripeCustomerId: "cus_bundle_1",
      isTestMode: false,
    })

    expect(SELFIE_VISIBILITY_BUNDLE_PASS_DAYS).toBe(30)
    expect(SELFIE_VISIBILITY_BUNDLE_PASS_CREDITS).toBe(200)
    expect(result).toEqual({ created: true, passEndsAt: endsAt, creditsGranted: 200 })
    const insert = sqlMock.mock.calls.find(call =>
      queryText(call).includes("INSERT INTO subscriptions"),
    )
    expect(insert).toBeTruthy()
    const grantQuery = queryText(insert!)
    expect(grantQuery).toContain("selfie_visibility_bundle_pass")
    expect(grantQuery).toContain("INTERVAL '30 days'")
    expect(grantQuery).toContain("superseded_trial")
    expect(grantQuery).toContain("st.product_type = 'suite_trial'")
    expect(grantQuery).toContain("st.status = 'active'")
    expect(grantQuery).toContain("FROM pass_result")
    expect(grantQuery).not.toContain("'trial_expiry'")

    const grant = sqlMock.mock.calls.find(call =>
      queryText(call).includes("INSERT INTO user_credits"),
    )
    expect(queryText(grant!)).toContain("existing_grant")
    expect(queryText(grant!)).toContain("stripe_payment_id")
  })

  it("does not grant the pass credits twice when Stripe replays fulfillment", async () => {
    const endsAt = new Date("2026-08-12T16:00:00.000Z")
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("grant_log") && query.includes("existing_grant")) {
        return [{ created: false, balance_after: 200, trial_ends_at: endsAt }]
      }
      return []
    })

    const { grantSelfieVisibilityBundlePass } = await import(
      "@/lib/trial/selfie-visibility-bundle-pass"
    )

    const result = await grantSelfieVisibilityBundlePass({
      userId: "user_1",
      stripePaymentId: "pi_bundle_1",
      stripeCustomerId: "cus_bundle_1",
      isTestMode: false,
    })

    expect(result).toEqual({ created: false, passEndsAt: endsAt, creditsGranted: 0 })
  })

  it("keys replay protection to the payment and preserves value if a buyer pays twice", async () => {
    const source = await import("node:fs/promises").then(fs =>
      fs.readFile("lib/trial/selfie-visibility-bundle-pass.ts", "utf8"),
    )

    expect(source).toContain("stripe_payment_id = ${stripePaymentId}")
    expect(source).toContain("GREATEST(trial_ends_at, NOW()) + INTERVAL '30 days'")
    expect(source).toContain("SUM(amount)")
    expect(source).toContain("total_granted")
  })

  it("expires one pass atomically and removes only its net unused credits", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        expired: true,
        total_granted: 200,
        net_used: 75,
        credits_removed: 125,
        balance_after: 88,
      },
    ])

    const { expireSelfieVisibilityBundlePass } = await import(
      "@/lib/trial/selfie-visibility-bundle-pass"
    )

    const result = await expireSelfieVisibilityBundlePass({
      passId: "pass_1",
      userId: "user_1",
    })

    expect(result).toEqual({ expired: true, creditsRemoved: 125, balanceAfter: 88 })
    expect(sqlMock).toHaveBeenCalledTimes(1)
    const expiryQuery = queryText(sqlMock.mock.calls[0])
    expect(expiryQuery).toContain("transaction_type IN ('image', 'training', 'animation', 'refund')")
    expect(expiryQuery).not.toContain("transaction_type = 'purchase'")
    expect(expiryQuery).toContain("status = 'expired'")
    expect(expiryQuery).toContain("trial_expiry")
    expect(expiryQuery).toContain("LEAST")
    expect(expiryQuery).toContain("FOR UPDATE")
  })

  it("gives full SUITE access when an old free trial is already expired", async () => {
    sqlMock.mockResolvedValue([
      {
        product_type: "suite_trial",
        status: "expired",
        trial_ends_at: "2026-07-01T00:00:00.000Z",
      },
      {
        product_type: "selfie_visibility_bundle_pass",
        status: "active",
        trial_ends_at: "2099-08-12T16:00:00.000Z",
      },
    ])

    const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
    await expect(getSuiteAccess("user_prior_trial")).resolves.toEqual({
      level: "member",
      trialEndsAt: null,
      trialDaysLeft: null,
    })
  })
})

describe("One Selfie Visibility Bundle fulfillment orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockResolvedValue([])
    sendEmailMock.mockResolvedValue({ success: true, messageId: "email_bundle_1" })
    upsertEntitlementMock.mockResolvedValue(undefined)
    upsertStarterKitSubscriberMock.mockResolvedValue({ subscriberId: 1, accessToken: "starter_token" })
    upsertPromptVaultSubscriberMock.mockResolvedValue({ subscriberId: 1, accessToken: "vault_token" })
    upsertPresetOrderMock.mockResolvedValue({ accessToken: "presets_token" })
    updateContactTagsMock.mockResolvedValue({ success: true })
  })

  it("grants the exact bundle access through one handler without invoking product handlers", async () => {
    const endsAt = new Date("2026-08-12T16:00:00.000Z")
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("grant_log") && query.includes("pass_result")) {
        return [{ created: true, balance_after: 200, trial_ends_at: endsAt }]
      }
      if (query.includes("FROM email_logs")) return []
      return []
    })

    const { handleSelfieVisibilityBundleCheckout } = await import(
      "@/lib/payments/handlers/selfie-visibility-bundle"
    )

    await handleSelfieVisibilityBundleCheckout({
      event: { livemode: true } as any,
      session: {
        id: "cs_bundle_1",
        payment_status: "paid",
        payment_intent: "pi_bundle_1",
        customer: "cus_bundle_1",
        customer_details: { email: "buyer@example.com", name: "Buyer Example" },
        metadata: { source: "one_selfie_paid" },
      } as any,
      isPaymentPaid: true,
      customerEmail: "buyer@example.com",
      userId: "user_1",
      referralPurchaseUserId: "user_1",
      source: "one_selfie_paid",
    })

    expect(upsertStarterKitSubscriberMock).toHaveBeenCalledTimes(1)
    expect(upsertPromptVaultSubscriberMock).toHaveBeenCalledTimes(1)
    expect(upsertPresetOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "buyer@example.com",
        tier: "bundle",
        stripeSessionId: "cs_bundle_1",
        stripePaymentId: "pi_bundle_1",
      }),
    )

    for (const productId of [
      "selfie_visibility_bundle",
      "masterclass",
      "starter_kit",
      "prompt_vault",
    ]) {
      expect(upsertEntitlementMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_1", productId }),
      )
    }

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        emailType: "selfie_visibility_bundle_delivery",
        idempotencyKey: "selfie-visibility-bundle-delivery:cs_bundle_1",
        html: expect.stringContaining("/academy/access/one-selfie"),
        text: expect.stringContaining("/academy/access/one-selfie"),
      }),
    )
  })

  it("does not deliver or grant anything until payment is confirmed", async () => {
    const { handleSelfieVisibilityBundleCheckout } = await import(
      "@/lib/payments/handlers/selfie-visibility-bundle"
    )

    await handleSelfieVisibilityBundleCheckout({
      event: { livemode: true } as any,
      session: { id: "cs_bundle_pending", payment_status: "unpaid" } as any,
      isPaymentPaid: false,
      customerEmail: "buyer@example.com",
      userId: "user_1",
      referralPurchaseUserId: "user_1",
      source: "one_selfie_paid",
    })

    expect(sqlMock).not.toHaveBeenCalled()
    expect(upsertEntitlementMock).not.toHaveBeenCalled()
    expect(upsertStarterKitSubscriberMock).not.toHaveBeenCalled()
    expect(upsertPromptVaultSubscriberMock).not.toHaveBeenCalled()
    expect(upsertPresetOrderMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("never grants live bundle assets or credits from a Stripe test-mode event", async () => {
    const { handleSelfieVisibilityBundleCheckout } = await import(
      "@/lib/payments/handlers/selfie-visibility-bundle"
    )

    await handleSelfieVisibilityBundleCheckout({
      event: { livemode: false } as any,
      session: {
        id: "cs_test_bundle",
        payment_status: "paid",
        payment_intent: "pi_test_bundle",
        customer: "cus_test_bundle",
        customer_details: { email: "real-member@example.com", name: "Real Member" },
        metadata: { source: "one_selfie_launch" },
      } as any,
      isPaymentPaid: true,
      customerEmail: "real-member@example.com",
      userId: "real_user_1",
      referralPurchaseUserId: "real_user_1",
      source: "one_selfie_launch",
    })

    expect(sqlMock).not.toHaveBeenCalled()
    expect(upsertEntitlementMock).not.toHaveBeenCalled()
    expect(upsertStarterKitSubscriberMock).not.toHaveBeenCalled()
    expect(upsertPromptVaultSubscriberMock).not.toHaveBeenCalled()
    expect(upsertPresetOrderMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
