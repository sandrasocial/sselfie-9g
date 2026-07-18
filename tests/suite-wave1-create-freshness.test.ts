// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getPublishedVaultCollections: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/vault/published-collections", () => ({
  getPublishedVaultCollections: mocks.getPublishedVaultCollections,
  toAestheticId: (name: string) =>
    name
      .toLowerCase()
      .replace(/\s*editorial\s*$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  toDisplayName: (name: string) => name.replace(/\s*Editorial\s*$/i, "").trim(),
}))

describe("Wave 1 Create freshness", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getPublishedVaultCollections.mockReset()
  })

  it("labels the newest published collection as New this week", async () => {
    mocks.getPublishedVaultCollections.mockResolvedValue([
      {
        id: 2,
        title: "Newest City Light Editorial",
        heroImage: "https://example.com/newest.jpg",
        moodLine: "City light and movement.",
        publishedAt: "2026-07-18T08:00:00.000Z",
        cards: [
          {
            id: "newest-1",
            title: "First shot",
            whenToUse: "Today",
            mood: "City light",
            prompt: "Editorial city light",
            exampleImage: "https://example.com/newest.jpg",
          },
        ],
      },
      {
        id: 1,
        title: "Older Look Editorial",
        heroImage: "https://example.com/older.jpg",
        moodLine: "An older look.",
        publishedAt: "2026-07-11T08:00:00.000Z",
        cards: [
          {
            id: "older-1",
            title: "First shot",
            whenToUse: "Earlier",
            mood: "Older",
            prompt: "Older editorial",
            exampleImage: "https://example.com/older.jpg",
          },
        ],
      },
    ])

    const { GET } = await import("@/app/api/app-v3/aesthetics/route")
    const response = await GET()
    const payload = await response.json()

    expect(payload.weeklyLook).toEqual({
      aestheticId: "newest-city-light",
      name: "Newest City Light",
      oneLiner: "City light and movement.",
    })
  })
})
