// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  memoryFactSchema,
  parseMemoryFacts,
  renderMemoryContext,
  isTemporaryMemory,
} from "@/lib/app-v3/maya/memory-facts"
import { getMayaHomeBrandContext } from "@/lib/maya/home-brand-context"
import { searchGalleryPhotos } from "@/lib/app-v3/gallery-search"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"
const mocks = vi.hoisted(() => ({ generate: vi.fn() }))
vi.mock("ai", () => ({ generateText: mocks.generate, generateObject: mocks.generate }))
vi.mock("@/lib/maya/openrouter", () => ({ createMayaOpenRouterModel: () => "test" }))
import {
  generateInstagramCaption,
  shouldRegenerateCaption,
} from "@/lib/feed-planner/caption-writer"
import { reviewCarouselSlide } from "@/lib/app-v3/maya/carousel-review"

describe("current memory", () => {
  it("carries replacement and forgotten facts through the neutral chat context", () => {
    const facts = parseMemoryFacts({
      offer: {
        key: "offer",
        value: "New workshop",
        source: "My new offer is a workshop",
        updatedAt: "2026-09-06",
      },
      audience: {
        key: "audience",
        value: null,
        source: "Forget my old audience",
        updatedAt: "2026-09-06",
      },
    })
    const context = getMayaHomeBrandContext(
      "Business Type: coach\n" +
        renderMemoryContext({
          brandNotes: "old course",
          preferences: "for this shoot wear linen",
          facts,
        })
    )
    expect(context).toContain("offer (2026-09-06")
    expect(context).toContain("audience: FORGOTTEN")
    expect(context).toContain("Current facts replace conflicting older")
  })
  it("rejects malformed facts and detects temporary directions", () => {
    expect(memoryFactSchema.safeParse({ key: "unknown", value: "a", source: "me" }).success).toBe(
      false
    )
    expect(parseMemoryFacts({ offer: { key: "voice", value: "x" } })).toEqual({})
    expect(isTemporaryMemory("For this carousel use blue")).toBe(true)
    expect(isTemporaryMemory("I always prefer natural light")).toBe(false)
  })
})
describe("photo reuse", () => {
  const photos = [
    {
      id: "ai_1",
      kind: "image",
      title: "Photo",
      description: "Relaxed coffee at a cafe",
      isUsed: false,
    },
    { id: "ai_2", kind: "image", title: "Photo", labels: "coffee", isUsed: true },
    { id: "ai_3", kind: "image", title: "Photo", prompt: "coffee blazer luxury", isUsed: false },
  ] as AppV3GalleryAsset[]
  it("uses actual descriptions and labels, excludes posted photos, ignores generation prompts", () => {
    expect(searchGalleryPhotos(photos, "coffee", true).map(a => a.id)).toEqual(["ai_1"])
    expect(searchGalleryPhotos(photos, "coffee").map(a => a.id)).toEqual(["ai_1", "ai_2"])
    expect(searchGalleryPhotos(photos, "luxury")).toEqual([])
  })
})
describe("caption length and visual review", () => {
  beforeEach(() => mocks.generate.mockReset())
  it("accepts a deliberate short caption without expanding it", async () => {
    mocks.generate.mockResolvedValue({ text: "Start with the photo you already have." })
    const result = await generateInstagramCaption({
      postPosition: 1,
      shotType: "photo",
      purpose: "short caption",
      emotionalTone: "calm",
      brandProfile: {},
      targetAudience: "creators",
      brandVoice: "direct",
      captionType: "value",
      length: "short",
      approvedExamples: ["One useful thought."],
      memberContext: "voice: simple",
    })
    expect(result.caption).toBe("Start with the photo you already have.")
    expect(mocks.generate).toHaveBeenCalledTimes(1)
    expect(shouldRegenerateCaption(result.caption)).toBe(false)
    expect(mocks.generate.mock.calls[0][0].prompt).toContain("VOICE ONLY")
  })
  it("does not call a failed visual review a passed review", async () => {
    mocks.generate.mockRejectedValue(new Error("timeout"))
    expect((await reviewCarouselSlide(Buffer.from("image"), undefined, 3, "owner")).status).toBe(
      "unavailable"
    )
    mocks.generate.mockResolvedValue({ object: { issues: ["Headline clipped"] } })
    expect(await reviewCarouselSlide(Buffer.from("image"), undefined, 3, "owner")).toMatchObject({
      slide: 3,
      status: "needs_review",
      issues: ["Headline clipped"],
    })
  })
})
