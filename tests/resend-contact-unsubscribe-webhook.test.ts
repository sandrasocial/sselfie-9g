// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }))

vi.mock("@/lib/db/client", () => ({ sql: mockSql }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }))
vi.mock("resend", () => ({
  Resend: class {
    webhooks = {
      verify: ({ payload }: { payload: string }) => JSON.parse(payload),
    }
  },
}))

const RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("resend_contact_update_test").toString("base64")}`

function signedRequest(payload: string) {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_contact_update_test",
      "svix-timestamp": "1785958200",
      "svix-signature": "v1,test-signature",
    },
  })
}

describe("Resend contact unsubscribe webhook", () => {
  beforeEach(() => {
    vi.resetModules()
    mockSql.mockReset()
    mockSql.mockResolvedValue([])
    process.env.RESEND_WEBHOOK_SECRET = RESEND_WEBHOOK_SECRET
  })

  it("records an unsubscribed contact update as an attributed unsubscribe event", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route")
    const payload = JSON.stringify({
      type: "contact.updated",
      created_at: "2026-08-05T19:30:00.000Z",
      data: {
        id: "contact_1",
        audience_id: "audience_1",
        segment_ids: [],
        created_at: "2026-01-01T10:00:00.000Z",
        updated_at: "2026-08-05T19:30:00.000Z",
        email: "subscriber@example.com",
        unsubscribed: true,
      },
    })

    const response = await POST(signedRequest(payload) as any)
    const json = await response.json()
    const sqlValues = mockSql.mock.calls.flatMap(call => call.slice(1))
    const sqlText = mockSql.mock.calls
      .map(call => Array.from(call[0] as TemplateStringsArray).join("?"))
      .join("\n")

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      received: true,
      eventType: "contact.updated",
      unsubscribedTracked: true,
    })
    expect(sqlValues).toContain("email.unsubscribed")
    expect(sqlText).toContain("::timestamptz")
  })
})
