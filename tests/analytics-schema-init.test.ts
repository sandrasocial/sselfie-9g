// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

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

  it("makes fresh tables idempotent without runtime index creation on existing tables", () => {
    const runtimeSchema = readFileSync(join(process.cwd(), "lib/analytics/schema.ts"), "utf8")
    const migration = readFileSync(
      join(process.cwd(), "db/migrations/76-add-analytics-event-idempotency.sql"),
      "utf8"
    )

    expect(runtimeSchema).not.toContain(
      "ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS idempotency_key"
    )
    expect(runtimeSchema).toContain(
      "CONSTRAINT analytics_events_idempotency_key_unique UNIQUE (idempotency_key)"
    )
    expect(runtimeSchema).not.toContain("CREATE UNIQUE INDEX")
    expect(migration).toContain("ALTER TABLE analytics_events")
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS idempotency_key TEXT")
    expect(migration).toContain("analytics_events_idempotency_key_unique")
  })
})
