// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

describe("ensurePaidSelfieGuideSubscriber", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("falls back to an email-derived name when Stripe does not provide one", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(" ")

      if (query.includes("SELECT id, access_token, email_tags") && query.includes("FROM freebie_subscribers")) {
        return []
      }

      if (query.includes("INSERT INTO freebie_subscribers")) {
        expect(values[1]).toBe("testts")
        return [{ id: 1 }]
      }

      return []
    })

    const { ensurePaidSelfieGuideSubscriber } = await import("@/lib/freebie/selfie-guide-access")
    const result = await ensurePaidSelfieGuideSubscriber("testts@sselfie.ai", null)

    expect(result).toEqual({
      subscriberId: 1,
      accessToken: expect.any(String),
    })
  })
})
