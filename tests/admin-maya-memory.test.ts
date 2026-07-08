import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSql = vi.fn()

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

describe("admin Maya editorial memory", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("saves a deduplicated admin editorial memory note", async () => {
    mockSql.mockResolvedValueOnce([]) // create table
    mockSql.mockResolvedValueOnce([]) // created_at index
    mockSql.mockResolvedValueOnce([]) // kind index
    mockSql.mockResolvedValueOnce([]) // duplicate lookup
    mockSql.mockResolvedValueOnce([{ id: 42 }]) // insert
    mockSql.mockResolvedValueOnce([]) // prune beyond 200 rows

    const { addAdminMemoryNote } = await import("@/lib/app-v3/maya/admin-memory-store")
    const result = await addAdminMemoryNote({
      adminUserId: "admin-1",
      kind: "approval",
      sourceType: "shot",
      sourceId: "12:shot-1",
      sourceTitle: "Cafe Minimalist Paris",
      note: "Approved the seated coffee moment because it feels candid and usable.",
      metadata: { shotId: "shot-1" },
    })

    expect(result).toEqual({ saved: true, id: 42 })
    expect(mockSql).toHaveBeenCalledTimes(6)
  })

  it("formats recent notes into an admin-only prompt context", async () => {
    mockSql.mockResolvedValueOnce([]) // create table
    mockSql.mockResolvedValueOnce([]) // created_at index
    mockSql.mockResolvedValueOnce([]) // kind index
    mockSql.mockResolvedValueOnce([
      {
        kind: "rejection",
        source_type: "shot",
        source_id: "12:shot-2",
        source_title: "Cafe Minimalist Paris",
        note: "Rejected a shot that looked too posed and glossy.",
        created_at: "2026-06-13T10:00:00.000Z",
      },
    ])

    const { getAdminMemoryContext } = await import("@/lib/app-v3/maya/admin-memory-store")
    const context = await getAdminMemoryContext()

    expect(context).toContain("ADMIN EDITORIAL MEMORY")
    expect(context).toContain("rejection (shot: Cafe Minimalist Paris): Rejected a shot that looked too posed and glossy.")
  })
})
