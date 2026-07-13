// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const screenshotUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/reel-references/reel-1/scene-1.png"
  const coverUrl =
    "https://blob.public.blob.vercel-storage.com/content-kit/reel-references/reel-1/cover.png"
  const styledUrl = (i: number) =>
    `https://blob.public.blob.vercel-storage.com/content-kit/styled/tutorial-${i}.png`
  let redesignCalls = 0
  return {
    screenshotUrl,
    coverUrl,
    resetRedesignCounter: () => {
      redesignCalls = 0
    },
    redesignContentSlide: vi.fn(async (_input: any) => styledUrl(++redesignCalls)),
    pickContentStyleReference: vi.fn(async () => ({
      imageUrl: "https://blob.public.blob.vercel-storage.com/content-kit/style/tutorial.png",
      label: "approved tutorial anchor",
    })),
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
            body: "Still you. Better frame.",
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
}))

vi.mock("@/lib/content-kit/demo-generator", () => ({
  listAdminSelfies: vi.fn(async () => [
    "https://blob.public.blob.vercel-storage.com/content-kit/selfies/sandra.png",
  ]),
}))

vi.mock("@/lib/content-kit/slide-redesign-generator", () => ({
  pickContentStyleReference: mocks.pickContentStyleReference,
  redesignContentSlide: mocks.redesignContentSlide,
}))

describe("CONTENT-CAROUSEL-02/03 tutorial image-to-image generation", () => {
  beforeEach(() => {
    mocks.resetRedesignCounter()
    mocks.redesignContentSlide.mockClear()
    mocks.pickContentStyleReference.mockClear()
  })

  it("redesigns each tutorial slide from real reel frames into finished baked slides", async () => {
    const { generateTutorialCarousels } = await import("@/lib/content-kit/carousel-generator")

    const [deck] = await generateTutorialCarousels({
      mode: "tutorial",
      topic: "phone settings before a selfie shoot",
      keyword: "KIT",
    })

    expect(mocks.pickContentStyleReference).toHaveBeenCalledWith("tutorial")
    expect(mocks.redesignContentSlide).toHaveBeenCalledTimes(deck.slides.length)
    const calls = mocks.redesignContentSlide.mock.calls.map(([input]) => input)
    expect(calls.some(input => input.referenceUrl === mocks.screenshotUrl)).toBe(true)
    expect(calls.some(input => input.referenceUrl === mocks.coverUrl)).toBe(true)
    expect(calls.every(input => input.category === "tutorial")).toBe(true)

    expect(deck.slides.every(slide => slide.imageUrl?.includes("/content-kit/styled/"))).toBe(true)
    expect(deck.slides.every(slide => slide.headlineRender === "baked")).toBe(true)
    expect(deck.slides.every(slide => !slide.overlayAssets?.length)).toBe(true)
    expect(deck.slides.every(slide => !slide.accents?.length)).toBe(true)
  })

  it("accepts a Suite-feature-demo topic alongside photo-technique topics (2026-07-05)", async () => {
    // Sandra: no new carousel engine needed, but the tutorial mode's rules only ever described
    // teaching a photo technique (settings/light/pose/crop). A "showcase what the Suite does"
    // marketing topic needs the same engine to recognize a second, distinct teaching mode: walk
    // through a real app workflow using real screenshots, never an invented mockup.
    const { generateTutorialCarousels } = await import("@/lib/content-kit/carousel-generator")
    const { callContentKitLlm } = await import("@/lib/content-kit/llm")

    await generateTutorialCarousels({
      mode: "tutorial",
      topic: "what SSELFIE Suite actually creates from one selfie",
      keyword: "KIT",
    })

    const prompt = (callContentKitLlm as any).mock.calls.at(-1)[0] as string
    expect(prompt).toContain("what a specific SSELFIE Suite feature or workflow actually does")
    expect(prompt).toContain("real app screenshots/reel references as the visual proof")
    expect(prompt).toContain("never an invented mockup or generic SaaS-style illustration")
    expect(prompt).toContain("it does not also teach a photo technique")
  })
})
