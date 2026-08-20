// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { VAULT_MAYA_WELCOME_SUBJECTS } from "@/lib/email/templates/vault-maya-welcome"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  updateCheckoutSession: vi.fn(),
  retrieveCustomer: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  generateLink: vi.fn(),
  findAuthUserByEmail: vi.fn(),
  getOrCreateNeonUser: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mocks.retrieveSubscription,
      update: mocks.updateSubscription,
    },
    checkout: { sessions: { update: mocks.updateCheckoutSession } },
    customers: { retrieve: mocks.retrieveCustomer },
  },
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: mocks.listUsers,
        createUser: mocks.createUser,
        generateLink: mocks.generateLink,
      },
    },
  }),
}))
vi.mock("@/lib/supabase/find-auth-user-by-email", () => ({
  findAuthUserByEmail: mocks.findAuthUserByEmail,
}))
vi.mock("@/lib/user-mapping", () => ({
  getOrCreateNeonUser: mocks.getOrCreateNeonUser,
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: mocks.sendEmail }))

function queryText(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray
  return Array.from(strings).join(" ").replace(/\s+/g, " ").trim()
}

function vaultSubscription(userId?: string) {
  return {
    id: "sub_vault_1",
    customer: "cus_vault_1",
    status: "active",
    current_period_start: 1_754_003_200,
    current_period_end: 1_756_681_600,
    metadata: {
      ...(userId ? { user_id: userId } : {}),
      product_id: "vault_maya",
      product_type: "vault_maya",
      credits: "30",
      plan: "vault_maya_founder",
    },
    discounts: [],
  }
}

function checkoutContext(input: {
  userId?: string
  livemode?: boolean
  customerEmail?: string
  paymentPaid?: boolean
  productType?: "vault_maya" | "sselfie_studio_membership"
}) {
  const email = input.customerEmail || "vault-buyer@example.com"
  const productType = input.productType || "vault_maya"
  const paymentPaid = input.paymentPaid ?? true
  return {
    event: { livemode: input.livemode ?? false },
    session: {
      id: "cs_vault_1",
      mode: "subscription",
      status: "complete",
      payment_status: paymentPaid ? "paid" : "unpaid",
      subscription: "sub_vault_1",
      customer: "cus_vault_1",
      customer_email: email,
      customer_details: { email, name: "Vault Buyer" },
      metadata: {
        ...(input.userId ? { user_id: input.userId } : {}),
        product_id: productType,
        product_type: productType,
        credits: productType === "vault_maya" ? "30" : "250",
        plan: productType === "vault_maya" ? "vault_maya_founder" : "monthly",
      },
    },
    isPaymentPaid: paymentPaid,
    maybeTrackCheckoutReferralSignup: vi.fn(),
  }
}

