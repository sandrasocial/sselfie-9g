// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  isEnabled: vi.fn(),
  getEffectiveNeonUser: vi.fn(),
  getEntitlements: vi.fn(),
  loadSources: vi.fn(),
  rankSources: vi.fn(),
  generateGuidance: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock("@/lib/app-v3/maya/operating-layer-rollout", () => ({
  isMayaOperatingLayerEnabled: mocks.isEnabled,
}))
vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mocks.getEffectiveNeonUser,
}))
vi.mock("@/lib/academy-entitlements", () => ({
  getAcademyEntitlementState: mocks.getEntitlements,
}))
vi.mock("@/lib/app-v3/maya/guidance/source-registry", () => ({
  loadMayaGuidanceSources: mocks.loadSources,
  rankMayaGuidanceSources: mocks.rankSources,
}))
vi.mock("@/lib/app-v3/maya/guidance/service", () => ({
  generateMayaGuidance: mocks.generateGuidance,
}))

describe("Maya guidance API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-1", email: "sandra@example.com" },
      error: null,
    })
    mocks.getEffectiveNeonUser.mockResolvedValue({ id: "neon-1" })
    mocks.getEntitlements.mockResolvedValue({
      membershipActive: true,
      accessibleProductIds: ["branded_by_sselfie"],
    })
    mocks.loadSources.mockResolvedValue({ sources: [], lessonProgress: new Map() })
    mocks.rankSources.mockReturnValue({ fragments: [{ id: "source-1" }], hasQuestionMatch: true })
    mocks.generateGuidance.mockResolvedValue({
      recommendation: "Take one useful next step.",
      reason: "Sandra teaches this inside the lesson.",
      sourceRefs: [],
      nextAction: { kind: "continue_lesson" },
    })
  })

  it("rejects unauthenticated requests before checking rollout access", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ user: null, error: new Error("Unauthorized") })
    const { POST } = await import("@/app/api/app-v3/maya/guidance/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/guidance", {
        method: "POST",
        body: JSON.stringify({ taskId: "maya-task-123", job: "learn_next" }),
      })
    )

    expect(response.status).toBe(401)
    expect(mocks.isEnabled).not.toHaveBeenCalled()
  })

  it("is unavailable outside the server-side Sandra rollout", async () => {
    mocks.isEnabled.mockReturnValue(false)
    const { POST } = await import("@/app/api/app-v3/maya/guidance/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/guidance", {
        method: "POST",
        body: JSON.stringify({ taskId: "maya-task-123", job: "learn_next" }),
      })
    )

    expect(response.status).toBe(404)
    expect(mocks.loadSources).not.toHaveBeenCalled()
  })

  it("passes only sanitized context, accessible products, and ranked fragments to guidance", async () => {
    mocks.isEnabled.mockReturnValue(true)
    const { POST } = await import("@/app/api/app-v3/maya/guidance/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "maya-task-123",
          job: "learn_next",
          question: "  What should I learn next?  ",
          memberGoal: "Show up with confidence",
          ignoredMemberEmail: "must-not-pass@example.com",
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.rankSources).toHaveBeenCalledWith(
      expect.objectContaining({
        request: {
          taskId: "maya-task-123",
          job: "learn_next",
          question: "What should I learn next?",
          memberGoal: "Show up with confidence",
        },
        accessibleProductIds: new Set(["branded_by_sselfie"]),
      })
    )
    expect(mocks.generateGuidance).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "neon-1", sources: [{ id: "source-1" }] })
    )
    expect(mocks.loadSources).toHaveBeenCalledWith("neon-1", {
      methodDepth: "full_plus_execution",
    })
  })

  it("rejects malformed task context without loading Academy content", async () => {
    mocks.isEnabled.mockReturnValue(true)
    const { POST } = await import("@/app/api/app-v3/maya/guidance/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/maya/guidance", {
        method: "POST",
        body: JSON.stringify({ taskId: "short", job: "create_content" }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.loadSources).not.toHaveBeenCalled()
  })
})
