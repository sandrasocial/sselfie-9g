import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EditMode } from "@/components/app-v3/edit-mode"
import { groupGalleryVersions } from "@/components/app-v3/gallery-view"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"

vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent: vi.fn() }))

describe("Maya version trust", () => {
  afterEach(() => vi.restoreAllMocks())

  it("shows the original beside a saved edit and can revert without deleting the edit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ imageUrl: "https://assets.example.com/edited.png", aiImageId: 22 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    const onResult = vi.fn()

    render(
      <EditMode
        imageUrl="https://assets.example.com/original.png"
        format="photo"
        sourceImageId={11}
        onClose={vi.fn()}
        onResult={onResult}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Brighter" }))
    await screen.findByText("Saved to your Gallery as a new version.")
    expect(screen.getByRole("img", { name: "Original version" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Edited version" })).toBeInTheDocument()
    expect(onResult).toHaveBeenCalledWith("https://assets.example.com/edited.png", 22)

    fireEvent.click(screen.getByRole("button", { name: "Revert to original" }))
    await waitFor(() =>
      expect(onResult).toHaveBeenLastCalledWith("https://assets.example.com/original.png", 11)
    )
    expect(screen.getByText(/edited versions are still safe in Gallery/i)).toBeInTheDocument()
  })

  it("keeps a newer variant adjacent even when the API returns it before its original", () => {
    const asset = (input: Partial<AppV3GalleryAsset>): AppV3GalleryAsset => ({
      id: "ai_1",
      kind: "image",
      contentType: "photo",
      url: "https://assets.example.com/image.png",
      createdAt: "2026-07-17T10:00:00.000Z",
      isFavorite: false,
      canFavorite: true,
      canDelete: true,
      canDownload: true,
      canMakeMotion: true,
      ...input,
    })
    const grouped = groupGalleryVersions([
      asset({ id: "ai_2", variantOf: "ai_1", createdAt: "2026-07-17T11:00:00.000Z" }),
      asset({ id: "ai_3", createdAt: "2026-07-17T10:30:00.000Z" }),
      asset({ id: "ai_1" }),
    ])

    expect(grouped.map(item => item.id)).toEqual(["ai_1", "ai_2", "ai_3"])
  })
})
