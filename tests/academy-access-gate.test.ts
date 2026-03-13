import { beforeEach, describe, expect, it, vi } from "vitest"

const userHasAcademyProductAccessMock = vi.fn()

vi.mock("@/lib/academy-entitlements", () => ({
  userHasAcademyProductAccess: userHasAcademyProductAccessMock,
}))

describe("userHasAcademyAccess", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("delegates Academy access checks to the centralized entitlement resolver", async () => {
    userHasAcademyProductAccessMock.mockResolvedValueOnce(true)

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-1", "what_to_say")

    expect(result).toBe(true)
    expect(userHasAcademyProductAccessMock).toHaveBeenCalledWith("user-1", "what_to_say")
  })

  it("returns false when the centralized entitlement resolver denies access", async () => {
    userHasAcademyProductAccessMock.mockResolvedValueOnce(false)

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-2", "show_up")

    expect(result).toBe(false)
    expect(userHasAcademyProductAccessMock).toHaveBeenCalledWith("user-2", "show_up")
  })

  it("fails closed when the entitlement resolver throws", async () => {
    userHasAcademyProductAccessMock.mockRejectedValueOnce(new Error("db unavailable"))

    const { userHasAcademyAccess } = await import("@/lib/academy-access")
    const result = await userHasAcademyAccess("user-3", "get_paid")

    expect(result).toBe(false)
    expect(userHasAcademyProductAccessMock).toHaveBeenCalledWith("user-3", "get_paid")
  })
})
