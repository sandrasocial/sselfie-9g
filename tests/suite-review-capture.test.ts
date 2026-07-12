// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authUser: {
    id: "auth-real",
    email: "real@example.com",
    user_metadata: { name: "Spoof-proof auth name" },
  } as any,
  neonUser: {
    id: "neon-real",
    email: "real@example.com",
    display_name: "Real Customer",
  } as any,
  sql: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  sendEmail: vi.fn(),
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mocks.authUser }, error: null })),
    },
  })),
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: vi.fn(async () => mocks.neonUser),
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: mocks.logAnalyticsEvent,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/admin-feature-flags", () => ({
  requireAdmin: mocks.requireAdmin,
}))

function queryText(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray
  return Array.from(strings).join("__VALUE__")
}

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("SUITE post-success review capture", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sql.mockReset()
    mocks.authUser = {
      id: "auth-real",
      email: "real@example.com",
      user_metadata: { name: "Spoof-proof auth name" },
    }
    mocks.neonUser = {
      id: "neon-real",
      email: "real@example.com",
      display_name: "Real Customer",
    }
    mocks.logAnalyticsEvent.mockResolvedValue({ ok: true })
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "email-1" })
    mocks.requireAdmin.mockResolvedValue({ isAdmin: true, userId: "admin-1" })
  })

  it("requires authentication before recording a download or revealing eligibility", async () => {
    mocks.authUser = null

    const { POST } = await import("@/app/api/testimonials/eligibility/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/eligibility", {
        action: "download",
        source: "concept-card",
      }) as any,
    )

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.logAnalyticsEvent).not.toHaveBeenCalled()
  })

  it("requires authentication before accepting a review submission", async () => {
    mocks.authUser = null

    const { POST } = await import("@/app/api/testimonials/submit/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "This is a real result I loved.",
        rating: 5,
        consent: true,
      }) as any,
    )

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("becomes eligible only after at least three SUITE downloads", async () => {
    mocks.sql
      .mockResolvedValueOnce([
        {
          download_count: 3,
          prior_submission: false,
          recent_dismissal: false,
          recent_prompt: false,
        },
      ])

    const { POST } = await import("@/app/api/testimonials/eligibility/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/eligibility", {
        action: "download",
        source: "concept-card",
        format: "photo",
      }) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ eligible: true, downloadCount: 3 })
    expect(mocks.logAnalyticsEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ eventName: "suite_image_downloaded", userId: "neon-real" }),
    )
    expect(mocks.logAnalyticsEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ eventName: "suite_review_prompt_shown", userId: "neon-real" }),
    )
  })

  it("suppresses a prior submission and a recent dismissal", async () => {
    mocks.sql
      .mockResolvedValueOnce([
        {
          download_count: 8,
          prior_submission: true,
          recent_dismissal: false,
          recent_prompt: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          download_count: 8,
          prior_submission: false,
          recent_dismissal: true,
          recent_prompt: false,
        },
      ])

    const { POST } = await import("@/app/api/testimonials/eligibility/route")
    const request = () =>
      jsonRequest("http://localhost/api/testimonials/eligibility", {
        action: "download",
        source: "gallery",
      }) as any

    expect(await (await POST(request())).json()).toMatchObject({ eligible: false, reason: "already_submitted" })
    expect(await (await POST(request())).json()).toMatchObject({ eligible: false, reason: "recently_dismissed" })
  })

  it("requires explicit consent and strict rating/text limits", async () => {
    const { POST } = await import("@/app/api/testimonials/submit/route")

    const noConsent = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "This is a real result I loved.",
        rating: 5,
        consent: false,
      }) as any,
    )
    const invalidRating = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "This is a real result I loved.",
        rating: 6,
        consent: true,
      }) as any,
    )
    const tooShort = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "Nice",
        rating: 5,
        consent: true,
      }) as any,
    )

    expect(noConsent.status).toBe(400)
    expect(invalidRating.status).toBe(400)
    expect(tooShort.status).toBe(400)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("rejects a direct submission before the third authenticated download", async () => {
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ download_count: 2 }])

    const { POST } = await import("@/app/api/testimonials/submit/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "This is a real result I loved.",
        rating: 5,
        consent: true,
      }) as any,
    )

    expect(response.status).toBe(403)
    expect(mocks.sql.mock.calls.some(call => queryText(call).includes("INSERT INTO admin_testimonials"))).toBe(false)
  })

  it("ignores public identity fields and stores only the authenticated customer", async () => {
    mocks.sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ download_count: 3 }])
      .mockResolvedValueOnce([{ id: 77 }])

    const { POST } = await import("@/app/api/testimonials/submit/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        name: "Spoofed Name",
        email: "spoofed@example.com",
        testimonial: "I downloaded the photos and finally had something I wanted to post.",
        rating: 5,
        consent: true,
      }) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, alreadySubmitted: false })

    const insertCall = mocks.sql.mock.calls.find(call => queryText(call).includes("INSERT INTO admin_testimonials"))
    expect(insertCall).toBeTruthy()
    expect(insertCall).toContain("Real Customer")
    expect(insertCall).toContain("real@example.com")
    expect(insertCall).not.toContain("Spoofed Name")
    expect(insertCall).not.toContain("spoofed@example.com")
    expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "suite_review_submitted", userId: "neon-real" }),
    )
  })

  it("treats a second submission as idempotent success", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: 88 }])

    const { POST } = await import("@/app/api/testimonials/submit/route")
    const response = await POST(
      jsonRequest("http://localhost/api/testimonials/submit", {
        testimonial: "I downloaded the photos and finally had something I wanted to post.",
        rating: 5,
        consent: true,
      }) as any,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, alreadySubmitted: true, testimonialId: 88 })
    expect(mocks.sql.mock.calls.some(call => queryText(call).includes("INSERT INTO admin_testimonials"))).toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("uses the authenticated admin endpoint for manual proof", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: 99, customer_name: "Manual Customer" }])

    const { POST } = await import("@/app/api/admin/testimonials/route")
    const response = await POST(
      jsonRequest("http://localhost/api/admin/testimonials", {
        customer_name: "Manual Customer",
        customer_email: "manual@example.com",
        testimonial_text: "A customer result added from an attended email conversation.",
        rating: 5,
        source: "email",
        screenshot_url: null,
      }) as any,
    )

    expect(response.status).toBe(201)
    expect(mocks.requireAdmin).toHaveBeenCalled()
    expect(mocks.sql.mock.calls.some(call => queryText(call).includes("INSERT INTO admin_testimonials"))).toBe(true)
  })
})
