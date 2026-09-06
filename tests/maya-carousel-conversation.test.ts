// @vitest-environment node
import { describe, it, expect, vi } from "vitest"
import sharp from "sharp"
import {
  composeCarouselText,
  renderCarouselBackground,
  carouselScenePrompt,
} from "@/lib/app-v3/maya/carousel-renderer"
import {
  requestedSlideIndex,
  slideRevision,
  restoreSlide,
} from "@/lib/app-v3/maya/carousel-revisions"
import { sanitizeServerGenState } from "@/lib/app-v3/maya/draft-snapshot"
import { sanitizeTextOverlaySpec, type TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import type { CreativePlanOutput } from "@/lib/app-v3/maya/creative-plan"
const model = vi.hoisted(() => ({
  edit: vi.fn(),
  generate: vi.fn(),
  toFile: vi.fn(async (_: unknown, name: string) => ({ name })),
}))
vi.mock("openai", () => ({
  default: class {
    images = { edit: model.edit, generate: model.generate }
  },
  toFile: model.toFile,
}))
vi.mock("server-only", () => ({}))
const spec: TextOverlaySpec = {
  headline: "Your story belongs here",
  subline: "Start with one real moment.",
  format: "carousel",
  style: "top-band-minimal",
  position: "bottom",
}
const output: CreativePlanOutput = {
  title: "A real memory",
  purpose: "tell the beginning",
  visualConcept: "original photo",
  referenceImageStrategy: "screenshot_preserve_exact",
  reasonThisMatchesUserIntent: "real proof",
  sourceAssets: [{ url: "https://test.public.blob.vercel-storage.com/memory.png", role: "photo" }],
}
describe("conversational carousels", () => {
  it("targets exact slide numbers and refuses invalid indices", () => {
    expect(requestedSlideIndex("Make the words on slide 6 bigger")).toBe(5)
    expect(requestedSlideIndex("Change slide #0")).toBe(-1)
    expect(requestedSlideIndex("Change the words")).toBe(null)
    expect(() => slideRevision({ imageUrls: ["one"] }, 5, "op")).toThrow()
  })
  it("changes and undoes only one slide, surviving saved state hydration", () => {
    const state = {
      status: "done",
      imageUrls: ["https://a/one", "https://a/two"],
      textOverlaySpecs: [spec, spec],
      bakedImageUrls: ["https://a/b1", "https://a/b2"],
      aiImageIds: [1, 2],
    }
    const revision = slideRevision(state, 1, "edit-2")
    const edited = restoreSlide(state, { ...revision, imageUrl: "https://a/new" })
    expect(edited.imageUrls[0]).toBe(state.imageUrls[0])
    expect(state.imageUrls[1]).toBe("https://a/two")
    const saved = sanitizeServerGenState({
      project: { ...edited, carouselRevisions: [revision] },
    }).project
    expect(restoreSlide(saved, saved.carouselRevisions![0]).imageUrls).toEqual(state.imageUrls)
  })
  it("composes readable 4:5 PNGs and preserves untouched photo pixels", async () => {
    const base = await sharp({
      create: { width: 1080, height: 1350, channels: 3, background: "#357944" },
    })
      .png()
      .toBuffer()
    const rendered = await composeCarouselText(base, spec)
    expect(await sharp(rendered).metadata()).toMatchObject({
      width: 1080,
      height: 1350,
      format: "png",
    })
    const raw = await sharp(rendered).removeAlpha().raw().toBuffer()
    expect([...raw.subarray(0, 3)]).toEqual([53, 121, 68])
    await expect(
      composeCarouselText(base, { ...spec, headline: "Too much text ".repeat(200) })
    ).rejects.toThrow("too much copy")
  })
  it("keeps list and layout controls through persistence", () => {
    expect(
      sanitizeTextOverlaySpec({
        ...spec,
        layout: "notes",
        items: ["Your story", "Your phone"],
        color: "#ff0000",
        size: "l",
      })
    ).toMatchObject({
      items: ["Your story", "Your phone"],
      layout: "notes",
      color: "#ff0000",
      size: "l",
    })
  })
  it("preserves original screenshots without calling image generation", async () => {
    const asset = await sharp({
      create: { width: 900, height: 720, channels: 3, background: "#aa2244" },
    })
      .png()
      .toBuffer()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(asset)))
    const result = await renderCarouselBackground({
      output,
      visualDirection: "member brand",
      identityUrls: [],
      quality: "medium",
    })
    const raw = await sharp(result.buffer).removeAlpha().raw().toBuffer()
    const position = (100 * 1080 + 100) * 3
    expect([...raw.subarray(position, position + 3)]).toEqual([170, 34, 68])
    vi.unstubAllGlobals()
    await expect(
      renderCarouselBackground({
        output: { ...output, sourceAssets: [] },
        visualDirection: "",
        identityUrls: [],
        quality: "medium",
      })
    ).rejects.toThrow("original photo")
  })
  it("allows detail scenes without injecting a face and anchors identity to every angle", () => {
    expect(
      carouselScenePrompt(
        { ...output, referenceImageStrategy: "no_reference" },
        "violet and clean sans",
        0
      )
    ).toContain("does not need the member's face")
    expect(carouselScenePrompt(output, "violet and clean sans", 4)).toContain(
      "All 4 attached images"
    )
  })
  it("sends every identity angle to the image API and no selfie for detail slides", async () => {
    const asset = await sharp({
      create: { width: 1080, height: 1350, channels: 3, background: "#cccccc" },
    })
      .png()
      .toBuffer()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(asset))
    )
    model.edit.mockResolvedValue({ data: [{ b64_json: asset.toString("base64") }] })
    model.generate.mockResolvedValue({ data: [{ b64_json: asset.toString("base64") }] })
    const portrait = {
      ...output,
      sourceAssets: [],
      referenceImageStrategy: "selfie_identity_anchor" as const,
    }
    await renderCarouselBackground({
      output: portrait,
      visualDirection: "blue and simple",
      identityUrls: [1, 2, 3, 4].map(
        i => `https://test.public.blob.vercel-storage.com/selfie-${i}.png`
      ),
      quality: "medium",
    })
    expect(model.edit.mock.calls.at(-1)?.[0].image).toHaveLength(4)
    await renderCarouselBackground({
      output: {
        ...portrait,
        referenceImageStrategy: "no_reference",
        visualConcept: "A coffee cup detail",
      },
      visualDirection: "blue and simple",
      identityUrls: ["https://test.public.blob.vercel-storage.com/selfie.png"],
      quality: "medium",
    })
    expect(model.generate).toHaveBeenCalledTimes(1)
    expect(model.edit).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
