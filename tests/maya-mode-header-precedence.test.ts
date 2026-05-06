import { beforeEach, describe, expect, it, vi } from "vitest"

const mockStreamText = vi.fn()
const mockConvertToModelMessages = vi.fn()
const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockCheckCredits = vi.fn()
const mockGetOrCreateActiveChat = vi.fn()
const mockSql = vi.fn()
const mockDetectStudioProIntent = vi.fn()
const mockResolveMayaChatTask = vi.fn()

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
  getMayaSystemPrompt: vi.fn((config: { mode: string }) => `base-system:${config.mode}`),
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
  detectStudioProIntent: mockDetectStudioProIntent,
  getStudioProSystemPrompt: vi.fn(() => "studio-pro"),
}))

vi.mock("@/lib/maya/openrouter", () => ({
  createMayaAnthropicModel: vi.fn(() => "anthropic-fallback-model"),
  createMayaOpenRouterFallbackModel: vi.fn(() => null),
  getMayaGatewayModel: vi.fn(() => "gateway-model"),
  getMayaMaxTokensForTask: vi.fn(() => 4096),
  getMayaModelForTask: vi.fn(() => "gateway-model"),
  resolveMayaChatTask: mockResolveMayaChatTask,
}))

vi.mock("@/lib/products-system-prompt", () => ({
  getProductGenerationPrompt: vi.fn(() => ""),
}))

vi.mock("@/lib/maya/chat-credit-policy", () => ({
  shouldDeductMayaChatCredit: vi.fn(() => false),
}))

vi.mock("@/lib/maya/intent-dispatcher", () => ({
  extractLatestUserText: vi.fn(() => "Use my trained model for this photo"),
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

vi.mock("@/lib/maya/method-depth", () => ({
  resolveMethodDepth: vi.fn(() => "studio"),
}))

vi.mock("@/lib/maya/week-plan-prompt", () => ({
  getWeekPlanSystemAddendum: vi.fn(() => ""),
}))

vi.mock("@/lib/subscription", () => ({
  hasStudioMembership: vi.fn(() => Promise.resolve(false)),
}))

describe("Maya mode header precedence", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

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
    mockConvertToModelMessages.mockResolvedValue([
      {
        role: "user",
        content: [{ type: "text", text: "Use my trained model for this photo" }],
      },
    ])
    mockDetectStudioProIntent.mockReturnValue({
      isStudioPro: true,
      mode: "selfie",
      confidence: 0.95,
    })
    mockResolveMayaChatTask.mockReturnValue("chat_default")
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response("ok", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
    })
  })

  it("keeps My Model mode when the UI explicitly sends x-studio-pro-mode false", async () => {
    const { POST } = await import("@/app/api/maya/chat/route")

    const response = await POST(
      new Request("http://localhost/api/maya/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-type": "maya",
          "x-active-tab": "photos",
          "x-studio-pro-mode": "false",
        },
        body: JSON.stringify({
          chatType: "maya",
          messages: [
            {
              id: "user-message-1",
              role: "user",
              parts: [{ type: "text", text: "Use my trained model for this photo" }],
            },
          ],
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockResolveMayaChatTask).toHaveBeenCalledWith(
      expect.objectContaining({
        isStudioProMode: false,
      }),
    )
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("## CURRENT GENERATION MODE: MY MODEL"),
      }),
    )
    expect(mockStreamText.mock.calls[0][0].system).not.toContain("## CURRENT GENERATION MODE: SELFIE")
  })
})
