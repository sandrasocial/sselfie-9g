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

describe("GET /api/maya/load-chat inline feed hydration", () => {
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
      chat_title: "Main Maya Chat",
      chat_type: "maya",
    })
    mockGetChatMessages.mockResolvedValue([
      {
        id: 99,
        chat_id: 123,
        role: "assistant",
        content: "Your feed is ready [FEED_CARD:44]",
        concept_cards: null,
        feed_cards: [{ feedId: 44 }],
        styling_details: null,
        created_at: new Date().toISOString(),
      },
    ])
    mockGetOrCreateActiveChat.mockResolvedValue({
      id: 123,
      user_id: "neon-user-1",
      chat_title: "Main Maya Chat",
      chat_type: "maya",
    })
    mockParseMayaToolMarkers.mockReturnValue([])
    mockStripMayaToolMarkers.mockImplementation((value: string) => value)
    mockExtractMayaVideoCardMarkers.mockReturnValue([])
    mockSql.mockResolvedValue([
      {
        feed_id: 44,
        feed_title: "Launch Feed",
        feed_description: "Luxury launch week",
        brand_vibe: "editorial rhythm",
        color_palette: "black and cream",
        posts: [
          {
            id: 1,
            position: 1,
            prompt: "Editorial portrait",
            caption: "Post 1",
            content_pillar: "Offer",
            post_type: "portrait",
            image_url: "https://cdn.example.com/post-1.jpg",
            generation_status: "completed",
          },
        ],
      },
    ])
  })

  it("restores a feed card inside a standard Maya chat", async () => {
    const { GET } = await import("@/app/api/maya/load-chat/route")

    const response = await GET(
      new Request("http://localhost/api/maya/load-chat?chatId=123&chatType=maya") as any,
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    const assistantMessage = payload.messages[0]
    const feedParts = assistantMessage.parts.filter((part: any) => part.type === "tool-generateFeed")
    const feedPart = feedParts[0]

    expect(feedPart).toBeTruthy()
    expect(feedParts).toHaveLength(1)
    expect(feedPart.output.feedId).toBe(44)
    expect(feedPart.output.title).toBe("Launch Feed")
  })
})
