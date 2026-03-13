// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const retrieveSessionMock = vi.fn()
const requireAcademyUserMock = vi.fn()
const getAcademyEntitlementStateMock = vi.fn()
const ensurePaidSelfieGuideSubscriberMock = vi.fn()

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

vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyUser: requireAcademyUserMock,
  academyRouteErrorToResponse: vi.fn().mockReturnValue(null),
}))

vi.mock("@/lib/academy-entitlements", () => ({
  getAcademyEntitlementState: getAcademyEntitlementStateMock,
}))

vi.mock("@/lib/freebie/selfie-guide-access", () => ({
  ensurePaidSelfieGuideSubscriber: ensurePaidSelfieGuideSubscriberMock,
}))

describe("GET /api/selfie-guide/access-token", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("resolves guide access from session_id without requiring a logged-in user", async () => {
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
    ensurePaidSelfieGuideSubscriberMock.mockResolvedValue({
      accessToken: "guide_access_token",
    })

    const { GET } = await import("@/app/api/selfie-guide/access-token/route")
    const response = await GET(
      new Request("http://localhost/api/selfie-guide/access-token?session_id=cs_123")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.accessToken).toBe("guide_access_token")
    expect(retrieveSessionMock).toHaveBeenCalledWith("cs_123")
    expect(ensurePaidSelfieGuideSubscriberMock).toHaveBeenCalledWith(
      "buyer@example.com",
      "Buyer Example"
    )
  })

  it("rejects unrelated checkout sessions", async () => {
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
    const response = await GET(
      new Request("http://localhost/api/selfie-guide/access-token?session_id=cs_other")
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toMatch(/guide access/i)
  })

  it("mints a guide token for an authenticated entitled member when no legacy token exists", async () => {
    requireAcademyUserMock.mockResolvedValue({
      authUser: { id: "auth_1", email: "member@example.com" },
      neonUser: { id: "user_1", email: "member@example.com" },
    })
    getAcademyEntitlementStateMock.mockResolvedValue({
      accessibleProductIds: ["selfie_guide", "brand_strategy_pack"],
    })
    sqlMock.mockResolvedValue([])
    ensurePaidSelfieGuideSubscriberMock.mockResolvedValue({
      accessToken: "member_token",
    })

    const { GET } = await import("@/app/api/selfie-guide/access-token/route")
    const response = await GET(new Request("http://localhost/api/selfie-guide/access-token"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.accessToken).toBe("member_token")
    expect(ensurePaidSelfieGuideSubscriberMock).toHaveBeenCalledWith("member@example.com", null)
  })
})
