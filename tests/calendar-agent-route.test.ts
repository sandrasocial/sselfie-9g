// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByAuthId: vi.fn(),
  getFeedPlannerAccess: vi.fn(),
  getUserContextForMaya: vi.fn(),
  getMemory: vi.fn(),
  generateText: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: mocks.getUserByAuthId }))
vi.mock("@/lib/feed-planner/access-control", () => ({
  getFeedPlannerAccess: mocks.getFeedPlannerAccess,
}))
vi.mock("@/lib/maya/get-user-context", () => ({
  getUserContextForMaya: mocks.getUserContextForMaya,
}))
vi.mock("@/lib/app-v3/maya/memory-store", () => ({ getMemory: mocks.getMemory }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("ai", () => ({ generateText: mocks.generateText }))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: vi.fn(() => "mock-calendar-model"),
}))

function request(body: unknown) {
  return new Request("http://localhost/api/app-v3/maya/calendar-agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  message: "Move the second post to the first square",
  feedId: 42,
  selectedPostId: 502,
  history: [],
  feedSummary: null,
}

describe("Calendar Maya agent route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: "auth-77" }, error: null })
    mocks.getUserByAuthId.mockResolvedValue({ id: 77 })
    mocks.getFeedPlannerAccess.mockResolvedValue({
      isMembership: true,
      isPaidBlueprint: false,
    })
    mocks.getUserContextForMaya.mockResolvedValue("Warm, editorial, muted neutrals")
    mocks.getMemory.mockResolvedValue({ agentName: "Maya" })
  })

  it("rejects an unauthenticated request before reading Calendar state", async () => {
    mocks.auth.mockResolvedValue({ user: null, error: new Error("signed out") })
    const { POST } = await import("@/app/api/app-v3/maya/calendar-agent/route")

    const response = await POST(request(validBody))

    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it("does not expose or operate on a grid the member does not own", async () => {
    mocks.sql.mockResolvedValueOnce([])
    const { POST } = await import("@/app/api/app-v3/maya/calendar-agent/route")

    const response = await POST(request(validBody))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "Grid not found" })
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it("turns a model proposal for an unknown post into a safe clarification", async () => {
    mocks.sql
      .mockResolvedValueOnce([{ id: 42, brand_name: "July", username: "sandra" }])
      .mockResolvedValueOnce([
        {
          id: 501,
          position: 1,
          caption: "First",
          content_pillar: "Story",
          scheduled_at: null,
          image_url: null,
        },
      ])
      .mockResolvedValueOnce([])
    mocks.generateText.mockResolvedValue({
      text: JSON.stringify({
        message: "I will move it now.",
        proposal: {
          kind: "move_post",
          label: "Move post",
          postId: 999,
          targetPosition: 1,
        },
      }),
    })
    const { POST } = await import("@/app/api/app-v3/maya/calendar-agent/route")

    const response = await POST(request(validBody))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      message: "I need you to select the grid or post you want me to change first.",
      proposal: null,
    })
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("Never invent facts, numbers, customer results"),
      })
    )
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          "Never say or imply that an imagined image scene really happened"
        ),
      })
    )
  })

  it("grounds the Calendar request in the owned feed's saved visual direction", async () => {
    mocks.sql
      .mockResolvedValueOnce([
        {
          id: 42,
          brand_name: "July",
          username: "sandra",
          feed_style: "Light & Minimalistic",
          feed_style_variation_id: 14,
          visual_direction_mode: "custom",
          visual_direction_brief: "Bright city mornings with silver details",
          inspiration_image_url: "https://example.com/inspiration.jpg",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    mocks.generateText.mockResolvedValue({
      text: '```json\n{"message":"This fits the saved direction.","proposal":null}\n```',
    })
    const { POST } = await import("@/app/api/app-v3/maya/calendar-agent/route")

    const response = await POST(request(validBody))

    expect(response.status).toBe(200)
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining("Bright city mornings with silver details"),
          }),
        ],
      })
    )
    const call = mocks.generateText.mock.calls[0]?.[0]
    expect(call.messages[0].content).toContain('"visualDirectionMode":"custom"')
    expect(call.messages[0].content).toContain('"feedStyle":"Light & Minimalistic"')
    expect(call.messages[0].content).toContain('"feedStyleVariationId":14')
  })
})
