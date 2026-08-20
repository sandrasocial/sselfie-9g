// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { hasSubscriptionAccess } from "@/lib/membership-access-policy"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  retrieveSubscription: vi.fn(),
  retrieveInvoice: vi.fn(),
  upsertSubscription: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mocks.retrieveSubscription,
      update: vi.fn(),
    },
    invoices: { retrieve: mocks.retrieveInvoice },
    customers: { retrieve: vi.fn() },
  },
}))
vi.mock("@/lib/payments/lifecycle/upsert-studio-membership", () => ({
  upsertStudioMembershipSubscription: mocks.upsertSubscription,
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }))

function subscription(status: string, latestInvoice: string | null = "in_refresh_1") {
  return {
    id: "sub_refresh_1",
    customer: "cus_refresh_1",
    status,
    latest_invoice: latestInvoice,
    current_period_start: 1_754_003_200,
    current_period_end: 1_756_681_600,
    metadata: {
      user_id: "user_refresh_1",
      product_type: "sselfie_studio_membership",
      plan: "monthly",
      credits: "250",
    },
    discounts: [],
  }
}

function invoice(status: "paid" | "open", subscriptionId = "sub_refresh_1") {
  return {
    id: "in_refresh_1",
    status,
    subscription: subscriptionId,
    amount_paid: status === "paid" ? 0 : 0,
    status_transitions: { paid_at: status === "paid" ? 1_754_003_210 : null },
  }
}

let existingRow: { id: string; status: string } | null
let hasPriorPaidSubscriptionInvoice: boolean

