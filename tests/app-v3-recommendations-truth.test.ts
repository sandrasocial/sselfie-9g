// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserId: vi.fn(),
  getContext: vi.fn(),
  getMemory: vi.fn(),
  listChats: vi.fn(),
  hasUsableBrandProfile: vi.fn(),
  generateText: vi.fn(),
  sql: vi.fn(),
  getSuiteAccess: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserIdFromSupabase: mocks.getUserId }))
vi.mock("@/lib/maya/get-user-context", () => ({ getUserContextForMaya: mocks.getContext }))
vi.mock("@/lib/app-v3/maya/memory-store", () => ({ getMemory: mocks.getMemory }))
vi.mock("@/lib/app-v3/maya/chat-store", () => ({ listChats: mocks.listChats }))
vi.mock("@/lib/app-v3/maya/brand-profile-store", () => ({
  hasUsableBrandProfile: mocks.hasUsableBrandProfile,
}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
// Maya inference is membership-gated. This suite is about what Maya SAYS, not who
// may call her, so grant access and let the truth guard be the thing under test.
vi.mock("@/lib/trial/suite-trial", () => ({ getSuiteAccess: mocks.getSuiteAccess }))
vi.mock("ai", () => ({ generateText: mocks.generateText }))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: vi.fn(() => "mock-model"),
  getMayaMaxTokensForTask: vi.fn(() => 1000),
}))

describe("Create recommendation truth guard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: "auth-7", user_metadata: { first_name: "Maya" } },
      error: null,
    })
    mocks.getUserId.mockResolvedValue(7)
    mocks.getContext.mockResolvedValue("Generic account context")
    mocks.getMemory.mockResolvedValue({ agentName: "Maya", brandNotes: null })
    mocks.listChats.mockResolvedValue([])
    mocks.hasUsableBrandProfile.mockResolvedValue(false)
    mocks.sql.mockResolvedValue([])
    mocks.getSuiteAccess.mockResolvedValue({ level: "member" })
  })

  it("uses the safe frontend fallback instead of inventing a personal story for a blank profile", async () => {
    mocks.generateText.mockResolvedValue({
      text: JSON.stringify({
        greeting: "Let's create.",
        recommendations: [
          {
            title: "The First Bug I Ever Caught",
            rationale: "New followers need your origin story.",
            format: "photo",
          },
        ],
      }),
    })

    const { GET } = await import("@/app/api/app-v3/maya/recommendations/route")
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ greeting: "", recommendations: [] })
    expect(mocks.generateText).not.toHaveBeenCalled()
  })
})
