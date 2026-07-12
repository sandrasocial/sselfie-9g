// @vitest-environment node

import { readFileSync } from "node:fs"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sql: vi.fn(),
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
}))

vi.mock("@/lib/admin-feature-flags", () => ({
  requireAdmin: mocks.requireAdmin,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mocks.createSession,
        retrieve: mocks.retrieveSession,
      },
    },
  },
}))

import { PATCH, POST } from "@/app/api/admin/work-with-me/route"
import { createWorkWithMeCheckoutLink } from "@/lib/work-with-me/checkout"
import { closeWorkWithMeApplicationForPayment } from "@/lib/work-with-me/pipeline"

describe("Work With Me admin pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_WORK_WITH_ME = "price_work_with_me_2000"
  })

  it("rejects unauthenticated pipeline mutations", async () => {
    mocks.requireAdmin.mockResolvedValue({ isAdmin: false, error: "Not authenticated" })

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/work-with-me", {
        method: "PATCH",
        body: JSON.stringify({ applicationId: 42, action: "contacted" }),
        headers: { "Content-Type": "application/json" },
      }),
    )

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("rejects stages outside the attended Work With Me workflow", async () => {
    mocks.requireAdmin.mockResolvedValue({ isAdmin: true, userId: 1 })

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/work-with-me", {
        method: "PATCH",
        body: JSON.stringify({ applicationId: 42, action: "closed_won" }),
        headers: { "Content-Type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("blocks a stage change when the application is not in an allowed prior stage", async () => {
    mocks.requireAdmin.mockResolvedValue({ isAdmin: true, userId: 1 })
    mocks.sql.mockResolvedValue([])

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/work-with-me", {
        method: "PATCH",
        body: JSON.stringify({ applicationId: 42, action: "call_booked" }),
        headers: { "Content-Type": "application/json" },
      }),
    )

    expect(response.status).toBe(409)
  })

  it("creates only the locked €2,000 attended checkout metadata", async () => {
    mocks.createSession.mockResolvedValue({
      id: "cs_work_with_me_42",
      url: "https://checkout.stripe.com/c/pay/cs_work_with_me_42",
    })

    const result = await createWorkWithMeCheckoutLink({
      applicationId: 42,
      name: "Ada Founder",
      email: "ada@example.com",
      baseUrl: "https://sselfie.ai/",
    })

    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "ada@example.com",
        line_items: [{ price: "price_work_with_me_2000", quantity: 1 }],
        metadata: {
          product_type: "work_with_me",
          source: "work_with_me_paid",
          brand_engine_application_id: "42",
          customer_name: "Ada Founder",
          customer_email: "ada@example.com",
        },
        allow_promotion_codes: false,
      }),
      { idempotencyKey: "work_with_me_application_42" },
    )
    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_work_with_me_42",
      sessionId: "cs_work_with_me_42",
      priceId: "price_work_with_me_2000",
      amountCents: 200000,
    })
  })

  it("reuses only an open, unexpired attended checkout session", async () => {
    mocks.requireAdmin.mockResolvedValue({ isAdmin: true, userId: 1 })
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const statement = strings.join("?")
      if (statement.includes("SELECT id, name, email")) {
        return [{
          id: 42,
          name: "Ada Founder",
          email: "ada@example.com",
          pipeline_stage: "offer_sent",
          checkout_session_id: "cs_open_42",
          checkout_url: "https://checkout.stripe.com/c/pay/cs_open_42",
        }]
      }
      return []
    })
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_open_42",
      status: "open",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      url: "https://checkout.stripe.com/c/pay/cs_open_42",
    })

    const response = await POST(
      new NextRequest("http://localhost/api/admin/work-with-me", {
        method: "POST",
        body: JSON.stringify({ applicationId: 42, action: "create_checkout" }),
        headers: { "Content-Type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_open_42",
      sessionId: "cs_open_42",
      reused: true,
    })
    expect(mocks.retrieveSession).toHaveBeenCalledWith("cs_open_42")
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it("replaces an expired checkout with a stable retry-safe attempt", async () => {
    mocks.requireAdmin.mockResolvedValue({ isAdmin: true, userId: 1 })
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      const statement = strings.join("?")
      if (statement.includes("SELECT id, name, email")) {
        return [{
          id: 42,
          name: "Ada Founder",
          email: "ada@example.com",
          pipeline_stage: "offer_sent",
          checkout_session_id: "cs_expired_42",
          checkout_url: "https://checkout.stripe.com/c/pay/cs_expired_42",
        }]
      }
      if (statement.includes("UPDATE brand_engine_applications")) return [{ id: 42 }]
      return []
    })
    mocks.retrieveSession.mockResolvedValue({
      id: "cs_expired_42",
      status: "expired",
      expires_at: Math.floor(Date.now() / 1000) - 60,
      url: null,
    })
    mocks.createSession.mockResolvedValue({
      id: "cs_replacement_42",
      url: "https://checkout.stripe.com/c/pay/cs_replacement_42",
    })

    const request = () => POST(
      new NextRequest("http://localhost/api/admin/work-with-me", {
        method: "POST",
        body: JSON.stringify({ applicationId: 42, action: "create_checkout" }),
        headers: { "Content-Type": "application/json" },
      }),
    )

    const first = await request()
    const retry = await request()

    expect(first.status).toBe(200)
    expect(retry.status).toBe(200)
    expect(mocks.createSession).toHaveBeenCalledTimes(2)
    expect(mocks.createSession.mock.calls.map((call) => call[1])).toEqual([
      { idempotencyKey: "work_with_me_application_42_after_cs_expired_42" },
      { idempotencyKey: "work_with_me_application_42_after_cs_expired_42" },
    ])
    await expect(first.json()).resolves.toMatchObject({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_replacement_42",
      sessionId: "cs_replacement_42",
      reused: false,
    })
  })

  it("closes the matching Work With Me application without double-counting cash", async () => {
    mocks.sql.mockResolvedValue([{ id: 42 }])

    const result = await closeWorkWithMeApplicationForPayment(mocks.sql, {
      applicationId: 42,
      amountCents: 200000,
      checkoutSessionId: "cs_paid_42",
    })

    expect(result).toEqual({ updated: true, applicationId: 42 })
    const [strings, ...values] = mocks.sql.mock.calls[0]
    const statement = strings.join("?")
    expect(statement).toContain("pipeline_stage = 'closed_won'")
    expect(statement).toContain("cash_collected_cents = GREATEST")
    expect(statement).toContain("offer_type = 'work_with_me'")
    expect(statement).toContain("checkout_session_id = COALESCE")
    expect(values).toContain(200000)
    expect(values).toContain("cs_paid_42")
  })

  it("wires successful Work With Me fulfillment to application closure", () => {
    const handler = readFileSync("lib/payments/handlers/work-with-me.ts", "utf8")

    expect(handler).toContain("closeWorkWithMeApplicationForPayment")
    expect(handler).toContain("brand_engine_application_id")
  })

  it("replaces the Brand Shoot admin monitor with the attended Work With Me pipeline", () => {
    const tools = readFileSync("app/admin/tools/page.tsx", "utf8")
    const commandCenter = readFileSync("lib/admin/higher-self-command-center.ts", "utf8")
    const retiredMonitor = readFileSync("app/admin/selfie-to-brand-shoot/page.tsx", "utf8")

    expect(tools).toContain('href: "/admin/work-with-me"')
    expect(tools).not.toContain('href: "/admin/selfie-to-brand-shoot"')
    expect(commandCenter).toContain('href: "/admin/work-with-me"')
    expect(retiredMonitor).toContain('redirect("/admin/work-with-me")')
  })

  it("keeps checkout creation attended and does not send the link automatically", () => {
    const route = readFileSync("app/api/admin/work-with-me/route.ts", "utf8")
    const pipeline = readFileSync("components/admin/work-with-me-pipeline.tsx", "utf8")

    expect(route).not.toContain("sendEmail")
    expect(route).toContain("checkoutUrl")
    expect(route).toContain('body.action !== "create_checkout"')
    expect(pipeline).toContain("onClick={() => createCheckout(application.id)}")
    expect(pipeline).not.toContain("copyExisting")
    expect(pipeline).not.toContain("value={application.checkout_url}")
  })
})
