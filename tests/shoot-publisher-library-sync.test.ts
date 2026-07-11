// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("server-only", () => ({}))

import { syncPublishedShootToMemberLibrary } from "@/lib/content-kit/shoot-publisher"

const drop = {
  shootId: 44,
  title: "New Editorial Drop",
  description: "Soft light. Clear direction.",
  thumbnailUrl: "https://example.com/drop.jpg",
  publishedAt: "2026-07-11T14:30:00.000Z",
}

function queryText(call: unknown[]) {
  return Array.from(call[0] as TemplateStringsArray).join(" ")
}

describe("Shoot Studio member Library auto-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates the matching monthly drop by title", async () => {
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray) =>
      Array.from(strings).join(" ").includes("SELECT id FROM academy_monthly_drops")
        ? [{ id: 91 }]
        : [],
    )

    await expect(syncPublishedShootToMemberLibrary(drop)).resolves.toBe(true)

    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(queryText(mocks.sql.mock.calls[1])).toContain("UPDATE academy_monthly_drops")
    expect(queryText(mocks.sql.mock.calls[1])).toContain("status = 'published'")
    expect(mocks.sql.mock.calls[1].slice(1)).toEqual([
      drop.description,
      drop.thumbnailUrl,
      "2026-07",
      91,
    ])
  })

  it("inserts a published Prompt Vault drop when the title is new", async () => {
    mocks.sql.mockResolvedValue([])

    await expect(syncPublishedShootToMemberLibrary(drop)).resolves.toBe(true)

    expect(mocks.sql).toHaveBeenCalledTimes(2)
    expect(queryText(mocks.sql.mock.calls[1])).toContain("INSERT INTO academy_monthly_drops")
    expect(queryText(mocks.sql.mock.calls[1])).toContain("'prompt-collection'")
    expect(queryText(mocks.sql.mock.calls[1])).toContain("'Prompt Vault'")
    expect(queryText(mocks.sql.mock.calls[1])).toContain("'published'")
    expect(mocks.sql.mock.calls[1].slice(1)).toEqual([
      drop.title,
      drop.description,
      drop.thumbnailUrl,
      "2026-07",
    ])
  })

  it("logs and fails open when the Library write fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.sql.mockRejectedValue(new Error("monthly drops unavailable"))

    await expect(syncPublishedShootToMemberLibrary(drop)).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(
      "[shoot-publisher] member Library drop sync failed:",
      expect.objectContaining({ shootId: drop.shootId, title: drop.title }),
    )

    consoleError.mockRestore()
  })
})
