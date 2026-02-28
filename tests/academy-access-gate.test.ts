import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const hasStudioMembershipMock = vi.fn()

vi.mock("@/lib/neon", () => ({
  sql: sqlMock,
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: hasStudioMembershipMock,
}))

describe("userHasAcademyAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockResolvedValue([])
    hasStudioMembershipMock.mockResolvedValue(false)
  })

  it("grants access through Studio membership without requiring per-course purchase rows", async () => {
    hasStudioMembershipMock.mockResolvedValueOnce(true)

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-1", "what_to_say")

    expect(result).toBe(true)
    expect(hasStudioMembershipMock).toHaveBeenCalledWith("user-1")
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it("grants access through active per-course purchase for non-members", async () => {
    hasStudioMembershipMock.mockResolvedValueOnce(false)
    sqlMock.mockResolvedValueOnce([{ id: 1 }])

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-2", "show_up")

    expect(result).toBe(true)
    expect(hasStudioMembershipMock).toHaveBeenCalledWith("user-2")
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })

  it("keeps paywall for non-members without purchase", async () => {
    hasStudioMembershipMock.mockResolvedValueOnce(false)
    sqlMock.mockResolvedValueOnce([])

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-3", "get_paid")

    expect(result).toBe(false)
    expect(hasStudioMembershipMock).toHaveBeenCalledWith("user-3")
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })
})
