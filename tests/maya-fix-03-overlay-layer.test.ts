// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { buildTextLayerSpecs } from "@/lib/app-v3/overlay-layer"
import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const read = (path: string) => readFileSync(path, "utf8")

const bakedTextPhrases =
  /Render the text|Render all text|Then add|headline prominently|spelled exactly|perfectly legible/i

const brief: CreativeBrief = {
  outfit: "The Row cream cashmere turtleneck",
  setting: "a marble cafe table by a tall window in Paris morning light",
  mood: "calm, assured",
  pose: "seated, mid-thought, looking out the window",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light",
  graphic: {
    headline: "Look expensive without trying",
    subline: "Three quiet styling moves",
    overlayStyle: "editorial-serif-center",
    designSystem: "cutout-editorial",
    slides: [
      {
        heading: "Start with one clean base",
        body: "Let the shape do the work",
        visual: "identity",
      },
      { heading: "Repeat the same quiet tones", body: "It reads intentional", visual: "detail" },
      {
        heading: "Save this for your next shoot",
        body: "Use it when you feel stuck",
        role: "cta",
        visual: "text-only",
      },
    ],
  },
}

describe("MAYA-FIX-03 editable overlay text layer", () => {
  it("keeps graphic generation prompts text-free", () => {
    const jobs = [
      ...compileConceptJobs(brief, "carousel"),
      ...compileConceptJobs(brief, "reel-cover", undefined, "one_pass"),
      ...compileConceptJobs(brief, "story-slide", undefined, "two_pass"),
    ]
    const prompts = jobs.flatMap(job => job.passes.map(pass => pass.prompt))

    expect(prompts.join("\n")).not.toMatch(bakedTextPhrases)
    expect(prompts.join("\n")).toMatch(/Do not render any text/)
    expect(jobs.every(job => job.passes.length === 1)).toBe(true)
  })

  it("builds editable layer specs from graphic copy instead of baking copy into prompts", () => {
    expect(buildTextLayerSpecs(brief, "photo")).toEqual([])

    const carouselLayers = buildTextLayerSpecs(brief, "carousel")
    expect(carouselLayers).toHaveLength(3)
    expect(carouselLayers[0]).toMatchObject({
      headline: "Start with one clean base",
      subline: "Let the shape do the work",
      styleId: "editorial-serif-center",
      role: "hook",
      format: "carousel",
    })
    expect(carouselLayers[2]).toMatchObject({ role: "cta", slideIndex: 2, slideCount: 3 })

    const coverLayers = buildTextLayerSpecs(brief, "reel-cover")
    expect(coverLayers).toHaveLength(1)
    expect(coverLayers[0]).toMatchObject({
      headline: "Look expensive without trying",
      subline: "Three quiet styling moves",
      format: "reel-cover",
    })
  })

  it("makes the overlay composer local, editable, and short-copy constrained", () => {
    const composer = read("components/app-v3/overlay-composer.tsx")

    expect(composer).not.toContain("/api/app-v3/maya/generate")
    expect(composer).not.toContain("Uses 1 credit")
    expect(composer).toContain("maxLength={48}")
    expect(composer).toContain("maxLength={80}")
    expect(composer).toContain("Keep it short, like a magazine cover line.")
    expect(composer).toContain("downloadLayeredImage")
  })
})
