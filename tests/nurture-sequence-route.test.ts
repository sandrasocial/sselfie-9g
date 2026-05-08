// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const cronStartMock = vi.fn()
const cronSuccessMock = vi.fn()
const cronErrorMock = vi.fn()
const logAdminErrorMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/cron-logger", () => ({
  createCronLogger: () => ({
    start: cronStartMock,
    success: cronSuccessMock,
    error: cronErrorMock,
  }),
}))

vi.mock("@/lib/admin-error-log", () => ({
  logAdminError: logAdminErrorMock,
}))

function renderTaggedTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  let output = ""

  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index]
    if (index < values.length) {
      output += typeof values[index] === "string" ? values[index] : `__value_${index}__`
    }
  }

  return output
}

describe("GET /api/cron/nurture-sequence", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = "test"
    process.env.CRON_SECRET = "cron-secret"
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
  })

  it("builds nurture queries without the removed users.name column or the legacy UNION shape", async () => {
    const queries: string[] = []

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push(renderTaggedTemplate(strings, values))
      return []
    })

    const { GET } = await import("@/app/api/cron/nurture-sequence/route")
    const response = await GET(new Request("http://localhost/api/cron/nurture-sequence"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalSent).toBe(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(cronStartMock).toHaveBeenCalledTimes(1)
    expect(cronSuccessMock).toHaveBeenCalledTimes(1)
    expect(cronErrorMock).not.toHaveBeenCalled()

    expect(queries).toHaveLength(22)

    for (const query of queries) {
      expect(query).not.toContain("u.name")
      expect(query).not.toContain("UNION")
    }

    const selfieGuideQueries = queries.slice(0, 5)
    const starterKitQueries = queries.slice(5, 12)
    const masterclassQueries = queries.slice(12, 17)
    const strategyQueries = queries.slice(17)

    for (const query of [...selfieGuideQueries, ...starterKitQueries]) {
      expect(query).toContain("COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name")
    }

    for (const query of masterclassQueries) {
      expect(query).toContain("NULLIF(BTRIM(u.display_name), '') AS name")
      expect(query).toContain("s.product_type = 'masterclass'")
    }

    expect(strategyQueries).toHaveLength(5)

    for (const query of strategyQueries) {
      expect(query).toContain("NULLIF(BTRIM(u.display_name), '') AS name")
      expect(query).toContain("fbs.setup_token IS NOT NULL")
    }
  })
})
