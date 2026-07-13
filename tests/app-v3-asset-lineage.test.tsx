import { fireEvent, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { ConceptCard } from "@/components/app-v3/concept-card"
import { sanitizeServerGenState } from "@/lib/app-v3/maya/draft-snapshot"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
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

  it("sends the exact selected lightbox asset id and format without changing the download", () => {
    const open = vi.fn()
    vi.stubGlobal("open", open)

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

    expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
      source: "lightbox",
      assetId: "ai_202",
      format: "carousel",
    })
    expect(open).toHaveBeenCalledWith("https://example.com/two.png", "_blank", "noreferrer")
  })

  it("keeps lightbox downloads fail-open when lineage is unavailable", () => {
    const open = vi.fn()
    vi.stubGlobal("open", open)

    render(<ImageLightbox images={["https://example.com/one.png"]} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
      source: "lightbox",
      assetId: null,
      format: null,
    })
    expect(open).toHaveBeenCalledTimes(1)
  })

  it("uses the baked variant id when the lightbox downloads a baked result", () => {
    const open = vi.fn()
    vi.stubGlobal("open", open)

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

    expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
      source: "lightbox",
      assetId: "ai_402",
      format: "reel-cover",
    })
    expect(open).toHaveBeenCalledWith("https://example.com/baked.png", "_blank", "noreferrer")
  })

  it("sends the exact concept-card ai_images id on a direct result download", () => {
    const open = vi.fn()
    vi.stubGlobal("open", open)

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

    expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
      source: "concept-card",
      assetId: 303,
      format: "photo",
    })
    expect(open).toHaveBeenCalledWith("https://example.com/generated.png", "_blank", "noreferrer")
  })

  it("uses exact baked-image and video ids for direct concept-card downloads", () => {
    const open = vi.fn()
    vi.stubGlobal("open", open)

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
    expect(recordSuiteDownloadForReview).toHaveBeenLastCalledWith({
      source: "concept-card",
      assetId: 502,
      format: "reel-cover",
    })

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

    fireEvent.click(screen.getByRole("link", { name: "Download video" }))
    expect(recordSuiteDownloadForReview).toHaveBeenLastCalledWith({
      source: "concept-card",
      assetId: "video_603",
      format: "video",
    })
  })

  it("keeps Gallery and Maya lightboxes aligned with their per-image ids and formats", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(gallery).toContain("assetIds={displayedImages.map(asset => asset.id)}")
    expect(gallery).toContain("formats={displayedImages.map(asset => asset.contentType)}")
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
        },
        video: {
          status: "done",
          videoUrl: "https://example.com/result.mp4",
          videoAssetId: "video_703",
        },
      })
    ).toMatchObject({
      image: { bakedAiImageIds: [702] },
      video: { videoAssetId: "video_703" },
    })

    const continuity = read("components/app-v3/continuity.ts")
    expect(continuity).toContain("const bakedAiImageIds = Array.isArray(state.bakedAiImageIds)")
    expect(continuity).toContain("/^video_[1-9]\\d*$/.test(state.videoAssetId)")
  })
})
