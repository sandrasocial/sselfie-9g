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

describe("POST /api/maya/save-message dedupe", () => {
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
    mockGenerateChatTitle.mockResolvedValue("Hello")
    mockUpdateChatTitle.mockResolvedValue(undefined)
    mockLearnFromInteraction.mockResolvedValue(undefined)
  })

  it("does not insert a duplicate row for identical immediate saves", async () => {
    const firstSavedMessage = {
      id: 11,
      chat_id: 123,
      role: "user",
      content: "Hello Maya",
      concept_cards: null,
      feed_cards: null,
      created_at: new Date().toISOString(),
    }

    mockGetChatMessages
      .mockResolvedValueOnce([]) // first request, no existing messages
      .mockResolvedValueOnce([firstSavedMessage]) // second request sees first message

    mockSaveChatMessage.mockResolvedValue(firstSavedMessage)

    const { POST } = await import("@/app/api/maya/save-message/route")

    const makeRequest = () =>
      new Request("http://localhost/api/maya/save-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: 123,
          role: "user",
          content: "Hello Maya",
        }),
      })

    const firstResponse = await POST(makeRequest() as any)
    expect(firstResponse.status).toBe(200)

    const secondResponse = await POST(makeRequest() as any)
    const secondBody = await secondResponse.json()

    expect(secondResponse.status).toBe(200)
    expect(secondBody.deduplicated).toBe(true)
    expect(mockSaveChatMessage).toHaveBeenCalledTimes(1)
  })
})
