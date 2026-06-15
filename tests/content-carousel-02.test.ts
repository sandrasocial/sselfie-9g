// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const screenshotUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/reel-references/reel-1/scene-1.png"
  const coverUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/reel-references/reel-1/cover.png"
  const generatedCoverUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/generated/tutorial-cover.png"
  const generatedResultUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/generated/tutorial-result.png"
  return {
    screenshotUrl,
    coverUrl,
    generatedCoverUrl,
    generatedResultUrl,
    generateShotImage: vi
      .fn()
      .mockResolvedValueOnce(generatedCoverUrl)
      .mockResolvedValueOnce(generatedResultUrl),
  }
})

vi.mock("server-only", () => ({}))

vi.mock("@/lib/db/client", () => ({
  sql: vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join("?")
    if (query.includes("FROM content_reel_references")) {
      return [
        {
          id: 1,
          media_id: "reel-1",
          permalink: "https://instagram.com/reel/1",
          hook_line: "the exact settings I use",
          views: 120000,
          kind: "cover",
          scene_index: null,
          image_url: mocks.coverUrl,
          label: "cover",
          created_at: "2026-06-15T00:00:00.000Z",
        },
        {
          id: 2,
          media_id: "reel-1",
          permalink: "https://instagram.com/reel/1",
          hook_line: "the exact settings I use",
          views: 120000,
          kind: "scene",
          scene_index: 1,
          image_url: mocks.screenshotUrl,
          label: "settings",
          created_at: "2026-06-15T00:00:00.000Z",
        },
      ]
    }
    if (query.includes("INSERT INTO content_carousels")) {
      return [{ id: 101, created_at: "2026-06-15T10:00:00.000Z" }]
    }
    return []
  }),
}))

vi.mock("@/lib/content-kit/llm", () => ({
  callContentKitLlm: vi.fn(async () =>
    JSON.stringify([
      {
        title: "Settings That Change The Shot",
        slug: "settings-that-change-the-shot",
        caption:
          "Try this tiny stack before you post. Comment KIT and I will send the simple version.",
        slides: [
          { kind: "hook", eyebrow: "Tutorial", title: "Change the shot", body: "Start here." },
          {
            kind: "step",
            stepNumber: 1,
            title: "Bad example",
            body: "Flat light makes it harder.",
          },
          {
            kind: "list",
            title: "Setting stack",
            items: ["Lock exposure", "Use back camera", "Step into window light"],
          },
          {
            kind: "before-after",
            eyebrow: "Before / After",
            title: "From this to this",
            body: "Same face. Better frame.",
          },
          {
            kind: "cta",
            eyebrow: "Save this",
            title: "Comment KIT",
            body: "I will send you the simple version.",
          },
        ],
      },
    ])
  ),
  extractJsonArray: (text: string) => JSON.parse(text),
}))

vi.mock("@/lib/analytics/reports", () => ({
  getLatestAnalyticsReports: vi.fn(async () => []),
}))

vi.mock("@/lib/content-kit/shoot-generator", () => ({
  getShoot: vi.fn(async () => null),
  generateShotImage: mocks.generateShotImage,
}))

vi.mock("@/lib/content-kit/demo-generator", () => ({
  listAdminSelfies: vi.fn(async () => [
    "https://blob.public.blob.vercel-storage.com/content-kit/selfies/sandra.png",
  ]),
}))

describe("CONTENT-CAROUSEL-02 new-world tutorial generation", () => {
  beforeEach(() => {
    mocks.generateShotImage.mockReset()
    mocks.generateShotImage
      .mockResolvedValueOnce(mocks.generatedCoverUrl)
      .mockResolvedValueOnce(mocks.generatedResultUrl)
  })

  it("generates cover/result images while preserving screenshots as composited overlays", async () => {
    const { generateTutorialCarousels } = await import("@/lib/content-kit/carousel-generator")

    const [deck] = await generateTutorialCarousels({
      mode: "tutorial",
      topic: "phone settings before a selfie shoot",
      world: "hotel-mirror",
      keyword: "KIT",
    })

    expect(mocks.generateShotImage).toHaveBeenCalledTimes(2)
    const generateInputs = mocks.generateShotImage.mock.calls.map(([input]) => input)
    expect(generateInputs.flatMap(input => input.inspirationUrls)).not.toContain(
      mocks.screenshotUrl
    )
    expect(generateInputs[0].inspirationUrls).toContain(mocks.coverUrl)

    const cover = deck.slides.find(slide => slide.kind === "hook")
    const beforeAfter = deck.slides.find(slide => slide.kind === "before-after")
    const screenshotSlide = deck.slides.find(slide =>
      slide.overlayAssets?.some(asset => asset.url === mocks.screenshotUrl)
    )

    expect(cover?.imageUrl).toBe(mocks.generatedCoverUrl)
    expect(cover?.headlineRender).toBe("baked")
    expect(beforeAfter?.overlayAssets?.[0]?.url).toBe(mocks.generatedResultUrl)
    expect(beforeAfter?.headlineRender).toBe("baked")
    expect(screenshotSlide?.overlayAssets?.[0]).toMatchObject({
      url: mocks.screenshotUrl,
      placement: "full",
      fit: "contain",
    })
  })
})
