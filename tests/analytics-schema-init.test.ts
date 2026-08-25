// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }))

describe("analytics schema initialization", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getDb.mockReturnValue(mocks.sql)
    mocks.sql.mockResolvedValue([])
  })

  it("makes concurrent callers await the same in-flight initialization", async () => {
    let releaseFirstStatement: (() => void) | undefined
    mocks.sql.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          releaseFirstStatement = resolve
        })
    )

    const { ensureAnalyticsSchema } = await import("@/lib/analytics/schema")
    const first = ensureAnalyticsSchema()
    const second = ensureAnalyticsSchema()

    await vi.waitFor(() => expect(mocks.sql).toHaveBeenCalledTimes(1))
    expect(mocks.getDb).toHaveBeenCalledTimes(1)

    releaseFirstStatement?.()
    await Promise.all([first, second])
    const completedStatementCount = mocks.sql.mock.calls.length

    await ensureAnalyticsSchema()
    expect(mocks.getDb).toHaveBeenCalledTimes(1)
    expect(mocks.sql).toHaveBeenCalledTimes(completedStatementCount)
  })

  it("clears a failed initialization so a later call can retry", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("temporary DDL failure"))

    const { ensureAnalyticsSchema } = await import("@/lib/analytics/schema")
    await expect(ensureAnalyticsSchema()).rejects.toThrow("temporary DDL failure")
    await expect(ensureAnalyticsSchema()).resolves.toBeUndefined()

    expect(mocks.getDb).toHaveBeenCalledTimes(2)
    expect(mocks.sql.mock.calls.length).toBeGreaterThan(1)
  })
})
