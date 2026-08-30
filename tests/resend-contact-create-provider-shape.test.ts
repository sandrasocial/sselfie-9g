// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isAppUnsubscribed: vi.fn(),
  hasResendApiKey: vi.fn(),
}))

vi.mock("@/lib/email/unsubscribe", () => ({
  isAppUnsubscribed: mocks.isAppUnsubscribed,
}))

vi.mock("@/lib/resend/api-key", () => ({
  hasResendApiKey: mocks.hasResendApiKey,
}))

vi.mock("@/lib/resend/client", async () => {
  const { Resend } = await vi.importActual<typeof import("resend")>("resend")
  const client = new Resend("re_provider_shape_test")
  return { requireResendClient: () => client }
})

const mainSegmentId = "78261eea-8f8b-4381-83c6-79fa7120f1cf"
const originalMainSegmentId = process.env.RESEND_AUDIENCE_ID
const originalDisableTestEmails = process.env.RESEND_DISABLE_TEST_EMAILS

describe("Resend new-contact provider request shape", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasResendApiKey.mockReturnValue(true)
    mocks.isAppUnsubscribed.mockResolvedValue(false)
    process.env.RESEND_AUDIENCE_ID = mainSegmentId
    process.env.RESEND_DISABLE_TEST_EMAILS = "false"
  })

  afterAll(() => {
    if (originalMainSegmentId === undefined) delete process.env.RESEND_AUDIENCE_ID
    else process.env.RESEND_AUDIENCE_ID = originalMainSegmentId
    if (originalDisableTestEmails === undefined) delete process.env.RESEND_DISABLE_TEST_EMAILS
    else process.env.RESEND_DISABLE_TEST_EMAILS = originalDisableTestEmails
  })

  it("serializes contact creation without an inline segment id, then uses the segment endpoint", async () => {
    const requests: Array<{ url: string; method: string; body?: unknown }> = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method || "GET"
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
      requests.push({ url, method, body })

      if (method === "GET" && url.includes("/contacts/")) {
        return new Response(
          JSON.stringify({ name: "not_found", message: "Contact not found", statusCode: 404 }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }
      if (method === "POST" && url.endsWith("/contacts")) {
        return Response.json({
          object: "contact",
          id: "479e3145-dd38-476b-932c-529ceb705947",
        })
      }
      if (method === "POST" && url.includes("/segments/")) {
        return Response.json({ id: mainSegmentId })
      }
      return new Response("Unexpected request", { status: 500 })
    })

    const { addOrUpdateResendContact } = await import("@/lib/resend/manage-contact")
    const result = await addOrUpdateResendContact(
      "provider-shape@example.org",
      "Provider",
      {
        source: "freebie-selfie-guide",
        status: "lead",
        product: "sselfie-guide",
        journey: "nurture",
      },
      { requestIntervalMs: 0 }
    )

    expect(result).toEqual({
      success: true,
      contactId: "479e3145-dd38-476b-932c-529ceb705947",
    })
    expect(requests).toHaveLength(3)
    expect(requests[1]).toMatchObject({
      url: "https://api.resend.com/contacts",
      method: "POST",
      body: {
        email: "provider-shape@example.org",
        first_name: "Provider",
        properties: {
          acquisition_path: "selfie_guide",
          lifecycle_stage: "lead",
          primary_interest: "selfies",
        },
      },
    })
    expect(requests[1]?.body).not.toHaveProperty("segments")
    expect(requests[2]).toMatchObject({
      url: `https://api.resend.com/contacts/provider-shape@example.org/segments/${mainSegmentId}`,
      method: "POST",
    })
  })
})
