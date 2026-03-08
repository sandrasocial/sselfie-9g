// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const retrieveSessionMock = vi.fn()
const getUserMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: retrieveSessionMock,
      },
    },
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

describe("GET /api/selfie-guide/access-token", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("resolves guide access from session_id without requiring a logged-in user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    retrieveSessionMock.mockResolvedValue({
      id: "cs_123",
      status: "complete",
      payment_status: "paid",
      customer_details: {
        email: "buyer@example.com",
        name: "Buyer Example",
      },
      customer_email: "buyer@example.com",
      metadata: {
        product_type: "selfie_guide",
      },
    })

    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("SELECT id, access_token, email_tags") && query.includes("FROM freebie_subscribers")) {
        return [
          {
            id: 42,
            access_token: "guide_access_token",
            email_tags: ["freebie-subscriber"],
          },
        ]
      }

      if (query.includes("UPDATE freebie_subscribers")) {
        return []
      }

      return []
    })

    const { GET } = await import("@/app/api/selfie-guide/access-token/route")
    const response = await GET(new Request("http://localhost/api/selfie-guide/access-token?session_id=cs_123"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.accessToken).toBe("guide_access_token")
    expect(retrieveSessionMock).toHaveBeenCalledWith("cs_123")
  })

  it("rejects unrelated checkout sessions", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    retrieveSessionMock.mockResolvedValue({
      id: "cs_other",
      status: "complete",
      payment_status: "paid",
      customer_email: "buyer@example.com",
      metadata: {
        product_type: "one_time_session",
      },
    })

    const { GET } = await import("@/app/api/selfie-guide/access-token/route")
    const response = await GET(new Request("http://localhost/api/selfie-guide/access-token?session_id=cs_other"))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toMatch(/guide access/i)
  })

  it("preserves the authenticated email fallback when no session_id is provided", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          email: "member@example.com",
        },
      },
    })

    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")

      if (query.includes("SELECT access_token") && query.includes("FROM freebie_subscribers")) {
        return [{ access_token: "member_token" }]
      }

      return []
    })

    const { GET } = await import("@/app/api/selfie-guide/access-token/route")
    const response = await GET(new Request("http://localhost/api/selfie-guide/access-token"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.accessToken).toBe("member_token")
  })
})
