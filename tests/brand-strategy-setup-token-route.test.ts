// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const retrieveSessionMock = vi.fn()

process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK = "price_brand_strategy"

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

describe("GET /api/brand-strategy/setup-token", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("resolves a setup token for a direct brand strategy purchase", async () => {
    retrieveSessionMock.mockResolvedValue({
      id: "cs_brand_strategy",
      status: "complete",
      payment_status: "paid",
      customer: "cus_123",
      customer_details: { email: "buyer@example.com" },
      metadata: {
        product_type: "brand_strategy_pack",
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_brand_strategy",
            },
          },
        ],
      },
    })

    sqlMock.mockResolvedValue([{ setup_token: "setup-token-123" }])

    const { GET } = await import("@/app/api/brand-strategy/setup-token/route")
    const response = await GET(new Request("http://localhost/api/brand-strategy/setup-token?session_id=cs_brand_strategy"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.setupToken).toBe("setup-token-123")
  })

  it("resolves a setup token when brand strategy was bought as a Selfie Guide order bump", async () => {
    retrieveSessionMock.mockResolvedValue({
      id: "cs_selfie_guide",
      status: "complete",
      payment_status: "paid",
      customer: "cus_456",
      customer_details: { email: "buyer@example.com" },
      metadata: {
        product_type: "selfie_guide",
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_selfie_guide",
            },
          },
          {
            price: {
              id: "price_brand_strategy",
            },
          },
        ],
      },
    })

    sqlMock.mockResolvedValue([{ setup_token: "setup-token-bump" }])

    const { GET } = await import("@/app/api/brand-strategy/setup-token/route")
    const response = await GET(new Request("http://localhost/api/brand-strategy/setup-token?session_id=cs_selfie_guide"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.setupToken).toBe("setup-token-bump")
  })

  it("returns a syncing state while the webhook is still writing the setup token", async () => {
    retrieveSessionMock.mockResolvedValue({
      id: "cs_pending",
      status: "complete",
      payment_status: "paid",
      customer: "cus_pending",
      customer_details: { email: "buyer@example.com" },
      metadata: {
        product_type: "brand_strategy_pack",
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_brand_strategy",
            },
          },
        ],
      },
    })

    sqlMock.mockResolvedValue([])

    const { GET } = await import("@/app/api/brand-strategy/setup-token/route")
    const response = await GET(new Request("http://localhost/api/brand-strategy/setup-token?session_id=cs_pending"))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toMatch(/syncing/i)
  })

  it("rejects sessions that did not include brand strategy", async () => {
    retrieveSessionMock.mockResolvedValue({
      id: "cs_selfie_only",
      status: "complete",
      payment_status: "paid",
      customer: "cus_selfie",
      customer_details: { email: "buyer@example.com" },
      metadata: {
        product_type: "selfie_guide",
      },
      line_items: {
        data: [
          {
            price: {
              id: "price_selfie_guide",
            },
          },
        ],
      },
    })

    const { GET } = await import("@/app/api/brand-strategy/setup-token/route")
    const response = await GET(new Request("http://localhost/api/brand-strategy/setup-token?session_id=cs_selfie_only"))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toMatch(/brand strategy/i)
  })
})
