// MAYA-REBUILD-16 — carousel design systems: per-slide visual roles, identity cap, no-people
// guarantees. The compiler is pure, so these lock the doctrine rules in place.

import { describe, expect, it } from "vitest"
import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
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
  it("routes tagged slides to the right input source", () => {
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
    expect(jobs.map((j) => j.passes[0].input)).toEqual(["selfie", "none", "none", "none"])
    // Every slide is exactly one pass (no two-pass overlay for carousels anymore).
    expect(jobs.every((j) => j.passes.length === 1)).toBe(true)
  })

  it("caps identity slides at 2 per set (doctrine), downgrading extras to detail", () => {
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
    expect(inputs.filter((i) => i === "selfie")).toHaveLength(2)
    expect(inputs.filter((i) => i === "none")).toHaveLength(2)
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
    // hook -> identity (selfie); values alternate detail/text-only (none); cta -> text-only (none).
    expect(jobs[0].passes[0].input).toBe("selfie")
    expect(jobs.slice(1).every((j) => j.passes[0].input === "none")).toBe(true)
  })

  it("keeps people out of detail and text-only prompts, and renders copy verbatim", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        { heading: "Hook", visual: "identity" },
        { heading: "The 3 rules", body: "Keep your face. Keep your age. Keep your energy.", visual: "text-only" },
        { heading: "Start here", visual: "detail", detailSubject: "an open notebook with a pen" },
      ]),
      "carousel",
    )
    const textPrompt = jobs[1].passes[0].prompt
    const detailPrompt = jobs[2].passes[0].prompt
    for (const p of [textPrompt, detailPrompt]) {
      expect(p).toContain("No people, no faces")
      expect(p).not.toContain("reference photo") // no identity anchor on non-identity slides
    }
    expect(textPrompt).toContain('"The 3 rules"')
    expect(textPrompt).toContain("Keep your face. Keep your age. Keep your energy.")
    expect(detailPrompt).toContain("an open notebook with a pen")
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
    expect(jobs[0].passes.map((p) => p.input)).toEqual(["selfie", "prev"])
  })
})
