// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const upsertPurchaseEntitlementMock = vi.fn()
const sendEmailMock = vi.fn()

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/academy-entitlements", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/academy-entitlements")>()
  return { ...original, upsertPurchaseEntitlement: upsertPurchaseEntitlementMock }
})
vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }))
vi.mock("@/lib/email/recipient-name", () => ({ getFirstNameForEmail: vi.fn(() => "Owner") }))
vi.mock("@/lib/payments/shared", () => ({ generatePasswordSetupLinkForPurchase: vi.fn() }))

function context({
  paid,
  livemode,
  eventType = "checkout.session.completed",
}: {
  paid: boolean
  livemode: boolean
  eventType?: string
}) {
  return {
    event: { id: "evt_1", type: eventType, livemode },
    session: {
      id: "cs_1",
      payment_status: paid ? "paid" : "unpaid",
      payment_intent: "pi_1",
      amount_total: 4700,
      currency: "eur",
      customer_details: { email: "owner@example.com", name: "Owner" },
      customer_email: "owner@example.com",
      metadata: {
        product_type: "academy_mini_product",
        product_id: "what_to_say",
        user_id: "owner_1",
      },
    },
    isPaymentPaid: paid,
    customerEmail: "owner@example.com",
    userId: "owner_1",
    referralPurchaseUserId: null,
    source: null,
    productType: "academy_mini_product",
  } as any
}

describe("Academy product fulfillment guards", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "test")
    sqlMock.mockResolvedValue([])
    upsertPurchaseEntitlementMock.mockResolvedValue(undefined)
    sendEmailMock.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("does nothing for an unpaid checkout completion", async () => {
    const { handleAcademyProductCheckout } =
      await import("@/lib/payments/handlers/academy-products")

    await handleAcademyProductCheckout(context({ paid: false, livemode: true }))

    expect(sqlMock).not.toHaveBeenCalled()
    expect(upsertPurchaseEntitlementMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("fulfills the later paid asynchronous event", async () => {
    const { handleAcademyProductCheckout } =
      await import("@/lib/payments/handlers/academy-products")

    await handleAcademyProductCheckout(
      context({
        paid: true,
        livemode: true,
        eventType: "checkout.session.async_payment_succeeded",
      })
    )

    expect(upsertPurchaseEntitlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "what_to_say",
        throwOnError: true,
      })
    )
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it("skips test-mode events when production live-row enforcement is active", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { handleAcademyProductCheckout } =
      await import("@/lib/payments/handlers/academy-products")

    await handleAcademyProductCheckout(context({ paid: true, livemode: false }))

    expect(sqlMock).not.toHaveBeenCalled()
    expect(upsertPurchaseEntitlementMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("keeps test-mode fulfillment available to non-production fixtures", async () => {
    const { handleAcademyProductCheckout } =
      await import("@/lib/payments/handlers/academy-products")

    await handleAcademyProductCheckout(context({ paid: true, livemode: false }))

    expect(upsertPurchaseEntitlementMock).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "what_to_say", throwOnError: true })
    )
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it("uses one provider delivery when a stale event replay re-enters after an email send", async () => {
    const providerSend = vi.fn()
    const providerKeys = new Set<string>()
    sendEmailMock.mockImplementation(async input => {
      if (!providerKeys.has(input.idempotencyKey)) {
        providerKeys.add(input.idempotencyKey)
        providerSend()
      }
      return { success: true }
    })
    const { handleAcademyProductCheckout } =
      await import("@/lib/payments/handlers/academy-products")

    const replayedContext = context({ paid: true, livemode: true })
    await handleAcademyProductCheckout(replayedContext)
    await handleAcademyProductCheckout(replayedContext)

    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: "academy-purchase-delivery:cs_1" })
    )
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: "academy-purchase-delivery:cs_1" })
    )
    expect(providerSend).toHaveBeenCalledTimes(1)
  })
})
