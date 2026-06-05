// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const sendEmailMock = vi.fn()
const cronStartMock = vi.fn()
const cronSuccessMock = vi.fn()
const cronErrorMock = vi.fn()

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

describe("GET /api/cron/ai-photoshoot-nurture", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = "test"
    process.env.CRON_SECRET = "cron-secret"
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    process.env.AI_PROMPTS_NURTURE_ENABLED = "true"
    process.env.PROMPT_VAULT_NURTURE_ENABLED = ""
    process.env.AI_PHOTOSHOOT_NURTURE_MAX_PER_TOUCH = "10"
    process.env.AI_PHOTOSHOOT_NURTURE_MAX_TOTAL_PER_RUN = "10"
    process.env.AI_PHOTOSHOOT_NURTURE_SEND_DELAY_MS = "1"
    process.env.AI_PHOTOSHOOT_NURTURE_MIN_TOUCH_GAP_HOURS = "18"
  })

  it("runs the current AI prompts money path without depending on the legacy nurture backlog", async () => {
    const queries: string[] = []
    let queryCount = 0

    sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = renderTaggedTemplate(strings, values)
      queries.push(query)
      queryCount += 1

      if (queryCount === 1) {
        return [
          {
            email: "buyer@example.com",
            name: "Wendy",
            access_token: "free-token",
            created_at: "2026-06-01T10:00:00.000Z",
          },
        ]
      }

      return []
    })

    sendEmailMock.mockResolvedValue({ success: true, messageId: "email_123" })

    const { GET } = await import("@/app/api/cron/ai-photoshoot-nurture/route")
    const response = await GET(new Request("http://localhost/api/cron/ai-photoshoot-nurture"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.aiPromptsEnabled).toBe(true)
    expect(body.promptVaultEnabled).toBe(false)
    expect(body.totalSent).toBe(1)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        emailType: "ai-prompts-day1-vault-bridge",
        marketing: true,
        tags: expect.arrayContaining(["ai-prompts", "ai-photoshoot-nurture"]),
      }),
    )
    expect(cronStartMock).toHaveBeenCalledTimes(1)
    expect(cronSuccessMock).toHaveBeenCalledTimes(1)
    expect(cronErrorMock).not.toHaveBeenCalled()

    expect(queries.length).toBeGreaterThan(0)
    expect(queries.join("\n")).toContain("fs.source = 'ai-prompts'")
    expect(queries.join("\n")).not.toContain("freebie-guide-day1-light-tip")
  })
})
