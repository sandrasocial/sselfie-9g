// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GalleryView } from "@/components/app-v3/gallery-view"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
}))

vi.mock("@/lib/app-v3/download-asset", () => ({
  initiateAssetDownload: vi.fn().mockResolvedValue(true),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Wave 1 favorite cross-surface consistency", () => {
  it("keeps the Gallery tile selected after favoriting in fullscreen preview", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/favorite")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          assets: [
            {
              id: "ai_101",
              kind: "image",
              contentType: "photo",
              url: "https://example.com/photo.jpg",
              createdAt: "2026-07-18T08:00:00.000Z",
              isFavorite: false,
              title: "Quiet morning portrait",
              canFavorite: true,
              canDelete: true,
              canDownload: true,
              canMakeMotion: true,
            },
          ],
          counts: {
            all: 1,
            favorites: 0,
            photos: 1,
            photoshoots: 0,
            reelCovers: 0,
            carousels: 0,
            storySlides: 0,
            videos: 0,
          },
        }),
        { status: 200 }
      )
    })

    render(<GalleryView />)

    fireEvent.click(
      await screen.findByRole("button", { name: "Open Quiet morning portrait, item 1" })
    )
    const fullscreenFavorite = screen.getByRole("button", { name: "Add to favorites" })
    fireEvent.click(fullscreenFavorite)
    await waitFor(() => expect(fullscreenFavorite).toHaveAttribute("aria-pressed", "true"))

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.getByRole("button", { name: "Remove favorite" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })
})