describe("subscription lifecycle current-state refresh", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(mocks).forEach(mock => mock.mockReset())
    existingRow = null
    hasPriorPaidSubscriptionInvoice = true
    mocks.sql.mockImplementation(async (...call: unknown[]) => {
      const query = Array.from(call[0] as TemplateStringsArray).join(" ")
      if (query.includes("SELECT id, status") && query.includes("FROM subscriptions")) {
        return existingRow ? [existingRow] : []
      }
      if (
        query.includes("FROM stripe_payments") &&
        query.includes("status IN ('paid', 'succeeded')")
      ) {
        return hasPriorPaidSubscriptionInvoice ? [{ id: "paid_payment_refresh_1" }] : []
      }
      return []
    })
    mocks.retrieveInvoice.mockResolvedValue(invoice("paid"))
    mocks.upsertSubscription.mockResolvedValue(undefined)
  })

  it("uses current Stripe state when a delayed subscription.created follows cancellation", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("canceled"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    expect(mocks.retrieveSubscription).toHaveBeenCalledWith("sub_refresh_1")
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it("preserves explicit trialing access from the current Stripe subscription", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("trialing"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "trialing" })
    )
    expect(mocks.retrieveInvoice).not.toHaveBeenCalled()
  })

  it("does not create active access while the exact initial invoice is still open", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    expect(mocks.retrieveInvoice).toHaveBeenCalledWith("in_refresh_1")
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it("ends existing trial access when a delayed created event observes active with an open invoice", async () => {
    existingRow = { id: "row_refresh_1", status: "trialing" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("trialing") },
    } as any)

    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall?.slice(1)).toEqual(["incomplete", "row_refresh_1", "sub_refresh_1"])
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
    expect(
      hasSubscriptionAccess({
        status: "incomplete",
        current_period_end: new Date(Date.now() + 86_400_000),
      })
    ).toBe(false)
  })

  it("moves a prior-paid active row to grace without extending its period on a replayed created event", async () => {
    existingRow = { id: "row_refresh_1", status: "active" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall?.slice(1)).toEqual(["past_due", "row_refresh_1", "sub_refresh_1"])
    expect(Array.from(updateCall?.[0] as TemplateStringsArray).join(" ")).not.toContain(
      "current_period_end"
    )
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it("creates active access from a confirmed exact zero-value paid invoice", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("paid"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionCreated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    )
  })

  it("throws before access mutation when the latest invoice belongs to another subscription", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("paid", "sub_other"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await expect(
      handleSubscriptionCreated({
        livemode: true,
        data: { object: subscription("active") },
      } as any)
    ).rejects.toThrow("does not belong to subscription sub_refresh_1")
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it("throws before access mutation when latest-invoice retrieval fails", async () => {
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockRejectedValue(new Error("Invoice unavailable"))
    const { handleSubscriptionCreated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await expect(
      handleSubscriptionCreated({
        livemode: true,
        data: { object: subscription("active") },
      } as any)
    ).rejects.toThrow("Invoice unavailable")
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it("uses current active Stripe state instead of a stale past_due update", async () => {
    existingRow = { id: "row_refresh_1", status: "past_due" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    const { handleSubscriptionUpdated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("past_due") },
    } as any)

    expect(mocks.retrieveSubscription).toHaveBeenCalledWith("sub_refresh_1")
    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall).toBeDefined()
    expect(updateCall!.slice(1)).toContain("active")
    expect(updateCall!.slice(1)).not.toContain("past_due")
  })

  it("keeps an open active renewal only in old-period grace, then promotes after paid truth", async () => {
    existingRow = { id: "row_refresh_1", status: "past_due" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice
      .mockResolvedValueOnce(invoice("open"))
      .mockResolvedValueOnce(invoice("paid"))
    const { handleSubscriptionUpdated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)
    const graceCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(graceCall?.slice(1)).toEqual(["past_due", "row_refresh_1", "sub_refresh_1"])
    expect(Array.from(graceCall?.[0] as TemplateStringsArray).join(" ")).not.toContain(
      "current_period_end"
    )
    expect(
      hasSubscriptionAccess({ status: "past_due", current_period_end: new Date(Date.now() - 1) })
    ).toBe(false)

    mocks.sql.mockClear()
    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)
    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall?.slice(1)).toContain("active")
  })

  it("applies past-due grace without copying an unconfirmed renewal period", async () => {
    existingRow = { id: "row_refresh_1", status: "active" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("past_due"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
    const { handleSubscriptionUpdated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    expect(mocks.retrieveInvoice).toHaveBeenCalledWith("in_refresh_1")
    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall?.slice(1)).toEqual(["past_due", "row_refresh_1", "sub_refresh_1"])
    expect(Array.from(updateCall?.[0] as TemplateStringsArray).join(" ")).not.toContain(
      "current_period_end"
    )
  })

  it("ends unproven active access when the current active invoice is open", async () => {
    existingRow = { id: "row_refresh_1", status: "active" }
    hasPriorPaidSubscriptionInvoice = false
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
    const { handleSubscriptionUpdated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    const updateCall = mocks.sql.mock.calls.find(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updateCall?.slice(1)).toEqual(["incomplete", "row_refresh_1", "sub_refresh_1"])
    expect(
      hasSubscriptionAccess({
        status: "incomplete",
        current_period_end: new Date(Date.now() + 86_400_000),
      })
    ).toBe(false)
  })

  it.each(["active", "past_due"])(
    "ends trial access without extending the period when Stripe becomes %s on an open invoice",
    async currentStatus => {
      existingRow = { id: "row_refresh_1", status: "trialing" }
      mocks.retrieveSubscription.mockResolvedValue(subscription(currentStatus))
      mocks.retrieveInvoice.mockResolvedValue(invoice("open"))
      const { handleSubscriptionUpdated } =
        await import("@/lib/payments/lifecycle/subscription-events")

      await handleSubscriptionUpdated({
        livemode: true,
        data: { object: subscription("trialing") },
      } as any)

      const updateCall = mocks.sql.mock.calls.find(call =>
        Array.from(call[0] as TemplateStringsArray)
          .join(" ")
          .includes("UPDATE subscriptions")
      )
      expect(updateCall).toBeDefined()
      const updateQuery = Array.from(updateCall![0] as TemplateStringsArray).join(" ")
      expect(updateCall?.slice(1)).toContain("incomplete")
      expect(updateQuery).not.toContain("current_period_start")
      expect(updateQuery).not.toContain("current_period_end")
      expect(
        hasSubscriptionAccess({
          status: "incomplete",
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      ).toBe(false)
    }
  )

  it("promotes a former trial only after the exact latest invoice becomes paid", async () => {
    existingRow = { id: "row_refresh_1", status: "trialing" }
    mocks.retrieveSubscription.mockResolvedValue(subscription("active"))
    mocks.retrieveInvoice
      .mockResolvedValueOnce(invoice("open"))
      .mockResolvedValueOnce(invoice("paid"))
    const { handleSubscriptionUpdated } =
      await import("@/lib/payments/lifecycle/subscription-events")

    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("trialing") },
    } as any)
    existingRow = { id: "row_refresh_1", status: "incomplete" }
    await handleSubscriptionUpdated({
      livemode: true,
      data: { object: subscription("active") },
    } as any)

    const updates = mocks.sql.mock.calls.filter(call =>
      Array.from(call[0] as TemplateStringsArray)
        .join(" ")
        .includes("UPDATE subscriptions")
    )
    expect(updates).toHaveLength(2)
    expect(updates[0].slice(1)).toContain("incomplete")
    expect(updates[1].slice(1)).toContain("active")
    expect(hasSubscriptionAccess({ status: "active" })).toBe(true)
  })

  it.each(["canceled", "incomplete_expired"])(
    "makes a trial-to-%s transition terminal without extending trial time",
    async currentStatus => {
      existingRow = { id: "row_refresh_1", status: "trialing" }
      mocks.retrieveSubscription.mockResolvedValue(subscription(currentStatus))
      const { handleSubscriptionUpdated } =
        await import("@/lib/payments/lifecycle/subscription-events")

      await handleSubscriptionUpdated({
        livemode: true,
        data: { object: subscription("trialing") },
      } as any)

      expect(mocks.retrieveInvoice).not.toHaveBeenCalled()
      const updateCall = mocks.sql.mock.calls.find(call =>
        Array.from(call[0] as TemplateStringsArray)
          .join(" ")
          .includes("UPDATE subscriptions")
      )
      expect(updateCall).toBeDefined()
      const updateQuery = Array.from(updateCall![0] as TemplateStringsArray).join(" ")
      expect(updateCall?.slice(1)).toContain(currentStatus)
      expect(updateQuery).not.toContain("current_period_start")
      expect(updateQuery).toContain("current_period_end")
    }
  )

  it.each(["created", "updated"] as const)(
    "leaves the database unchanged when a %s refresh fails",
    async kind => {
      mocks.retrieveSubscription.mockRejectedValue(new Error("Stripe unavailable"))
      const lifecycle = await import("@/lib/payments/lifecycle/subscription-events")
      const handler =
        kind === "created"
          ? lifecycle.handleSubscriptionCreated
          : lifecycle.handleSubscriptionUpdated

      await expect(
        handler({ livemode: true, data: { object: subscription("active") } } as any)
      ).rejects.toThrow("Stripe unavailable")
      expect(mocks.sql).not.toHaveBeenCalled()
      expect(mocks.upsertSubscription).not.toHaveBeenCalled()
    }
  )
})
