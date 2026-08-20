// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const getAcademyExplicitOwnershipMock = vi.fn()

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }))
vi.mock("@/lib/email/recipient-name", () => ({
  getFirstNameForEmail: vi.fn(() => "Owner"),
}))
vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn(() => Promise.resolve()),
}))
vi.mock("@/lib/academy-entitlements", () => ({
  getAcademyExplicitOwnership: getAcademyExplicitOwnershipMock,
}))

function queryText(strings: TemplateStringsArray | string): string {
  return Array.isArray(strings) ? strings.join(" ") : String(strings)
}

describe("Academy access recovery ownership", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    sendEmailMock.mockResolvedValue({ success: true })
    getAcademyExplicitOwnershipMock.mockResolvedValue([])
  })

  async function requestRecovery() {
    const { POST } = await import("@/app/api/access-recovery/route")
    return POST(
      new Request("http://localhost/api/access-recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "owner@example.com" }),
      }) as any
    )
  }

  it("sends the exact gated workbook URL to a course-only historical owner", async () => {
    getAcademyExplicitOwnershipMock.mockResolvedValue([
      {
        productId: "what_to_say",
        purchasedAt: "2026-06-01T00:00:00.000Z",
        sources: ["academy_course_purchase"],
      },
    ])
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM users")) {
        return [
          {
            id: "owner_1",
            email: "owner@example.com",
            name: "Owner",
          },
        ]
      }
      return []
    })

    const response = await requestRecovery()

    expect(response.status).toBe(200)
    expect(getAcademyExplicitOwnershipMock).toHaveBeenCalledWith("owner_1")
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        text: expect.stringContaining("What To Say: https://sselfie.ai/academy/access/what-to-say"),
      })
    )
  })

  it("uses canonical current-Stripe ownership without adding membership products", async () => {
    getAcademyExplicitOwnershipMock.mockResolvedValue([
      {
        productId: "get_paid",
        purchasedAt: "2026-06-01T00:00:00.000Z",
        sources: ["stripe_payment"],
      },
    ])
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM users")) {
        return [
          {
            id: "owner_1",
            email: "owner@example.com",
            name: "Owner",
          },
        ]
      }
      return []
    })

    await requestRecovery()

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Get Paid: https://sselfie.ai/academy/access/get-paid"),
      })
    )
    const email = sendEmailMock.mock.calls[0][0]
    expect(email.text).not.toContain("SSELFIE SUITE")
    expect(email.text).not.toContain("What To Say")
    expect(email.text).not.toContain("Show Up")
  })

  it("keeps its response enumeration-safe when explicit ownership sources are unavailable", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("INSERT INTO email_logs")) return []
      throw new Error("source unavailable")
    })

    const response = await requestRecovery()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("sends one suite link and suppresses expanded workbook rows and unknown IDs", async () => {
    getAcademyExplicitOwnershipMock.mockResolvedValue([
      {
        productId: "visibility_suite",
        purchasedAt: "2026-06-01T00:00:00.000Z",
        sources: ["purchase"],
      },
      {
        productId: "unknown_product",
        purchasedAt: "2026-06-01T00:00:00.000Z",
        sources: ["purchase"],
      },
    ])
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM users")) {
        return [{ id: "owner_1", email: "owner@example.com", name: "Owner" }]
      }
      return []
    })

    await requestRecovery()

    const email = sendEmailMock.mock.calls[0][0]
    expect(email.text).toContain(
      "Legacy Visibility Suite: https://sselfie.ai/academy/access/visibility-suite"
    )
    expect(email.text).not.toContain("What To Say")
    expect(email.text).not.toContain("Show Up")
    expect(email.text).not.toContain("unknown_product")
    expect(email.text).not.toContain("https://sselfie.ai/app")
  })

  it.each([
    ["starter-kit-paid", "starter-token", "https://sselfie.ai/access/starter-kit/starter-token"],
    ["selfie-guide-paid", "guide-token", "https://sselfie.ai/selfie-guide/access/guide-token"],
    [
      "selfie_guide_paid",
      "underscore-token",
      "https://sselfie.ai/selfie-guide/access/underscore-token",
    ],
  ])(
    "preserves the exact token URL for historical %s recovery rows",
    async (source, token, expectedUrl) => {
      sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = queryText(strings)
        if (query.includes("FROM freebie_subscribers")) {
          return [
            {
              product_type: source,
              access_token: token,
              email: "owner@example.com",
              name: "Owner",
              created_at: "2026-06-01T00:00:00.000Z",
            },
          ]
        }
        return []
      })

      await requestRecovery()

      expect(sendEmailMock).toHaveBeenCalledTimes(1)
      expect(sendEmailMock.mock.calls[0][0].text).toContain(expectedUrl)
    }
  )

  it("prefers an encoded historical token over a generic canonical link for the same product", async () => {
    getAcademyExplicitOwnershipMock.mockResolvedValue([
      {
        productId: "prompt_vault",
        purchasedAt: "2026-06-01T00:00:00.000Z",
        sources: ["purchase"],
      },
    ])
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = queryText(strings)
      if (query.includes("FROM users")) {
        return [{ id: "owner_1", email: "owner@example.com", name: "Owner" }]
      }
      if (query.includes("FROM freebie_subscribers")) {
        return [
          {
            product_type: "prompt-vault-paid",
            access_token: "token with/slash",
            email: "owner@example.com",
            name: "Owner",
            created_at: "2026-06-02T00:00:00.000Z",
          },
        ]
      }
      return []
    })

    await requestRecovery()

    const email = sendEmailMock.mock.calls[0][0]
    expect(email.text).toContain("https://sselfie.ai/access/prompt-vault/token%20with%2Fslash")
    expect(email.text).not.toContain(
      "AI Photo Prompt Vault: https://sselfie.ai/academy/access/prompt-vault"
    )
  })
})
