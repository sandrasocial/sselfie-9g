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

    getDbClient()

    expect(mockCreateNeonClient).toHaveBeenCalledWith("postgres://fallback-url", {
      disableWarningInBrowsers: true,
    })
  })

  it("throws only when all supported database env vars are missing", async () => {
    await expect(import("@/lib/db/client")).rejects.toThrow(
      /DATABASE_URL environment variable is not set/i,
    )
  })
})
