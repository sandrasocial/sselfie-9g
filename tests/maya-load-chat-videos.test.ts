import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetEffectiveNeonUser = vi.fn()
const mockLoadChatById = vi.fn()
const mockGetChatMessages = vi.fn()
const mockGetOrCreateActiveChat = vi.fn()
const mockSql = vi.fn()
const mockParseMayaToolMarkers = vi.fn()
const mockStripMayaToolMarkers = vi.fn()
const mockExtractMayaVideoCardMarkers = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mockGetEffectiveNeonUser,
}))

vi.mock("@/lib/data/maya", () => ({
  loadChatById: mockLoadChatById,
  getChatMessages: mockGetChatMessages,
  getOrCreateActiveChat: mockGetOrCreateActiveChat,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}))

vi.mock("@/lib/maya/tool-markers", () => ({
  parseMayaToolMarkers: mockParseMayaToolMarkers,
  stripMayaToolMarkers: mockStripMayaToolMarkers,
}))

vi.mock("@/lib/maya/video-card-marker", () => ({
  extractMayaVideoCardMarkers: mockExtractMayaVideoCardMarkers,
}))

describe("GET /api/maya/load-chat videos hydration", () => {
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
      chat_title: "Video Chat",
      chat_type: "videos",
    })
    mockGetChatMessages.mockResolvedValue([
      {
        id: 99,
        chat_id: 123,
        role: "assistant",
        content: "Your video is ready.",
        concept_cards: null,
        feed_cards: null,
        styling_details: null,
        created_at: new Date().toISOString(),
      },
    ])
    mockGetOrCreateActiveChat.mockResolvedValue({
      id: 123,
      user_id: "neon-user-1",
      chat_title: "Video Chat",
      chat_type: "videos",
    })
    mockParseMayaToolMarkers.mockReturnValue([{ tool: "generate_video" }])
    mockStripMayaToolMarkers.mockImplementation((value: string) => value)
    mockExtractMayaVideoCardMarkers.mockReturnValue([
      {
        videoUrl: "https://cdn.example.com/video.mp4",
        motionPrompt: "Slow camera move",
        imageUrl: "https://cdn.example.com/image.jpg",
      },
    ])
    mockSql.mockResolvedValue([])
  })

  it("restores video cards inside a videos chat", async () => {
    const { GET } = await import("@/app/api/maya/load-chat/route")

    const response = await GET(
      new Request("http://localhost/api/maya/load-chat?chatId=123&chatType=videos") as any,
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const assistantMessage = payload.messages[0]
    const videoParts = assistantMessage.parts.filter((part: any) => part.type === "tool-generateVideo")
    expect(videoParts).toHaveLength(1)
    expect(videoParts[0].output.videoUrl).toBe("https://cdn.example.com/video.mp4")
  })
})
