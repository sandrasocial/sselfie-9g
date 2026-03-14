/**
 * Regression test: /api/maya/generate-feed (Classic Mode)
 *
 * Guards against the critical route mismatch where maya-chat-screen.tsx called
 * /api/maya/generate-feed for non-pro users but only the pro route existed.
 *
 * This suite verifies the route:
 * - exists and responds (no 404)
 * - validates a well-formed 9-post strategy and returns it
 * - rejects bad post counts with UNSUPPORTED_FEED_POST_COUNT code
 * - rejects missing strategyJson
 * - rejects malformed JSON
 * - unwraps nested { feedStrategy: {...} } envelopes
 * - normalises feedTitle from title field
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAuthenticatedUser = vi.fn()
const mockGetUserByAuthId = vi.fn()

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}))

vi.mock("@/lib/user-mapping", () => ({
  getUserByAuthId: mockGetUserByAuthId,
}))

vi.mock("@/lib/maya/feed-strategy", async (importOriginal) => {
  // Use real helpers – they are pure functions with no I/O
  return importOriginal()
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildValidPosts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    visualDirection: `Concept ${i + 1}`,
    theme: "lifestyle",
  }))
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/maya/generate-feed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe("POST /api/maya/generate-feed (Classic Mode)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "auth-1" },
      error: null,
    })
    mockGetUserByAuthId.mockResolvedValue({
      id: "neon-1",
      email: "user@example.com",
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exists — does not 404 for classic (non-pro) users", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")
    expect(POST).toBeDefined()
  })

  it("accepts and returns a valid 9-post strategy", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const strategy = {
      feedTitle: "Spring Launch",
      overallVibe: "clean editorial",
      colorPalette: "neutral tones",
      posts: buildValidPosts(9),
    }

    const res = await POST(makeRequest({ strategyJson: JSON.stringify(strategy) }) as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.proMode).toBe(false)
    expect(data.strategy.feedTitle).toBe("Spring Launch")
    expect(data.strategy.posts).toHaveLength(9)
  })

  it("accepts a valid 12-post strategy", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const strategy = {
      feedTitle: "Blueprint Grid",
      posts: buildValidPosts(12),
    }

    const res = await POST(makeRequest({ strategyJson: JSON.stringify(strategy) }) as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.strategy.posts).toHaveLength(12)
  })

  it("unwraps nested { feedStrategy: { ... } } envelope", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const nested = {
      feedStrategy: {
        feedTitle: "Nested",
        posts: buildValidPosts(9),
      },
    }

    const res = await POST(makeRequest({ strategyJson: JSON.stringify(nested) }) as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.strategy.feedTitle).toBe("Nested")
  })

  it("normalises title → feedTitle when feedTitle is absent", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const strategy = {
      title: "Legacy Title Field",
      posts: buildValidPosts(9),
    }

    const res = await POST(makeRequest({ strategyJson: JSON.stringify(strategy) }) as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.strategy.feedTitle).toBe("Legacy Title Field")
  })

  it("rejects an unsupported post count with UNSUPPORTED_FEED_POST_COUNT code", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const strategy = { feedTitle: "Bad Count", posts: buildValidPosts(8) }

    const res = await POST(makeRequest({ strategyJson: JSON.stringify(strategy) }) as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe("UNSUPPORTED_FEED_POST_COUNT")
  })

  it("rejects a request with no strategyJson", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const res = await POST(makeRequest({}) as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/strategyJson/i)
  })

  it("rejects malformed JSON in strategyJson", async () => {
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const res = await POST(
      makeRequest({ strategyJson: "{not valid json" }) as any,
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/json/i)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: null, error: "unauth" })
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const res = await POST(makeRequest({ strategyJson: "{}" }) as any)

    expect(res.status).toBe(401)
  })

  it("returns 404 when neon user not found", async () => {
    mockGetUserByAuthId.mockResolvedValue(null)
    const { POST } = await import("@/app/api/maya/generate-feed/route")

    const res = await POST(makeRequest({ strategyJson: "{}" }) as any)

    expect(res.status).toBe(404)
  })
})
