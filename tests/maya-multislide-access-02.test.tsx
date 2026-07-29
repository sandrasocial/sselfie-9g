// MAYA-MULTISLIDE-ACCESS-02 (2026-07-20) - Sandra's live report: the carousel/multislide
// fullscreen viewer was "buggy and not working as it should" (no way to jump to a specific
// slide - only arrow-through-one-at-a-time), and there was no way to download every slide at
// once ("not just one by one"). This file pins the two real fixes:
//
// 1. A tappable, numbered thumbnail rail in BOTH the concept card and the fullscreen viewer,
//    so any slide is one tap away instead of N arrow-clicks away.
// 2. A "Download all" bulk action (one zip, one click) alongside the existing per-slide
//    download, in both surfaces plus the photoshoot-set grid in maya-concierge.tsx.

import { readFileSync } from "node:fs"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { ConceptCard } from "@/components/app-v3/concept-card"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
}))

vi.mock("@/lib/app-v3/download-asset", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/app-v3/download-asset")>()
  return { ...actual, initiateAssetDownload: vi.fn(async () => true) }
})

const read = (path: string) => readFileSync(path, "utf8")

function stubZipEnvironment() {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  URL.createObjectURL = vi.fn(() => "blob:slide")
  URL.revokeObjectURL = vi.fn()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      blob: async () => new Blob([new ArrayBuffer(8)]),
    }))
  )
  return () => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.unstubAllGlobals()
  }
}

const carouselConcept = {
  id: "concept-carousel",
  title: "The Callout Hook",
  description: "A seven-slide carousel about the messy middle.",
  brief: { outfit: "black knit", setting: "quiet studio", mood: "calm", pose: "seated" },
}

function carouselImages(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://example.com/slide-${i + 1}.png`)
}

