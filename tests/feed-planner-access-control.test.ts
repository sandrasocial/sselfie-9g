import { beforeEach, describe, expect, it, vi } from "vitest"

import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

const mockHasPaidBlueprint = vi.fn()
const mockHasFullAccess = vi.fn()
const mockGetUserCredits = vi.fn()

vi.mock("@/lib/subscription", () => ({
  hasPaidBlueprint: (...args: unknown[]) => mockHasPaidBlueprint(...args),
  hasFullAccess: (...args: unknown[]) => mockHasFullAccess(...args),
}))

vi.mock("@/lib/credits", () => ({
  getUserCredits: (...args: unknown[]) => mockGetUserCredits(...args),
}))

describe("getFeedPlannerAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps free users without credits in restricted mode", async () => {
    mockHasPaidBlueprint.mockResolvedValue(false)
    mockHasFullAccess.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(0)

    const access = await getFeedPlannerAccess("u_free_0")

    expect(access.isFree).toBe(true)
    expect(access.creditBalance).toBe(0)
    expect(access.canGenerateWithCredits).toBe(false)
    expect(access.canGenerateImages).toBe(false)
    expect(access.placeholderType).toBe("single")
  })

  it("allows free users with credits to generate images", async () => {
    mockHasPaidBlueprint.mockResolvedValue(false)
    mockHasFullAccess.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(2)

    const access = await getFeedPlannerAccess("u_free_2")

    expect(access.isFree).toBe(true)
    expect(access.creditBalance).toBe(2)
    expect(access.canGenerateWithCredits).toBe(true)
    expect(access.canGenerateImages).toBe(true)
  })

  it("allows paid blueprint users regardless of current credit balance", async () => {
    mockHasPaidBlueprint.mockResolvedValue(true)
    mockHasFullAccess.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(0)

    const access = await getFeedPlannerAccess("u_paid")

    expect(access.isPaidBlueprint).toBe(true)
    expect(access.canGenerateImages).toBe(true)
    expect(access.maxFeedPlanners).toBe(3)
    expect(access.placeholderType).toBe("grid")
  })
})
