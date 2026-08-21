// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { hasSubscriptionAccess } from "@/lib/membership-access-policy"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  updateCheckoutSession: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  findAuthUserByEmail: vi.fn(),
  getOrCreateNeonUser: vi.fn(),
  sendEmail: vi.fn(),
  upsertSubscription: vi.fn(),
  removeSalesContact: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mocks.retrieveSubscription,
      update: mocks.updateSubscription,
    },
    checkout: { sessions: { update: mocks.updateCheckoutSession } },
  },
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers: mocks.listUsers, createUser: mocks.createUser } },
  }),
}))
vi.mock("@/lib/supabase/find-auth-user-by-email", () => ({
  findAuthUserByEmail: mocks.findAuthUserByEmail,
}))
vi.mock("@/lib/user-mapping", () => ({ getOrCreateNeonUser: mocks.getOrCreateNeonUser }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))
vi.mock("@/lib/payments/lifecycle/upsert-studio-membership", () => ({
  upsertStudioMembershipSubscription: mocks.upsertSubscription,
}))
vi.mock("@/lib/payments/shared", () => ({
  getSubscriptionPeriod: (subscription: any) => ({
    start: subscription.current_period_start,
    end: subscription.current_period_end,
  }),
}))
vi.mock("@/lib/launch/cash-launch-pricing", () => ({
  getSubscriptionPlanFromMetadata: vi.fn((_metadata, productType) =>
    productType === "vault_maya" ? "vault_maya_founder" : "monthly"
  ),
}))
vi.mock("@/lib/email/templates/membership-welcome", () => ({
  MEMBERSHIP_WELCOME_SUBJECTS: { new: "Membership new", existing: "Membership existing" },
  generateMembershipWelcomeEmail: vi.fn(input => ({
    html: `membership:${input.variant}:${input.passwordSetupUrl || "none"}`,
    text: `membership:${input.variant}:${input.passwordSetupUrl || "none"}`,
  })),
}))
vi.mock("@/lib/email/templates/vault-maya-welcome", () => ({
  VAULT_MAYA_WELCOME_SUBJECTS: { new: "Vault new", existing: "Vault existing" },
  generateVaultMayaWelcomeEmail: vi.fn(input => ({
    html: `vault:${input.variant}:${input.passwordSetupUrl || "none"}`,
    text: `vault:${input.variant}:${input.passwordSetupUrl || "none"}`,
  })),
}))
vi.mock("@/lib/email/templates/welcome-email", () => ({
  generateWelcomeEmail: vi.fn(() => ({ html: "welcome", text: "welcome" })),
}))
vi.mock("@/lib/email/campaigns/vault-maya-launch-segments", () => ({
  removeVaultMayaLaunchSalesContact: mocks.removeSalesContact,
}))

type LocalUser = {
  id: string
  email: string
  password_setup_complete: boolean
  supabase_user_id: string
}

let localUser: LocalUser | null
let currentSubscription: any

