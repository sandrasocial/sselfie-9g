import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockStreamText = vi.fn()
const mockConvertToModelMessages = vi.fn()
const mockCreateUIMessageStream = vi.fn()
const mockCreateUIMessageStreamResponse = vi.fn()
const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockGetOrCreateActiveChat = vi.fn()
const mockSql = vi.fn()

vi.mock("ai", () => ({
  streamText: mockStreamText,
  convertToModelMessages: mockConvertToModelMessages,
  createUIMessageStream: mockCreateUIMessageStream,
  createUIMessageStreamResponse: mockCreateUIMessageStreamResponse,
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
      upsert: vi.fn().mockResolvedValue({}),
    })),
  })),
}))

vi.mock("@/lib/maya/auto-select-mode", () => ({
  autoSelectMayaMode: vi.fn(() => "maya"),
  isContentPlanningIntent: vi.fn(() => false),
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
  getMayaMaxTokensForTask: vi.fn(() => 4096),
  getMayaModelForTask: vi.fn(() => "gateway-model"),
  resolveMayaChatTask: vi.fn(() => "chat_default"),
}))

vi.mock("@/lib/products-system-prompt", () => ({
  getProductGenerationPrompt: vi.fn(() => ""),
}))

vi.mock("@/lib/maya/chat-credit-policy", () => ({
  shouldDeductMayaChatCredit: vi.fn(() => false),
}))

vi.mock("@/lib/maya/intent-dispatcher", () => ({
  extractLatestUserText: vi.fn(() => "Animate this into a reel"),
  hydrateMayaToolDispatchIntent: vi.fn(),
}))

vi.mock("@/lib/maya/tool-markers", () => ({
  stripMayaToolMarkers: vi.fn((value: string) => value),
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

vi.mock("@/lib/maya/memory-layer", () => ({
  persistMayaRememberedPreference: vi.fn(),
  getMayaActiveAssetContext: vi.fn(),
  persistMayaActiveAssetContext: vi.fn(),
  persistMayaOfferBrief: vi.fn(),
  detectMayaAssetIntentResult: vi.fn(() => null),
}))

vi.mock("@/lib/maya/tool-orchestrator", () => ({
  estimateToolDispatchCredits: vi.fn(() => 0),
  orchestrateMayaTurn: vi.fn(() => ({ kind: "none", reason: "no_match" })),
}))

vi.mock("@/lib/maya/asset-generation", () => ({
  createMayaGeneratedAsset: vi.fn(),
  updateMayaGeneratedAsset: vi.fn(),
}))

vi.mock("@/lib/maya/user-snapshot", () => ({
  getMayaUserSnapshot: vi.fn(() => Promise.resolve(null)),
}))

vi.mock("@/lib/maya/page-generation/snapshot-resolver", () => ({
  resolveMayaLandingSnapshot: vi.fn(),
}))

vi.mock("@/lib/maya/page-generation/constants", () => ({
  isMayaPageRendererV2Enabled: vi.fn(() => false),
}))

describe("POST /api/maya/chat tab handoff routing", () => {
  const originalTabScopedFlag = process.env.FEATURE_MAYA_TAB_SCOPED_CHAT

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.FEATURE_MAYA_TAB_SCOPED_CHAT = "true"

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
    mockConvertToModelMessages.mockResolvedValue([])
    mockCreateUIMessageStream.mockImplementation(({ execute }: any) => {
      const chunks: any[] = []
      execute({
        writer: {
          write: (chunk: any) => {
            chunks.push(chunk)
          },
        },
      })
      return { chunks }
    })
    mockCreateUIMessageStreamResponse.mockImplementation(({ stream }: any) => {
      return new Response(JSON.stringify(stream.chunks), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    })
  })

  afterEach(() => {
    process.env.FEATURE_MAYA_TAB_SCOPED_CHAT = originalTabScopedFlag
  })

  it("returns a switch-tab handoff instead of running the wrong workflow", async () => {
    const { POST } = await import("@/app/api/maya/chat/route")

    const response = await POST(
      new Request("http://localhost/api/maya/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-type": "maya",
          "x-active-tab": "photos",
        },
        body: JSON.stringify({
          chatType: "maya",
          messages: [
            {
              id: "user-message-1",
              role: "user",
              parts: [{ type: "text", text: "Animate this into a reel" }],
            },
          ],
        }),
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const serialized = JSON.stringify(payload)
    expect(serialized).toContain("SWITCH_MAYA_TAB:videos|")
    expect(mockStreamText).not.toHaveBeenCalled()
  })
})
