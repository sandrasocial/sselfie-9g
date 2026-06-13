import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getUserIdFromSupabase: vi.fn(),
  loadActiveDraft: vi.fn(),
  saveActiveDraft: vi.fn(),
  clearActiveDraft: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserIdFromSupabase: mocks.getUserIdFromSupabase,
}))

vi.mock("@/lib/app-v3/maya/draft-store", () => ({
  loadActiveDraft: mocks.loadActiveDraft,
  saveActiveDraft: mocks.saveActiveDraft,
  clearActiveDraft: mocks.clearActiveDraft,
}))

const validDraft = {
  isOpen: true,
  savedAt: Date.now(),
  chatId: "chat_route",
  session: {
    aesthetic: {
      id: "cafe-minimalist-paris",
      name: "Cafe Minimalist Paris",
      blurb: "Soft cafe editorial.",
      coverImage: "",
      thumbnails: [],
      shotCount: 6,
      intent: "Cafe photoshoot.",
    },
    outputFormat: "photo",
    referenceSelfieUrl: null,
    graphicText: null,
    startedAt: 123,
  },
  messages: [],
  genState: {},
  generatedOnce: false,
  setupOpen: true,
}

describe("/api/app-v3/maya/draft", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user" }, error: null })
    mocks.getUserIdFromSupabase.mockResolvedValue("neon-user")
  })

  it("loads the authenticated user's active draft", async () => {
    mocks.loadActiveDraft.mockResolvedValue(validDraft)

    const { GET } = await import("@/app/api/app-v3/maya/draft/route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.draft.chatId).toBe("chat_route")
    expect(mocks.loadActiveDraft).toHaveBeenCalledWith("neon-user")
  })

  it("validates and saves the authenticated user's active draft", async () => {
    const { PUT } = await import("@/app/api/app-v3/maya/draft/route")
    const response = await PUT(
      new Request("http://localhost/api/app-v3/maya/draft", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: validDraft }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.saveActiveDraft).toHaveBeenCalledWith(
      "neon-user",
      expect.objectContaining({ chatId: "chat_route" })
    )
  })

  it("clears only the authenticated user's active draft", async () => {
    const { DELETE } = await import("@/app/api/app-v3/maya/draft/route")
    const response = await DELETE()

    expect(response.status).toBe(200)
    expect(mocks.clearActiveDraft).toHaveBeenCalledWith("neon-user")
  })
})