describe("ImageLightbox: numbered slide navigation and bulk download", () => {
  let restore: () => void
  beforeEach(() => {
    restore = stubZipEnvironment()
  })
  afterEach(() => {
    restore()
    vi.clearAllMocks()
  })

  it("renders one tappable, numbered thumbnail per slide", () => {
    render(<ImageLightbox images={carouselImages(7)} onClose={vi.fn()} />)
    const rail = screen.getByRole("tablist", { name: "All slides" })
    const tabs = within(rail).getAllByRole("tab")
    expect(tabs).toHaveLength(7)
    expect(tabs[0]).toHaveAttribute("aria-selected", "true")
    expect(tabs[2]).toHaveAttribute("aria-selected", "false")
  })

  it("jumps straight to the tapped slide instead of requiring arrow-by-arrow navigation", () => {
    render(<ImageLightbox images={carouselImages(5)} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole("tab", { name: "Slide 4 of 5" }))
    expect(screen.getByAltText("Photo 4")).toBeInTheDocument()
    expect(screen.getByText("4 / 5")).toBeInTheDocument()
  })

  it("opens directly on startIndex (a tapped card thumbnail)", () => {
    render(<ImageLightbox images={carouselImages(5)} startIndex={2} onClose={vi.fn()} />)
    expect(screen.getByAltText("Photo 3")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Slide 3 of 5" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("does not render a thumbnail rail or bulk button for a single image", () => {
    render(<ImageLightbox images={carouselImages(1)} onClose={vi.fn()} />)
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /download all/i })).not.toBeInTheDocument()
  })

  it("saves every slide to the device as its own image on Download all", async () => {
    // 2026-07-29 (Sandra): individual saves, never a .zip — one object URL per slide.
    render(<ImageLightbox images={carouselImages(3)} conceptTitle="My Carousel" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Download all 3" }))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(3), { timeout: 4000 })
    expect(fetch).toHaveBeenCalledTimes(3)
    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "lightbox",
        assetId: null,
        format: null,
      })
    )
  })

  it("prefers the baked render over the clean base when saving all", async () => {
    render(
      <ImageLightbox
        images={["https://example.com/clean-1.png", "https://example.com/clean-2.png"]}
        bakedImageUrls={["https://example.com/baked-1.png", null]}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Download all 2" }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(fetch).toHaveBeenCalledWith("https://example.com/baked-1.png")
    expect(fetch).toHaveBeenCalledWith("https://example.com/clean-2.png")
  })

  it("shows a plain retry state when a slide fails to save", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    render(<ImageLightbox images={carouselImages(2)} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Download all 2" }))
    await waitFor(() =>
      expect(screen.getByText("Some photos didn't save. Please try again.")).toBeInTheDocument()
    )
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it("keeps the single-slide Download button and its exact asset lineage untouched", async () => {
    render(
      <ImageLightbox
        images={carouselImages(2)}
        assetIds={["ai_101", "ai_202"]}
        formats={["carousel", "carousel"]}
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
      "https://example.com/slide-2.png",
      expect.any(String)
    )
  })

  it("never renders a blank modal even if a stale index outlives a shrunk images array", () => {
    // Defensive clamp: guards a future caller passing a shorter array in place without a
    // remount, instead of silently rendering nothing (images[index] undefined -> null).
    const { rerender } = render(<ImageLightbox images={carouselImages(5)} startIndex={4} onClose={vi.fn()} />)
    expect(screen.getByAltText("Photo 5")).toBeInTheDocument()
    rerender(<ImageLightbox images={carouselImages(2)} startIndex={4} onClose={vi.fn()} />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})

describe("ConceptCard: inline slide access and bulk download for carousels", () => {
  let restore: () => void
  beforeEach(() => {
    restore = stubZipEnvironment()
  })
  afterEach(() => {
    restore()
    vi.clearAllMocks()
  })

  function renderDoneCarousel(onOpen = vi.fn()) {
    render(
      <ConceptCard
        concept={carouselConcept}
        format="carousel"
        gen={{ status: "done", imageUrls: carouselImages(4) }}
        onGenerate={vi.fn()}
        onOpen={onOpen}
      />
    )
    return onOpen
  }

  it("shows a numbered thumbnail per slide so any slide is one tap away", () => {
    renderDoneCarousel()
    expect(screen.getByRole("button", { name: "View slide 1 of 4" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "View slide 4 of 4" })).toBeInTheDocument()
  })

  it("opens the fullscreen viewer at the exact tapped slide, not always slide 1", () => {
    const onOpen = renderDoneCarousel()
    fireEvent.click(screen.getByRole("button", { name: "View slide 3 of 4" }))
    expect(onOpen).toHaveBeenCalledWith(carouselImages(4), 2)
  })

  it("still opens at the start when the cover image itself is tapped", () => {
    const onOpen = renderDoneCarousel()
    fireEvent.click(screen.getByRole("button", { name: "View full size" }))
    expect(onOpen).toHaveBeenCalledWith(carouselImages(4))
  })

  it("saves every slide to the device on Download all, without leaving the chat", async () => {
    renderDoneCarousel()
    fireEvent.click(screen.getByRole("button", { name: "Download all 4" }))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(4), { timeout: 5000 })
    expect(fetch).toHaveBeenCalledTimes(4)
    await waitFor(() =>
      expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
        source: "concept-card",
        assetId: null,
        format: "carousel",
      })
    )
  })

  it("keeps View all slides as a real primary action, not a buried text link", () => {
    renderDoneCarousel()
    const button = screen.getByRole("button", { name: "View all slides" })
    expect(button.className).not.toContain("underline")
  })
})

describe("maya-concierge wires startIndex/conceptTitle and keeps the frozen asset-lineage contract", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")

  it("passes a tapped thumbnail's index through to the fullscreen viewer", () => {
    expect(concierge).toContain("onOpen={(urls, startIndex) =>")
    expect(concierge).toContain("startIndex,")
    expect(concierge).toContain("conceptTitle: concept.title,")
    expect(concierge).toContain("startIndex={lightbox.startIndex}")
    expect(concierge).toContain("conceptTitle={lightbox.conceptTitle}")
  })

  it("never rewrites the frozen assetIds/bakedAssetIds snapshot lines (asset-lineage contract)", () => {
    expect(concierge).toContain("assetIds={lightbox.assetIds}")
    expect(concierge).toContain("bakedAssetIds={lightbox.bakedAssetIds}")
    expect(concierge).toContain("formats={lightbox.formats}")
  })

  it("re-syncs bakedAssetIds live so a slide's download target updates the moment its bake lands", () => {
    expect(concierge).toContain("liveLightboxBakedIds")
    expect(concierge).toContain("genState[lightbox.key]?.bakedAiImageIds")
  })

  it("upgrades the photoshoot-set grid to per-thumbnail navigation plus a bulk download", () => {
    const start = concierge.indexOf("const key = `${m.id}:photoshoot-set`")
    const block = concierge.slice(start, concierge.indexOf("})()}", start))
    expect(block).toContain("openPhotoshootLightbox(index)")
    expect(block).toContain("downloadAllSlides")
    expect(block).toContain("View all")
  })
})