function queryText(call: unknown[]): string {
  return Array.from(call[0] as TemplateStringsArray)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function context(input: {
  livemode?: boolean
  paid?: boolean
  productType?: "sselfie_studio_membership" | "vault_maya"
  metadataUserId?: boolean
}) {
  const productType = input.productType || "sselfie_studio_membership"
  const paid = input.paid ?? true
  return {
    event: {
      id: paid ? "evt_async_paid" : "evt_unpaid",
      type: paid ? "checkout.session.async_payment_succeeded" : "checkout.session.completed",
      livemode: input.livemode ?? true,
      created: paid ? 1_787_307_900 : 1_787_307_300,
    },
    session: {
      id: "cs_membership_journey",
      created: 1_787_307_300,
      mode: "subscription",
      payment_status: paid ? "paid" : "unpaid",
      subscription: "sub_membership_journey",
      customer: "cus_membership_journey",
      customer_email: "new-member@example.com",
      customer_details: { email: "new-member@example.com", name: "New Member" },
      metadata: {
        ...(input.metadataUserId ? { user_id: "neon_member_1", auto_created: "true" } : {}),
        product_type: productType,
        product_id: productType,
        credits: productType === "vault_maya" ? "30" : "250",
        source: "membership_checkout",
      },
    },
    isPaymentPaid: paid,
    maybeTrackCheckoutReferralSignup: vi.fn(),
  }
}

describe("subscription checkout onboarding resilience", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localUser = null
    currentSubscription = {
      id: "sub_membership_journey",
      start_date: 1_787_307_000,
      customer: "cus_membership_journey",
      status: "active",
      current_period_start: 1_780_000_000,
      current_period_end: 1_782_592_000,
      metadata: { product_type: "sselfie_studio_membership", credits: "250" },
    }

    mocks.sql.mockImplementation(async (...call: unknown[]) => {
      const query = queryText(call)
      if (query.includes("SELECT id, password_setup_complete") && query.includes("FROM users")) {
        return localUser ? [localUser] : []
      }
      if (query.includes("SET password_setup_complete = FALSE") && localUser) {
        localUser.password_setup_complete = false
      }
      return []
    })
    mocks.findAuthUserByEmail.mockResolvedValue(null)
    mocks.createUser.mockResolvedValue({
      data: { user: { id: "auth_member_1", email: "new-member@example.com" } },
      error: null,
    })
    mocks.getOrCreateNeonUser.mockImplementation(async () => {
      localUser = {
        id: "neon_member_1",
        email: "new-member@example.com",
        password_setup_complete: false,
        supabase_user_id: "auth_member_1",
      }
      return { id: "neon_member_1" }
    })
    mocks.retrieveSubscription.mockImplementation(async () => currentSubscription)
    mocks.updateSubscription.mockImplementation(async (_id, update) => {
      currentSubscription = {
        ...currentSubscription,
        metadata: { ...currentSubscription.metadata, ...update.metadata },
      }
      return currentSubscription
    })
    mocks.updateCheckoutSession.mockResolvedValue({})
    mocks.upsertSubscription.mockResolvedValue(undefined)
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "msg_welcome" })
    mocks.removeSalesContact.mockResolvedValue(undefined)
  })

  it.each([
    ["sselfie_studio_membership", true],
    ["sselfie_studio_membership", false],
    ["vault_maya", true],
    ["vault_maya", false],
  ] as const)(
    "completes unpaid-to-paid %s onboarding once when paid metadata user_id present=%s",
    async (productType, metadataUserId) => {
      const unpaid = context({ paid: false, productType })
      const paid = context({ paid: true, productType, metadataUserId })
      const referral = unpaid.maybeTrackCheckoutReferralSignup
      paid.maybeTrackCheckoutReferralSignup = referral

      const { handleStudioMembershipSubscriptionCheckout } =
        await import("@/lib/payments/handlers/studio-membership")
      await handleStudioMembershipSubscriptionCheckout(unpaid as any)

      expect(mocks.createUser).toHaveBeenCalledTimes(1)
      expect(mocks.getOrCreateNeonUser).toHaveBeenCalledTimes(1)
      expect(mocks.sendEmail).not.toHaveBeenCalled()
      expect(referral).not.toHaveBeenCalled()
      expect(mocks.upsertSubscription).not.toHaveBeenCalled()
      expect(hasSubscriptionAccess(null)).toBe(false)

      await handleStudioMembershipSubscriptionCheckout(paid as any)

      expect(mocks.createUser).toHaveBeenCalledTimes(1)
      expect(mocks.getOrCreateNeonUser).toHaveBeenCalledTimes(1)
      expect(mocks.upsertSubscription).toHaveBeenCalledTimes(1)
      expect(mocks.upsertSubscription).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userId: "neon_member_1",
          status: "active",
          stripeSubscriptionId: "sub_membership_journey",
          isTestMode: false,
          ...(productType === "sselfie_studio_membership"
            ? {
                shadowMembershipStarted: {
                  checkoutSessionId: "cs_membership_journey",
                  occurredAt: new Date(1_787_307_900 * 1000),
                },
              }
            : {}),
        })
      )
      expect(hasSubscriptionAccess(mocks.upsertSubscription.mock.calls[0][0])).toBe(true)
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: productType === "vault_maya" ? "vault_maya_welcome" : "membership_welcome",
          idempotencyKey:
            productType === "vault_maya"
              ? "vault-maya-welcome:cs_membership_journey"
              : "membership-welcome:cs_membership_journey",
          html: expect.stringContaining("/auth/forgot-password?next="),
        })
      )
      expect(referral).toHaveBeenCalledTimes(1)
      expect(mocks.updateCheckoutSession).toHaveBeenCalledTimes(1)
    }
  )

  it("keeps a test subscription at zero effects, then allows the same email to buy live cleanly", async () => {
    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")

    await handleStudioMembershipSubscriptionCheckout(
      context({ livemode: false, paid: true }) as any
    )
    expect(localUser).toBeNull()
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.findAuthUserByEmail).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.getOrCreateNeonUser).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled()
    expect(mocks.updateSubscription).not.toHaveBeenCalled()
    expect(mocks.updateCheckoutSession).not.toHaveBeenCalled()
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()

    await handleStudioMembershipSubscriptionCheckout(context({ paid: true }) as any)
    expect(mocks.createUser).toHaveBeenCalledTimes(1)
    expect(mocks.getOrCreateNeonUser).toHaveBeenCalledTimes(1)
    expect(mocks.upsertSubscription).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })

  it("throws on new-buyer welcome failure and replays with one provider delivery", async () => {
    const deliveredKeys = new Set<string>()
    mocks.sendEmail.mockImplementation(async input => {
      const key = String(input.idempotencyKey)
      const firstDelivery = !deliveredKeys.has(key)
      deliveredKeys.add(key)
      return firstDelivery
        ? { success: false, error: "provider response lost after acceptance" }
        : { success: true, messageId: "msg_original_delivery" }
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    const paid = context({ paid: true })
    await expect(handleStudioMembershipSubscriptionCheckout(paid as any)).rejects.toThrow(
      "provider response lost after acceptance"
    )
    await expect(handleStudioMembershipSubscriptionCheckout(paid as any)).resolves.toBeUndefined()

    expect(mocks.createUser).toHaveBeenCalledTimes(1)
    expect(mocks.getOrCreateNeonUser).toHaveBeenCalledTimes(1)
    expect(mocks.upsertSubscription).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "membership-welcome:cs_membership_journey",
      "membership-welcome:cs_membership_journey",
    ])
    expect(deliveredKeys.size).toBe(1)
  })

  it("ignores a stale metadata user ID and resolves the real buyer through email and Auth", async () => {
    const paid = context({ paid: true, metadataUserId: true })
    paid.session.metadata.user_id = "missing_neon_user"

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(paid as any)

    expect(mocks.findAuthUserByEmail).toHaveBeenCalledWith({
      email: "new-member@example.com",
      listUsers: expect.any(Function),
    })
    expect(mocks.createUser).toHaveBeenCalledTimes(1)
    expect(mocks.getOrCreateNeonUser).toHaveBeenCalledTimes(1)
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "neon_member_1", status: "active" })
    )
    expect(mocks.upsertSubscription).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "missing_neon_user" })
    )
  })

  it("keeps active subscription lifecycle events closed until checkout payment is confirmed", async () => {
    localUser = {
      id: "neon_member_1",
      email: "new-member@example.com",
      password_setup_complete: true,
      supabase_user_id: "auth_member_1",
    }
    currentSubscription = {
      ...currentSubscription,
      status: "active",
      metadata: {
        ...currentSubscription.metadata,
        user_id: "neon_member_1",
      },
    }
    const lifecycle = await import("@/lib/payments/lifecycle/subscription-events")
    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")

    await lifecycle.handleSubscriptionCreated({
      id: "evt_subscription_created_unpaid",
      livemode: true,
      data: { object: currentSubscription },
    } as any)
    await lifecycle.handleSubscriptionUpdated({
      id: "evt_subscription_updated_unpaid",
      livemode: true,
      data: { object: currentSubscription },
    } as any)
    await handleStudioMembershipSubscriptionCheckout(
      context({ paid: false, metadataUserId: true }) as any
    )

    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
    expect(hasSubscriptionAccess(null)).toBe(false)

    await handleStudioMembershipSubscriptionCheckout(
      context({ paid: true, metadataUserId: true }) as any
    )

    expect(mocks.upsertSubscription).toHaveBeenCalledTimes(1)
    expect(hasSubscriptionAccess(mocks.upsertSubscription.mock.calls[0][0])).toBe(true)
  })

  it("records an explicitly zero-total SUITE start using immutable session time fallback", async () => {
    currentSubscription = {
      ...currentSubscription,
      start_date: undefined,
      status: "active",
    }
    const zeroTotal = context({ paid: true, metadataUserId: true })
    zeroTotal.event.type = "checkout.session.completed"
    zeroTotal.event.created = 1_787_307_300
    zeroTotal.session.payment_status = "no_payment_required"
    ;(zeroTotal.session as any).amount_total = 0

    localUser = {
      id: "neon_member_1",
      email: "new-member@example.com",
      password_setup_complete: true,
      supabase_user_id: "auth_member_1",
    }

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(zeroTotal as any)

    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        productType: "sselfie_studio_membership",
        shadowMembershipStarted: {
          checkoutSessionId: "cs_membership_journey",
          occurredAt: new Date(1_787_307_300 * 1000),
        },
      })
    )
  })

  it("records unpaid T0 to async-paid T1 at the access-transition event time exactly once", async () => {
    const unpaid = context({ paid: false })
    const asyncPaid = context({ paid: true, metadataUserId: true })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(unpaid as any)
    await handleStudioMembershipSubscriptionCheckout(asyncPaid as any)

    expect(mocks.upsertSubscription).toHaveBeenCalledTimes(1)
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        shadowMembershipStarted: {
          checkoutSessionId: "cs_membership_journey",
          occurredAt: new Date(1_787_307_900 * 1000),
        },
      })
    )
  })

  it("keeps delayed current terminal status while retaining the historical start fact", async () => {
    localUser = {
      id: "neon_member_1",
      email: "new-member@example.com",
      password_setup_complete: true,
      supabase_user_id: "auth_member_1",
    }
    currentSubscription = { ...currentSubscription, status: "canceled" }

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(
      context({ paid: true, metadataUserId: true }) as any
    )

    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "canceled",
        shadowMembershipStarted: expect.objectContaining({
          checkoutSessionId: "cs_membership_journey",
        }),
      })
    )
  })

  it("does not infer a SUITE start fact from an unknown subscription product", async () => {
    localUser = {
      id: "neon_member_1",
      email: "new-member@example.com",
      password_setup_complete: true,
      supabase_user_id: "auth_member_1",
    }
    currentSubscription = { ...currentSubscription, start_date: undefined }
    const unknown = context({ paid: true, metadataUserId: true })
    unknown.session.metadata.product_type = "unknown_subscription" as any

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(unknown as any)

    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.not.objectContaining({ shadowMembershipStarted: expect.anything() })
    )
  })
})
