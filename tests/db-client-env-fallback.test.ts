// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCreateNeonClient = vi.fn(() => vi.fn())

vi.mock("@neondatabase/serverless", () => ({
  neon: mockCreateNeonClient,
}))

describe("lib/db/client environment fallback", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.DATABASE_URL
    delete process.env.POSTGRES_URL
    delete process.env.POSTGRES_PRISMA_URL
    delete process.env.SUPABASE_POSTGRES_URL
  })

  it("uses POSTGRES_URL when DATABASE_URL is missing", async () => {
    process.env.POSTGRES_URL = "postgres://fallback-url"

    const { getDbClient } = await import("@/lib/db/client")

    const sql = getDbClient()
    sql("SELECT 1" as any)

    expect(mockCreateNeonClient).toHaveBeenCalledWith("postgres://fallback-url", {
      disableWarningInBrowsers: true,
    })
  })

  it("throws only when all supported database env vars are missing", async () => {
    const { getDbClient } = await import("@/lib/db/client")

    const sql = getDbClient()

    expect(() => sql("SELECT 1" as any)).toThrow(
      /DATABASE_URL environment variable is not set/i,
    )
  })

  it("does not initialize the database client until a query is attempted", async () => {
    const { getDbClient, sql } = await import("@/lib/db/client")

    expect(() => getDbClient()).not.toThrow()
    expect(mockCreateNeonClient).not.toHaveBeenCalled()
    expect(() => sql("SELECT 1" as any)).toThrow(/DATABASE_URL environment variable is not set/i)
  })
})
