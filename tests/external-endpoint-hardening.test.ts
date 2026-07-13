// @vitest-environment node
import { readFileSync } from "node:fs"
import { Webhook } from "svix"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()
const mockRetrieveSession = vi.fn()
const mockGetUserById = vi.fn()
const mockUpdateUserById = vi.fn()
const mockCheckRateLimit = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: mockRetrieveSession,
      },
    },
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: mockGetUserById,
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}))

vi.mock("@/lib/rate-limit-api", () => ({
  checkRateLimit: mockCheckRateLimit,
}))

const RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("resend_test_secret_for_signature_checks").toString("base64")}`

function signedResendRequest(payload: string, secret = RESEND_WEBHOOK_SECRET) {
  const webhook = new Webhook(secret)
  const timestamp = new Date()
  const id = "msg_resend_test"
  const signature = webhook.sign(id, timestamp, payload)

  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "svix-signature": signature,
    },
  })
}

describe("external endpoint hardening", () => {
  beforeEach(() => {
    vi.resetModules()
    mockSql.mockReset()
    mockRetrieveSession.mockReset()
    mockGetUserById.mockReset()
    mockUpdateUserById.mockReset()
    mockCheckRateLimit.mockReset()
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Math.ceil(Date.now() / 1000) + 3600,
    })
    mockUpdateUserById.mockResolvedValue({ error: null })
    delete process.env.RESEND_WEBHOOK_SECRET
    delete process.env.RESEND_API_KEY
  })

  it("rejects unsigned Resend webhooks when RESEND_WEBHOOK_SECRET is configured", async () => {
    process.env.RESEND_WEBHOOK_SECRET = RESEND_WEBHOOK_SECRET
    const { POST } = await import("@/app/api/webhooks/resend/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({ type: "email.delivered", data: { email_id: "em_1" } }),
        headers: { "content-type": "application/json" },
      }) as any,
    )

    expect(response.status).toBe(401)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it("rejects invalid Resend Svix signatures before processing the event body", async () => {
    process.env.RESEND_WEBHOOK_SECRET = RESEND_WEBHOOK_SECRET
    const { POST } = await import("@/app/api/webhooks/resend/route")

    const response = await POST(
      new Request("http://localhost/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({ type: "email.delivered", data: { email_id: "em_1" } }),
        headers: {
          "content-type": "application/json",
          "svix-id": "msg_bad",
          "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
          "svix-signature": "v1,bad",
        },
      }) as any,
    )

    expect(response.status).toBe(401)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it("accepts a valid signed Resend webhook and processes only after raw-body verification", async () => {
    process.env.RESEND_WEBHOOK_SECRET = RESEND_WEBHOOK_SECRET
    mockSql.mockResolvedValue([])
    const { POST } = await import("@/app/api/webhooks/resend/route")
    const payload = JSON.stringify({
      type: "email.delivered",
      data: {
        email_id: "em_valid",
        email: "buyer@example.com",
      },
    })

    const response = await POST(signedResendRequest(payload) as any)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ received: true, eventType: "email.delivered" })
    expect(mockSql).toHaveBeenCalled()
  })

  it("retires arbitrary public user-by-email lookups", async () => {
    const { GET } = await import("@/app/api/user-by-email/route")

    const response = await GET(new Request("http://localhost/api/user-by-email?email=person@example.com"))
    const json = await response.json()

    expect(response.status).toBe(410)
    expect(json).toEqual({ error: "Endpoint retired" })
  })

  it("returns only checkout-session scoped email and hasAccount state", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_test_123",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
    })
    mockSql.mockResolvedValue([
      {
        email: "buyer@example.com",
        supabase_user_id: "auth_new_buyer",
        password_setup_complete: false,
      },
    ])
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_new_buyer",
          app_metadata: { account_setup_checkout_session_id: "cs_test_123" },
          last_sign_in_at: null,
        },
      },
      error: null,
    })
    const { GET } = await import("@/app/api/checkout/user-status/route")

    const response = await GET(new Request("http://localhost/api/checkout/user-status?session_id=cs_test_123"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ userInfo: { email: "buyer@example.com", hasAccount: false } })
    expect(JSON.stringify(json)).not.toContain("credits")
    expect(JSON.stringify(json)).not.toContain("productType")
  })

  it("keeps checkout user status pending until the webhook-created user row exists", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_test_pending",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
    })
    mockSql.mockResolvedValue([])
    const { GET } = await import("@/app/api/checkout/user-status/route")

    const response = await GET(new Request("http://localhost/api/checkout/user-status?session_id=cs_test_pending"))
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json).toEqual({ userInfo: null })
  })

  it("requires a paid checkout session before completing a buyer account", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_test_unpaid",
      status: "complete",
      payment_status: "unpaid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      new Request("http://localhost/api/complete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: "cs_test_unpaid",
          password: "safe-password-123",
          name: "Buyer",
        }),
      }) as any,
    )

    expect(response.status).toBe(403)
    expect(mockSql).not.toHaveBeenCalled()
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it("derives the account email from Stripe and completes only a first-time paid setup", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_live_bundle",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "Buyer@Example.com" },
      customer_email: null,
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mockSql
      .mockResolvedValueOnce([
        {
          id: "neon_user_1",
          supabase_user_id: "auth_user_1",
          password_setup_complete: false,
        },
      ])
      .mockResolvedValueOnce([])
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_user_1",
          app_metadata: {
            account_setup_checkout_session_id: "cs_live_bundle",
          },
        },
      },
      error: null,
    })
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      new Request("http://localhost/api/complete-account", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
        body: JSON.stringify({
          session_id: "cs_live_bundle",
          email: "attacker-controlled@example.com",
          password: "safe-password-123",
          name: "Buyer",
        }),
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(mockRetrieveSession).toHaveBeenCalledWith("cs_live_bundle")
    expect(mockUpdateUserById).toHaveBeenCalledWith("auth_user_1", {
      password: "safe-password-123",
      email_confirm: true,
      app_metadata: {},
    })
    expect(mockSql).toHaveBeenCalledTimes(2)
  })

  it("refuses to reset an account that already completed password setup", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_live_old",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "selfie_visibility_bundle" },
    })
    mockSql.mockResolvedValueOnce([
      {
        id: "neon_user_1",
        supabase_user_id: "auth_user_1",
        password_setup_complete: true,
      },
    ])
    const { POST } = await import("@/app/api/complete-account/route")

    const response = await POST(
      new Request("http://localhost/api/complete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: "cs_live_old",
          password: "new-password-123",
          name: "Buyer",
        }),
      }) as any,
    )

    expect(response.status).toBe(409)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it("rejects unsupported checkout products and rate-limited setup attempts", async () => {
    mockRetrieveSession.mockResolvedValue({
      id: "cs_live_unknown",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "buyer@example.com" },
      metadata: { product_type: "unknown_product" },
    })
    const { POST } = await import("@/app/api/complete-account/route")
    const request = () =>
      new Request("http://localhost/api/complete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: "cs_live_unknown",
          password: "safe-password-123",
          name: "Buyer",
        }),
      }) as any

    expect((await POST(request())).status).toBe(403)

    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Math.ceil(Date.now() / 1000) + 3600,
    })
    expect((await POST(request())).status).toBe(429)
  })

  it("removes public email enumeration from checkout success and signup clients", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")
    const signUpPage = readFileSync("app/auth/sign-up/page.tsx", "utf8")
    const checkoutPage = readFileSync("app/checkout/page.tsx", "utf8")
    const buyBlueprintModal = readFileSync("components/sselfie/buy-blueprint-modal.tsx", "utf8")

    expect(successContent).toContain("/api/checkout/user-status?session_id=")
    expect(successContent).not.toContain("/api/user-by-email?email=")
    expect(signUpPage).not.toContain("/api/user-by-email?email=")
    expect(checkoutPage).not.toContain("&email=")
    expect(buyBlueprintModal).not.toContain("&email=")
  })

  it("removes the middleware-wide x-cron-secret bypass while preserving route-level cron routes", () => {
    const middleware = readFileSync("middleware.ts", "utf8")

    expect(middleware).not.toContain('request.headers.get("x-cron-secret") === process.env.CRON_SECRET')
    expect(middleware).toContain('prefix: "/api/cron/"')
    expect(middleware).toContain("PUBLIC_MIDDLEWARE_BYPASSES")
  })
})
