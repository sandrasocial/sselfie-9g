import { beforeEach, describe, expect, it, vi } from "vitest"
import { mergeGalleryImageUrls } from "@/lib/app-v3/gallery-bridge"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getEffectiveNeonUser: vi.fn(),
  sql: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mocks.getEffectiveNeonUser,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.getAuthenticatedUser.mockReset()
  mocks.getEffectiveNeonUser.mockReset()
  mocks.sql.mockReset()
})

describe("app v3 legacy gallery bridge", () => {
  it("shows new Suite and legacy Studio images together, newest first", () => {
    const images = mergeGalleryImageUrls({
      aiRows: [
        {
          image_url: "https://blob.vercel-storage.com/new-suite.png",
          created_at: "2026-06-16T10:00:00.000Z",
        },
      ],
      legacyRows: [
        {
          selected_url: "https://blob.vercel-storage.com/old-studio-latest.png",
          image_urls: null,
          created_at: "2026-06-17T10:00:00.000Z",
        },
        {
          selected_url: null,
          image_urls:
            "https://blob.vercel-storage.com/old-studio-older-a.png,https://blob.vercel-storage.com/old-studio-older-b.png",
          created_at: "2026-06-15T10:00:00.000Z",
        },
      ],
    })

    expect(images).toEqual([
      "https://blob.vercel-storage.com/old-studio-latest.png",
      "https://blob.vercel-storage.com/new-suite.png",
      "https://blob.vercel-storage.com/old-studio-older-a.png",
      "https://blob.vercel-storage.com/old-studio-older-b.png",
    ])
  })

  it("extracts completed photoshoot URLs from legacy JSON while ignoring pending prediction metadata", () => {
    const images = mergeGalleryImageUrls({
      aiRows: [],
      legacyRows: [
        {
          selected_url: null,
          image_urls: JSON.stringify({
            prediction_id: "pred_pending",
            status: "processing",
          }),
          created_at: "2026-06-17T10:00:00.000Z",
        },
        {
          selected_url: null,
          image_urls: JSON.stringify({
            status: "completed",
            hero_image: "https://blob.vercel-storage.com/input-reference-not-gallery.png",
            finalImageUrls: [
              "https://blob.vercel-storage.com/photoshoot-1.png",
              "https://blob.vercel-storage.com/photoshoot-2.png",
            ],
            predictions: [
              {
                imageUrls: ["https://blob.vercel-storage.com/photoshoot-3.png"],
              },
            ],
          }),
          created_at: "2026-06-16T10:00:00.000Z",
        },
      ],
    })

    expect(images).toEqual([
      "https://blob.vercel-storage.com/photoshoot-1.png",
      "https://blob.vercel-storage.com/photoshoot-2.png",
      "https://blob.vercel-storage.com/photoshoot-3.png",
    ])
    expect(images).not.toContain("https://blob.vercel-storage.com/input-reference-not-gallery.png")
  })

  it("dedupes legacy rows already mirrored into ai_images", () => {
    const images = mergeGalleryImageUrls({
      aiRows: [
        {
          image_url: "https://blob.vercel-storage.com/mirrored.png",
          created_at: "2026-06-17T10:00:00.000Z",
        },
      ],
      legacyRows: [
        {
          selected_url: "https://blob.vercel-storage.com/mirrored.png",
          image_urls: "https://blob.vercel-storage.com/legacy-only.png",
          created_at: "2026-06-16T10:00:00.000Z",
        },
      ],
    })

    expect(images).toEqual([
      "https://blob.vercel-storage.com/mirrored.png",
      "https://blob.vercel-storage.com/legacy-only.png",
    ])
  })

  it("returns legacy Studio images from the live app gallery endpoint", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user-1" }, error: null })
    mocks.getEffectiveNeonUser.mockResolvedValue({ id: "neon-user-1" })
    mocks.sql
      .mockResolvedValueOnce([
        {
          image_url: "https://blob.vercel-storage.com/new-suite.png",
          created_at: "2026-06-17T10:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          selected_url: "https://blob.vercel-storage.com/old-studio.png",
          image_urls: null,
          created_at: "2026-06-18T10:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ video_url: "https://blob.vercel-storage.com/video.mp4" }])

    const { GET } = await import("@/app/api/app-v3/gallery/route")
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.images).toEqual([
      "https://blob.vercel-storage.com/old-studio.png",
      "https://blob.vercel-storage.com/new-suite.png",
    ])
    expect(payload.videos).toEqual(["https://blob.vercel-storage.com/video.mp4"])
    expect(mocks.sql).toHaveBeenCalledTimes(3)
    expect(String(mocks.sql.mock.calls[1][0])).toContain("FROM generated_images")
  })
})
