import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EditMode } from "@/components/app-v3/edit-mode"
import { groupGalleryVersions } from "@/components/app-v3/gallery-view"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"

vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent: vi.fn() }))

describe("Maya version trust", () => {
  afterEach(() => vi.restoreAllMocks())

  it("keeps the original and saved edit recoverable through confirmed version history", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            imageUrl: "https://assets.example.com/edited.png",
            aiImageId: 22,
            editReceipt: {
              action: "apply",
              sourceAssetId: "ai_11",
              resultAssetId: "ai_22",
              rootAssetId: "ai_11",
              instruction: "Clean natural edit",
              historyDepth: 1,
              creditRequestId: "edit_request_123",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ imageUrl: "https://assets.example.com/original.png", aiImageId: 11 }),
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

    fireEvent.click(screen.getByRole("button", { name: /Clean Natural/i }))
    expect(screen.getByText("Ready to apply")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Use 1 credit" }))
    await screen.findByText("Saved to Gallery as a new version.")
    expect(screen.getByRole("button", { name: "Use Original" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use Version 1" })).toBeInTheDocument()
    expect(onResult).toHaveBeenCalledWith("https://assets.example.com/edited.png", 22)

    const confirmedRequest = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(confirmedRequest.conversation).toMatchObject({
      workspacePath: "edit-photo",
      action: "apply",
      sourceAssetId: "ai_11",
      creditConfirmation: { confirmed: true, expectedCost: 1 },
    })

    fireEvent.click(screen.getByRole("button", { name: "Undo last" }))
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
