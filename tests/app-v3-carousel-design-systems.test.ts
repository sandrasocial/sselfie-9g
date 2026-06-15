// MAYA-REBUILD-16 / CONTENT-CAROUSEL-04 — carousel design systems and shared planning rules.
// The compiler is pure, so these lock the customer-facing Maya contract in place.

import { describe, expect, it } from "vitest"
import {
  compileConceptJobs,
  MAX_CAROUSEL_SLIDES,
  validateCustomerCarouselBrief,
} from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const baseBrief = (slides: NonNullable<NonNullable<CreativeBrief["graphic"]>["slides"]>): CreativeBrief => ({
  outfit: "The Row cream cashmere turtleneck",
  setting: "a marble cafe table by a tall window in Paris morning light",
  mood: "calm, assured",
  pose: "seated, mid-thought, looking out the window",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light",
  graphic: { designSystem: "cutout-editorial", slides },
})

describe("carousel design systems (MAYA-REBUILD-16)", () => {
  it("keeps all customer carousel slides grounded in the selfie reference", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "Hook", visual: "identity" },
        { heading: "Value 1", visual: "detail", detailSubject: "cappuccino beside her phone" },
        { heading: "Value 2", visual: "text-only" },
        { heading: "Save this", role: "cta", visual: "text-only" },
      ]),
      "carousel",
    )
    expect(jobs).toHaveLength(4)
    expect(jobs.map((j) => j.passes[0].input)).toEqual(["selfie", "selfie", "selfie", "selfie"])
    // Every slide is exactly one pass (no two-pass overlay for carousels anymore).
    expect(jobs.every((j) => j.passes.length === 1)).toBe(true)
  })

  it("does not cap identity slides out of longer educational carousels", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "S1", visual: "identity" },
        { heading: "S2", visual: "identity" },
        { heading: "S3", visual: "identity" },
        { heading: "S4", visual: "identity" },
      ]),
      "carousel",
    )
    const inputs = jobs.map((j) => j.passes[0].input)
    expect(inputs.filter((i) => i === "selfie")).toHaveLength(4)
  })

  it("applies the doctrine-safe default mix when Maya doesn't tag visuals", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "Hook" },
        { heading: "V1" },
        { heading: "V2" },
        { heading: "V3" },
        { heading: "CTA" },
      ]),
      "carousel",
    )
    expect(jobs.every((j) => j.passes[0].input === "selfie")).toBe(true)
  })

  it("passes slide-specific creative planning into the image prompts", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "Hook", visual: "identity" },
        {
          heading: "The 3 rules",
          body: "Keep your face. Keep your age. Keep your energy.",
          visual: "text-only",
          purpose: "make the rule easy to save",
          visualConcept: "editorial note beside a mirror selfie",
          imagePrompt: "same woman, mirror, handwritten note, soft window light",
          visualReason: "the note makes the teaching point tangible",
        },
        {
          heading: "Start here",
          visual: "detail",
          detailSubject: "an open notebook with a pen",
          purpose: "show the first action",
          visualConcept: "hands planning beside a phone",
          imagePrompt: "same woman, hands, phone, notebook, marble cafe table",
          visualReason: "the phone and notes show the workflow",
        },
      ]),
      "carousel",
    )
    const textPrompt = jobs[1].passes[0].prompt
    const detailPrompt = jobs[2].passes[0].prompt
    for (const p of [textPrompt, detailPrompt]) {
      expect(p).toContain("Slide-specific creative plan")
      expect(p).toContain("same woman")
    }
    expect(textPrompt).toContain('"The 3 rules"')
    expect(textPrompt).toContain("Keep your face. Keep your age. Keep your energy.")
    expect(textPrompt).toContain("editorial note beside a mirror selfie")
    expect(detailPrompt).toContain("an open notebook with a pen")
    expect(detailPrompt).toContain("hands planning beside a phone")
  })

  it("shares one design system DNA across every slide for cohesion", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "Hook", visual: "identity" },
        { heading: "V1", visual: "detail" },
        { heading: "CTA", visual: "text-only" },
      ]),
      "carousel",
    )
    for (const job of jobs) {
      expect(job.passes[0].prompt).toContain("editorial collage")
    }
  })

  it("leaves reel-cover and story-slide on the existing path", () => {
    const brief = baseBrief([])
    brief.graphic = { headline: "Read this", subline: "before you post" }
    const jobs = compileConceptJobs(brief, "reel-cover", undefined, "two_pass")
    expect(jobs).toHaveLength(1)
    expect(jobs[0].passes.map((p) => p.input)).toEqual(["selfie"])
  })

  it("allows 9-slide planned educational carousels", () => {
    expect(MAX_CAROUSEL_SLIDES).toBe(9)
    const slides = Array.from({ length: 9 }, (_, index) => ({
      heading: `Slide ${index + 1}`,
      purpose: `purpose ${index + 1}`,
      visualConcept: `unique scene ${index + 1}`,
      imagePrompt: `same woman in unique editorial setting ${index + 1}`,
      visualReason: `reason ${index + 1}`,
    }))
    const jobs = compileConceptJobs(baseBrief(slides), "carousel")
    expect(jobs).toHaveLength(9)
  })

  it("rejects a thin customer carousel plan before rendering", () => {
    const brief = baseBrief([
      { heading: "Hook", visualConcept: "same cafe", imagePrompt: "same cafe" },
      { heading: "Style 1", visualConcept: "same cafe", imagePrompt: "same cafe" },
      { heading: "CTA", visualConcept: "same cafe", imagePrompt: "same cafe" },
    ])
    brief.graphic = {
      ...brief.graphic,
      carouselTitle: "5 AI photo styles you already own",
      contentType: "vault_product",
      slideCount: 3,
      relevantVaultStyles: [{ name: "Denim Street" }, { name: "Marble Cafe" }],
    }

    expect(validateCustomerCarouselBrief(brief, "5 AI photo styles you already own")).toEqual(
      expect.arrayContaining([
        expect.stringContaining("educational carousel needs at least 6 slides"),
        expect.stringContaining("five-style carousel must include five distinct style outputs"),
      ])
    )
  })
})
