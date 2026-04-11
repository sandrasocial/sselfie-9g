import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockGetChatMessages = vi.fn()
const mockLoadChatById = vi.fn()
const mockGenerateChatTitle = vi.fn()
const mockUpdateChatTitle = vi.fn()
const mockSaveChatMessage = vi.fn()
const mockLearnFromInteraction = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/data/maya", () => ({
  getChatMessages: mockGetChatMessages,
  loadChatById: mockLoadChatById,
  generateChatTitle: mockGenerateChatTitle,
  updateChatTitle: mockUpdateChatTitle,
  saveChatMessage: mockSaveChatMessage,
  learnFromInteraction: mockLearnFromInteraction,
}))

describe("POST /api/maya/save-message inline feed persistence", () => {
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
    mockLoadChatById.mockResolvedValue({
      id: 123,
      user_id: "neon-user-1",
      chat_type: "maya",
    })
    mockGetChatMessages.mockResolvedValue([])
    mockGenerateChatTitle.mockResolvedValue("Feed help")
    mockUpdateChatTitle.mockResolvedValue(undefined)
    mockLearnFromInteraction.mockResolvedValue(undefined)
    mockSaveChatMessage.mockResolvedValue({
      id: 12,
      chat_id: 123,
      role: "assistant",
      content: "Here is your feed",
      concept_cards: null,
      feed_cards: [{ feedId: 44 }],
      created_at: new Date().toISOString(),
    })
  })

  it("allows feed cards to be saved in a standard Maya chat", async () => {
    const { POST } = await import("@/app/api/maya/save-message/route")

    const response = await POST(
      new Request("http://localhost/api/maya/save-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: 123,
          role: "assistant",
          content: "Here is your feed",
          feedCards: [{ feedId: 44 }],
        }),
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(mockSaveChatMessage).toHaveBeenCalledWith(
      123,
      "assistant",
      "Here is your feed",
      undefined,
      [{ feedId: 44 }],
      undefined,
    )
  })
})
