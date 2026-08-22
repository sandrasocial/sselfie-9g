import { beforeEach, describe, expect, it, vi } from "vitest"

import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

const mockHasPaidBlueprint = vi.fn()
const mockHasFullAccess = vi.fn()
const mockGetUserCredits = vi.fn()
const mockGetSuiteAccess = vi.fn()

vi.mock("@/lib/subscription", () => ({
  hasPaidBlueprint: (...args: unknown[]) => mockHasPaidBlueprint(...args),
  hasFullAccess: (...args: unknown[]) => mockHasFullAccess(...args),
}))

vi.mock("@/lib/credits", () => ({
  getUserCredits: (...args: unknown[]) => mockGetUserCredits(...args),
}))

vi.mock("@/lib/trial/suite-trial", () => ({
  getSuiteAccess: (...args: unknown[]) => mockGetSuiteAccess(...args),
}))

describe("getFeedPlannerAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSuiteAccess.mockResolvedValue({ level: "none", calendarIncluded: false })
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

  it.each(["member", "trial"])(
    "keeps Suite %s users on the full Calendar experience",
    async level => {
      mockHasPaidBlueprint.mockResolvedValue(false)
      mockHasFullAccess.mockResolvedValue(false)
      mockGetUserCredits.mockResolvedValue(20)
      mockGetSuiteAccess.mockResolvedValue({ level, calendarIncluded: true })

      const access = await getFeedPlannerAccess(`u_${level}`)

      expect(access.isFree).toBe(false)
      expect(access.isMembership).toBe(true)
      expect(access.hasGalleryAccess).toBe(true)
      expect(access.canGenerateCaptions).toBe(true)
      expect(access.canGenerateStrategy).toBe(true)
      expect(access.placeholderType).toBe("grid")
    }
  )

  it("keeps Maya Essential out of Calendar even though it is a generation member", async () => {
    mockHasPaidBlueprint.mockResolvedValue(false)
    mockHasFullAccess.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(30)
    mockGetSuiteAccess.mockResolvedValue({ level: "member", calendarIncluded: false })

    const access = await getFeedPlannerAccess("u_maya_essential")

    expect(access.isMembership).toBe(false)
    expect(access.isFree).toBe(true)
    expect(access.hasGalleryAccess).toBe(false)
  })

  it("unions historical paid Blueprint Calendar access with Maya Essential", async () => {
    mockHasPaidBlueprint.mockResolvedValue(true)
    mockHasFullAccess.mockResolvedValue(false)
    mockGetUserCredits.mockResolvedValue(30)
    mockGetSuiteAccess.mockResolvedValue({ level: "member", calendarIncluded: false })

    const access = await getFeedPlannerAccess("u_essential_blueprint")

    expect(access.isPaidBlueprint).toBe(true)
    expect(access.isMembership).toBe(false)
    expect(access.hasGalleryAccess).toBe(true)
    expect(access.placeholderType).toBe("grid")
  })
})
