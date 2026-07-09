// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const getDbMock = vi.fn(() => sqlMock)
const sendNewsletterBroadcastMock = vi.fn()
const cronStartMock = vi.fn()
const cronSuccessMock = vi.fn()
const cronErrorMock = vi.fn()
const lockReleaseMock = vi.fn()
const acquireCronLockMock = vi.fn()

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}))

vi.mock("@/lib/email/send-newsletter-broadcast", () => ({
  sendNewsletterBroadcast: sendNewsletterBroadcastMock,
}))

vi.mock("@/lib/cron-logger", () => ({
  createCronLogger: () => ({
    start: cronStartMock,
    success: cronSuccessMock,
    error: cronErrorMock,
  }),
}))

vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: acquireCronLockMock,
}))

describe("GET /api/cron/send-scheduled-newsletters authentication", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NODE_ENV = "test"
    process.env.CRON_SECRET = "cron-secret"

    sqlMock.mockResolvedValue([])
    acquireCronLockMock.mockResolvedValue({
      acquired: true,
      release: lockReleaseMock,
    })
  })

  it("fails closed when CRON_SECRET is not configured and never acquires the send lock", async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import("@/app/api/cron/send-scheduled-newsletters/route")
    const response = await GET(
      new Request("http://localhost/api/cron/send-scheduled-newsletters") as never
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: "CRON_SECRET not configured" })
    expect(acquireCronLockMock).not.toHaveBeenCalled()
    expect(getDbMock).not.toHaveBeenCalled()
    expect(sendNewsletterBroadcastMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid bearer token before acquiring the send lock", async () => {
    const { GET } = await import("@/app/api/cron/send-scheduled-newsletters/route")
    const response = await GET(
      new Request("http://localhost/api/cron/send-scheduled-newsletters", {
        headers: { authorization: "Bearer wrong-secret" },
      }) as never
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: "Unauthorized" })
    expect(acquireCronLockMock).not.toHaveBeenCalled()
    expect(getDbMock).not.toHaveBeenCalled()
    expect(sendNewsletterBroadcastMock).not.toHaveBeenCalled()
  })

  it("checks approved campaigns only after successful authentication", async () => {
    const { GET } = await import("@/app/api/cron/send-scheduled-newsletters/route")
    const response = await GET(
      new Request("http://localhost/api/cron/send-scheduled-newsletters", {
        headers: { authorization: "Bearer cron-secret" },
      }) as never
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(acquireCronLockMock).toHaveBeenCalledWith("send-scheduled-newsletters", 20 * 60)
    expect(getDbMock).toHaveBeenCalledTimes(1)
    expect(lockReleaseMock).toHaveBeenCalledTimes(1)
  })
})