describe("Vault Maya subscription lifecycle", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(mocks).forEach(mock => mock.mockReset())
    mocks.sql.mockImplementation(async (...call: unknown[]) =>
      queryText(call).includes("pg_advisory_xact_lock") ? [{ id: 901 }] : []
    )
    mocks.retrieveSubscription.mockResolvedValue(vaultSubscription("neon_vault_1"))
    mocks.updateSubscription.mockResolvedValue(vaultSubscription("neon_vault_1"))
    mocks.updateCheckoutSession.mockResolvedValue({})
    mocks.retrieveCustomer.mockResolvedValue({
      id: "cus_vault_1",
      deleted: false,
      email: "vault-buyer@example.com",
    })
    mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mocks.findAuthUserByEmail.mockResolvedValue(null)
    mocks.getOrCreateNeonUser.mockResolvedValue({ id: "neon_vault_1" })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email_vault_1" })
  })

  it("does not create Vault or SUITE access when active subscription.created wins the unpaid race", async () => {
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: vaultSubscription("neon_vault_1") },
    } as any)

    const upsertCall = mocks.sql.mock.calls.find(call =>
      queryText(call).includes("pg_advisory_xact_lock")
    )
    expect(upsertCall).toBeUndefined()
  })

  it("searches every Auth page before creating a duplicate buyer account", async () => {
    mocks.findAuthUserByEmail.mockResolvedValue({
      id: "auth_existing",
      email: "Vault-Buyer@Example.com",
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(checkoutContext({ livemode: true }) as any)

    expect(mocks.findAuthUserByEmail).toHaveBeenCalledWith({
      email: "vault-buyer@example.com",
      listUsers: expect.any(Function),
    })
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.getOrCreateNeonUser).toHaveBeenCalledWith(
      "auth_existing",
      "vault-buyer@example.com",
      null
    )
  })

  it("fails the webhook so Stripe retries when paid account provisioning is incomplete", async () => {
    mocks.findAuthUserByEmail.mockRejectedValue(new Error("Supabase temporarily unavailable"))
    mocks.listUsers.mockResolvedValue({
      data: null,
      error: { message: "Supabase temporarily unavailable" },
    })
    mocks.createUser.mockResolvedValue({
      data: { user: null },
      error: new Error("duplicate or unavailable"),
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")

    await expect(
      handleStudioMembershipSubscriptionCheckout(checkoutContext({ livemode: true }) as any)
    ).rejects.toThrow("Supabase temporarily unavailable")
  })

  it("sends and records the Vault-specific welcome for a new paid buyer", async () => {
    mocks.createUser.mockResolvedValue({
      data: {
        user: {
          id: "auth_new_vault",
          email: "vault-buyer@example.com",
        },
      },
      error: null,
    })
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: "https://auth.example.com/verify?token=vault_setup&type=recovery",
        },
      },
      error: null,
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(checkoutContext({ livemode: true }) as any)

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: VAULT_MAYA_WELCOME_SUBJECTS.new,
        emailType: "vault_maya_welcome",
        idempotencyKey: "vault-maya-welcome:cs_vault_1",
        tags: expect.arrayContaining(["vault-maya-welcome", "account-setup"]),
      })
    )
    expect(mocks.generateLink).not.toHaveBeenCalled()
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("/auth/forgot-password?next=%2Fvault-maya%2Fstudio"),
      })
    )
    const emailLogCall = mocks.sql.mock.calls.find(call =>
      queryText(call).includes("INSERT INTO email_logs")
    )
    expect(emailLogCall?.slice(1)).toContain("vault_maya_welcome")
  })

  it("keeps test subscriptions out of shared customer systems", async () => {
    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(
      checkoutContext({
        livemode: false,
        paymentPaid: true,
        productType: "sselfie_studio_membership",
      }) as any
    )

    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.getOrCreateNeonUser).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscription).not.toHaveBeenCalled()
    expect(mocks.updateCheckoutSession).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("keeps live unpaid subscription scaffolding but sends no welcome or setup link", async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: { id: "auth_new_membership", email: "vault-buyer@example.com" } },
      error: null,
    })
    mocks.generateLink.mockResolvedValue({
      data: { properties: { action_link: "https://auth.example.com/verify?token=setup" } },
      error: null,
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(
      checkoutContext({
        livemode: true,
        paymentPaid: false,
        productType: "sselfie_studio_membership",
      }) as any
    )

    expect(mocks.createUser).toHaveBeenCalled()
    expect(mocks.updateCheckoutSession).toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("uses a stable session key for a new live-paid membership welcome", async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: { id: "auth_new_membership", email: "vault-buyer@example.com" } },
      error: null,
    })
    mocks.generateLink.mockResolvedValue({
      data: { properties: { action_link: "https://auth.example.com/verify?token=setup" } },
      error: null,
    })

    const { handleStudioMembershipSubscriptionCheckout } =
      await import("@/lib/payments/handlers/studio-membership")
    await handleStudioMembershipSubscriptionCheckout(
      checkoutContext({
        livemode: true,
        paymentPaid: true,
        productType: "sselfie_studio_membership",
      }) as any
    )

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: "membership_welcome",
        idempotencyKey: "membership-welcome:cs_vault_1",
      })
    )
  })

  it("does not send every new buyer into the retired Resend Beta segment", () => {
    const checkoutLifecycle = readFileSync(
      "lib/payments/lifecycle/checkout-session-completed.ts",
      "utf8"
    )
    expect(checkoutLifecycle).not.toContain("RESEND_BETA_SEGMENT_ID")
    expect(checkoutLifecycle).not.toContain("Beta Customers segment")
  })
})
