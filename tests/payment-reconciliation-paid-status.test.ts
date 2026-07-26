// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const sqlMock = vi.fn()
const listInvoicesMock = vi.fn()
const listCheckoutsMock = vi.fn()
const cronSuccessMock = vi.fn()

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    invoices: { list: listInvoicesMock },
    checkout: { sessions: { list: listCheckoutsMock } },
  },
}))
vi.mock("@/lib/cron-logger", () => ({
  createCronLogger: () => ({
    start: vi.fn(),
    success: cronSuccessMock,
    error: vi.fn(),
  }),
}))
vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

describe("payment reconciliation payment truth", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.CRON_SECRET = "cron-secret"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    listInvoicesMock.mockResolvedValue({
      data: [
        {
          id: "in_recovered_123",
          livemode: true,
          amount_paid: 9700,
          created: Math.floor(Date.now() / 1000) - 7200,
          currency: "usd",
          customer_email: "member@example.com",
          status_transitions: { paid_at: Math.floor(Date.now() / 1000) - 7100 },
        },
      ],
      has_more: false,
    })
    listCheckoutsMock.mockResolvedValue({ data: [], has_more: false })
    sqlMock.mockResolvedValue([])
  })

  it("does not let an earlier failed marker satisfy a paid-invoice reconciliation", async () => {
    const { GET } = await import("@/app/api/cron/payment-reconciliation/route")
    const response = await GET(
      new NextRequest("https://sselfie.ai/api/cron/payment-reconciliation?dryRun=1", {
        headers: { authorization: "Bearer cron-secret" },
      })
    )

    const invoiceLookup = sqlMock.mock.calls.find(([strings]) =>
      strings.join(" ").includes("stripe_invoice_id")
    )
    expect(invoiceLookup?.[0].join(" ")).toContain("status IN ('paid', 'succeeded')")
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      dryRun: true,
      missing: [expect.objectContaining({ stripeId: "in_recovered_123" })],
    })
  })

  it("flags a recorded Starter Kit payment when access was never fulfilled", async () => {
    listInvoicesMock.mockResolvedValue({ data: [], has_more: false })
    listCheckoutsMock.mockResolvedValue({
      data: [
        {
          id: "cs_starter_kit_unfulfilled",
          livemode: true,
          mode: "payment",
          payment_status: "paid",
          amount_total: 3700,
          created: Math.floor(Date.now() / 1000) - 7200,
          currency: "usd",
          payment_intent: "pi_starter_kit_unfulfilled",
          customer_details: { email: "starter@example.com" },
          metadata: { product_type: "starter_kit", source: "email" },
        },
      ],
      has_more: false,
    })
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM stripe_payments")) {
        return [{ id: 1482, user_id: null }]
      }
      return []
    })

    const { GET } = await import("@/app/api/cron/payment-reconciliation/route")
    const response = await GET(
      new NextRequest("https://sselfie.ai/api/cron/payment-reconciliation?dryRun=1", {
        headers: { authorization: "Bearer cron-secret" },
      })
    )

    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      dryRun: true,
      missing: [
        expect.objectContaining({
          kind: "starter_kit_fulfillment",
          stripeId: "cs_starter_kit_unfulfilled",
        }),
      ],
    })
  })
})
