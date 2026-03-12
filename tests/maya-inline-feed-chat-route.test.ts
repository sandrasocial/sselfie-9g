import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockStreamText = vi.fn()
const mockConvertToModelMessages = vi.fn()
const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockGetOrCreateActiveChat = vi.fn()
const mockSql = vi.fn()
const mockResolveMayaChatTask = vi.fn()
const mockUpsert = vi.fn()

vi.mock("ai", () => ({
  streamText: mockStreamText,
  convertToModelMessages: mockConvertToModelMessages,
  createUIMessageStream: vi.fn(),
  createUIMessageStreamResponse: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/credits", () => ({
  checkCredits: mockCheckCredits,
  deductCredits: vi.fn(),
}))

vi.mock("@/lib/data/maya", () => ({
  getOrCreateActiveChat: mockGetOrCreateActiveChat,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/maya/mode-adapters", () => ({
  getMayaSystemPrompt: vi.fn(() => "base-system"),
  MAYA_CLASSIC_CONFIG: { mode: "classic" },
  MAYA_PRO_CONFIG: { mode: "pro" },
}))

vi.mock("@/lib/maya/get-user-context", () => ({
  getUserContextForMaya: vi.fn().mockResolvedValue(""),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}))

vi.mock("@/lib/maya/auto-select-mode", () => ({
  autoSelectMayaMode: vi.fn(() => "feed-planner"),
  isContentPlanningIntent: vi.fn(() => true),
  isUnifiedMayaUiEnabled: vi.fn(() => true),
}))

vi.mock("@/lib/maya/studio-pro-system-prompt", () => ({
  detectStudioProIntent: vi.fn(() => ({
    isStudioPro: false,
    mode: null,
    confidence: 0,
  })),
  getStudioProSystemPrompt: vi.fn(() => "studio-pro"),
}))

vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterFallbackModel: vi.fn(() => null),
  getMayaGatewayModel: vi.fn(() => "gateway-model"),
  getMayaMaxTokensForTask: vi.fn(() => 8192),
  getMayaModelForTask: vi.fn(() => "gateway-model"),
  resolveMayaChatTask: mockResolveMayaChatTask,
}))

vi.mock("@/lib/maya/feed-planner-context", () => ({
  getFeedPlannerContextAddon: vi.fn(() => "feed-context"),
}))

vi.mock("@/lib/products-system-prompt", () => ({
  getProductGenerationPrompt: vi.fn(() => ""),
}))

vi.mock("@/lib/maya/chat-credit-policy", () => ({
  shouldDeductMayaChatCredit: vi.fn(() => false),
}))

vi.mock("@/lib/maya/intent-dispatcher", () => ({
  extractLatestUserText: vi.fn(() => "Create a feed plan for next week"),
  hydrateMayaToolDispatchIntent: vi.fn(),
}))

vi.mock("@/lib/maya/tool-markers", () => ({
  stripMayaToolMarkers: vi.fn((value: string) => value),
}))

vi.mock("@/lib/maya/tool-registry", () => ({
  formatMayaToolMarker: vi.fn(() => "[marker]"),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: vi.fn(),
}))

vi.mock("@/lib/maya/skills/skill-router", () => ({
  selectMayaSkill: vi.fn(() => ({
    skillId: "default",
    version: "test",
    source: "test",
    promptAddendum: "",
  })),
}))

describe("POST /api/maya/chat inline feed routing", () => {
  const originalUnifiedFlag = process.env.FEATURE_UNIFIED_MAYA_UI
  const originalChatFirstFlag = process.env.FEATURE_CHAT_FIRST_MAYA

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.FEATURE_UNIFIED_MAYA_UI = "true"
    process.env.FEATURE_CHAT_FIRST_MAYA = "false"

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-user-1" },
      error: null,
    })
    mockGetEffectiveNeonUser.mockResolvedValue({
      id: "neon-user-1",
      email: "test@example.com",
    })
    mockCheckCredits.mockResolvedValue(true)
    mockGetOrCreateActiveChat.mockResolvedValue({
      id: 321,
      user_id: "neon-user-1",
      chat_type: "maya",
    })
    mockSql.mockResolvedValue([])
    mockResolveMayaChatTask.mockReturnValue("feed_planner")
    mockConvertToModelMessages.mockResolvedValue([
      {
        role: "user",
        content: [{ type: "text", text: "Create a feed plan for next week" }],
      },
    ])
    mockUpsert.mockResolvedValue({})
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response("ok", {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        }),
    })
  })

  afterEach(() => {
    process.env.FEATURE_UNIFIED_MAYA_UI = originalUnifiedFlag
    process.env.FEATURE_CHAT_FIRST_MAYA = originalChatFirstFlag
  })

  it("keeps inline feed planning turns in the current Maya thread while using feed planner routing", async () => {
    const { POST } = await import("@/app/api/maya/chat/route")

    const response = await POST(
      new Request("http://localhost/api/maya/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-type": "maya",
        },
        body: JSON.stringify({
          chatType: "maya",
          messages: [
            {
              id: "user-message-1",
              role: "user",
              parts: [{ type: "text", text: "Create a feed plan for next week" }],
            },
          ],
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockGetOrCreateActiveChat).toHaveBeenCalledWith("neon-user-1", "maya")
    expect(mockResolveMayaChatTask).toHaveBeenCalledWith(
      expect.objectContaining({
        chatType: "feed_planner",
        preferFeedPlannerContext: true,
      }),
    )
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 321,
        user_id: "neon-user-1",
        chat_type: "maya",
      }),
      { onConflict: "id" },
    )
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 8192,
      }),
    )
  })

  it("uses JSONB array checks when probing selfie library availability", async () => {
    const seenQueries: string[] = []
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      seenQueries.push(Array.from(strings).join("__VALUE__"))
      return Promise.resolve([])
    })

    const { POST } = await import("@/app/api/maya/chat/route")

    const response = await POST(
      new Request("http://localhost/api/maya/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-type": "maya",
        },
        body: JSON.stringify({
          chatType: "maya",
          messages: [
            {
              id: "user-message-1",
              role: "user",
              parts: [{ type: "text", text: "Create a feed plan for next week" }],
            },
          ],
        }),
      }),
    )

    expect(response.status).toBe(200)
    const libraryQuery = seenQueries.find((query) => query.includes("FROM user_image_libraries"))
    expect(libraryQuery).toBeDefined()
    expect(libraryQuery).toContain("jsonb_array_length")
    expect(libraryQuery).not.toMatch(/\barray_length\(/)
  })
})
