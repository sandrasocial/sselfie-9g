// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"
import { GalleryView } from "@/components/app-v3/gallery-view"
import { ImageLightbox } from "@/components/app-v3/image-lightbox"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

const concept = {
  id: "photo-1",
  title: "Editorial portrait",
  description: "A clear brand photo.",
  brief: {
    outfit: "black knit",
    setting: "window light",
    mood: "calm",
    pose: "looking into camera",
  },
}

const galleryAsset = {
  id: "ai_42",
  kind: "image" as const,
  contentType: "photo" as const,
  url: "https://example.com/photo.png",
  thumbnailUrl: "https://example.com/photo.png",
  sourceImageUrl: null,
  createdAt: "2026-07-18T12:00:00.000Z",
  isFavorite: false,
  title: "Editorial portrait",
  variantOf: null,
  canFavorite: true,
  canDelete: true,
  canDownload: true,
  canMakeMotion: true,
}

describe("Wave 1 Create favorites", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("toggles an accessible favorite from a finished result with rollback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "failed" }) } as Response)
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ConceptCard
        concept={concept}
        format="photo"
        gen={{
          status: "done",
          imageUrls: ["https://example.com/photo.png"],
          aiImageId: 42,
        }}
        onGenerate={vi.fn()}
      />
    )

    const favorite = screen.getByRole("button", { name: "Add to favorites" })
    expect(favorite).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(favorite)
    await waitFor(() => expect(favorite).toHaveAttribute("aria-pressed", "true"))
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-v3/gallery/favorite",
      expect.objectContaining({ body: JSON.stringify({ assetId: "ai_42", isFavorite: true }) })
    )

    fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove from favorites" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't update favorite/i)
    })
  })

  it("toggles the current asset from fullscreen preview", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response)
    )

    render(
      <ImageLightbox images={["https://example.com/photo.png"]} assetIds={[42]} onClose={vi.fn()} />
    )

    const favorite = screen.getByRole("button", { name: "Add to favorites" })
    fireEvent.click(favorite)
    await waitFor(() => expect(favorite).toHaveAttribute("aria-pressed", "true"))
  })

  it("uses the same selected state in Gallery and rolls back failed updates", async () => {
    let galleryLoads = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "/api/app-v3/gallery") {
          galleryLoads += 1
          return {
            ok: true,
            json: async () => ({
              assets: [galleryAsset],
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
          } as Response
        }
        if (url === "/api/app-v3/gallery/favorite") {
          return { ok: false, json: async () => ({ error: "failed" }) } as Response
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
    )

    render(<GalleryView />)

    const favorite = await screen.findByRole("button", { name: "Favorite" })
    expect(favorite).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(favorite)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Favorite" })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't update favorite. Try again.")
    })
    expect(galleryLoads).toBe(1)
  })
})
