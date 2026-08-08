import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { ConceptCard } from "@/components/app-v3/concept-card"
import { sanitizeServerGenState } from "@/lib/app-v3/maya/draft-snapshot"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
}))

vi.mock("@/lib/app-v3/download-asset", () => ({
  initiateAssetDownload: vi.fn(async () => true),
}))

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("App v3 stable asset analytics lineage", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it("records persisted ai_images ids on every successful suite_image_generated event", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")

    expect(route).toContain("ai_image_ids: aiImageIds")
    expect(route).toContain("ai_image_id: aiImageIds[0] ?? null")
    expect(route).toMatch(/logGenerated\(\s*1,\s*persisted\.map\(image => image\.id\)\s*\)/)
    expect(route).toMatch(
      /logGenerated\(\s*imageUrls\.length,\s*persisted\.map\(image => image\.id\)\s*\)/
    )
  })

  it("sends the exact selected lightbox asset id and format without changing the download", async () => {
    render(
      <ImageLightbox
        images={["https://example.com/one.png", "https://example.com/two.png"]}
        assetIds={["ai_101", "ai_202"]}
        formats={["photo", "carousel"]}
        startIndex={1}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "lightbox",
        assetId: "ai_202",
        format: "carousel",
      })
    )
    expect(initiateAssetDownload).toHaveBeenCalledWith(
      "https://example.com/two.png",
      expect.any(String)
    )
  })

  it("keeps lightbox downloads fail-open when lineage is unavailable", async () => {
    render(<ImageLightbox images={["https://example.com/one.png"]} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "lightbox",
        assetId: null,
        format: null,
      })
    )
  })

  it("uses the baked variant id when the lightbox downloads a baked result", async () => {
    render(
      <ImageLightbox
        images={["https://example.com/clean.png"]}
        bakedImageUrls={["https://example.com/baked.png"]}
        assetIds={["ai_401"]}
        bakedAssetIds={["ai_402"]}
        formats={["reel-cover"]}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "lightbox",
        assetId: "ai_402",
        format: "reel-cover",
      })
    )
    expect(initiateAssetDownload).toHaveBeenCalledWith(
      "https://example.com/baked.png",
      expect.any(String)
    )
  })

  it("sends the exact concept-card ai_images id on a direct result download", async () => {
    render(
      <ConceptCard
        concept={
          {
            id: "concept-1",
            title: "Editorial founder portrait",
            description: "Soft natural light",
            brief: { subject: "Founder" },
          } as any
        }
        gen={{
          status: "done",
          imageUrls: ["https://example.com/generated.png"],
          aiImageId: 303,
          aiImageIds: [303],
        }}
        format="photo"
        onGenerate={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "concept-card",
        assetId: 303,
        format: "photo",
      })
    )
    expect(initiateAssetDownload).toHaveBeenCalledWith(
      "https://example.com/generated.png",
      expect.any(String)
    )
  })

  it("uses exact baked-image and video ids for direct concept-card downloads", async () => {
    const { rerender } = render(
      <ConceptCard
        concept={
          {
            id: "concept-baked",
            title: "Baked cover",
            description: "Cover with text",
            brief: { subject: "Founder" },
          } as any
        }
        gen={{
          status: "done",
          imageUrls: ["https://example.com/clean.png"],
          bakedImageUrls: ["https://example.com/baked.png"],
          aiImageId: 501,
          aiImageIds: [501],
          bakedAiImageIds: [502],
        }}
        format="reel-cover"
        onGenerate={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))
    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenLastCalledWith({
        source: "concept-card",
        assetId: 502,
        format: "reel-cover",
      })
    )

    rerender(
      <ConceptCard
        concept={
          {
            id: "concept-video",
            title: "Editorial motion",
            description: "Subtle movement",
            brief: { subject: "Founder" },
          } as any
        }
        gen={{
          status: "done",
          videoUrl: "https://example.com/result.mp4",
          videoAssetId: "video_603",
        }}
        format="video"
        onGenerate={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download video" }))
    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenLastCalledWith({
        source: "concept-card",
        assetId: "video_603",
        format: "video",
      })
    )
  })

  it("keeps Gallery and Maya lightboxes aligned with their per-image ids and formats", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    // 2026-07-29 (UX audit U5): the lightbox scope is either a carousel/story SET or the
    // page's single images — ids and formats stay aligned per-image within that scope.
    expect(gallery).toContain("const scope = lightboxSet ?? displayedImages")
    expect(gallery).toContain("assetIds={scope.map(asset => asset.id)}")
    expect(gallery).toContain("formats={scope.map(asset => asset.contentType)}")
    expect(concierge).toContain("assetIds={lightbox.assetIds}")
    expect(concierge).toContain("bakedAssetIds={lightbox.bakedAssetIds}")
    expect(concierge).toContain("formats={lightbox.formats}")
    expect(concierge).toMatch(/assetIds:\s*gen\.aiImageIds/)
    expect(concierge).toContain("bakedAssetIds: gen.bakedAiImageIds")
    expect(concierge).toContain("videoAssetId: `video_${startData.videoId}`")
  })

  it("preserves exact baked-image and video ids across Maya draft restoration", () => {
    expect(
      sanitizeServerGenState({
        image: {
          status: "done",
          imageUrls: ["https://example.com/clean.png"],
          bakedImageUrls: ["https://example.com/baked.png"],
          bakedAiImageIds: [702],
          calendarPlacement: {
            scheduledAt: "2026-08-11T08:00:00.000Z",
            position: 7,
            caption: "Ready to publish.",
          },
        },
        video: {
          status: "done",
          videoUrl: "https://example.com/result.mp4",
          videoAssetId: "video_703",
        },
      })
    ).toMatchObject({
      image: {
        bakedAiImageIds: [702],
        calendarPlacement: {
          scheduledAt: "2026-08-11T08:00:00.000Z",
          position: 7,
          caption: "Ready to publish.",
        },
      },
      video: { videoAssetId: "video_703" },
    })

    const continuity = read("components/app-v3/continuity.ts")
    expect(continuity).toContain("const bakedAiImageIds = Array.isArray(state.bakedAiImageIds)")
    expect(continuity).toContain("/^video_[1-9]\\d*$/.test(state.videoAssetId)")
  })
})
