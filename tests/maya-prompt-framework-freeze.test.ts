// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import {
  SSELFIE_GRAPHIC_STYLE_PROMPT,
  SSELFIE_INSPIRATION_CLOSE_RECREATE,
  SSELFIE_INSPIRATION_SET_VARIATION,
} from "@/lib/app-v3/maya/visual-rules"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

vi.mock("server-only", () => ({}))

// MAYA CREATIVE FREEZE (2026-07-15): these snapshots ARE the frozen prompt framework.
// Context: docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md. After a member reported output
// that "felt off", forensics proved the compiled prompts were byte-identical across days -
// the fear was variance, not regression. This test makes that proof permanent: the same
// brief must always compile to the same prompt. If this test fails, someone changed Maya's
// creative pipeline. That is allowed ONLY as a deliberate, Sandra-approved prompt change,
// with the snapshot updated in the same commit and the change named in the commit message.
// It must never fail as a side effect of UX, routing, credits, or cleanup work.

const FIXED_BRIEF: CreativeBrief = {
  outfit: "The Row cream cashmere turtleneck, tailored charcoal trousers",
  setting: "north-facing London apartment, marble console, soft morning haze",
  mood: "calm, assured, caught mid-thought",
  pose: "seated at the edge of a linen sofa, looking off-camera",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light, gentle falloff",
}

describe("Maya prompt framework freeze", () => {
  it("compiles the frozen photo prompt", () => {
    const jobs = compileConceptJobs(FIXED_BRIEF, "photo")
    expect(jobs).toHaveLength(1)
    expect(jobs[0].passes.map(pass => `[input:${pass.input}]\n${pass.prompt}`).join("\n\n=== pass ===\n\n")).toMatchSnapshot()
  })

  it("compiles the frozen photoshoot prompt (hero role)", () => {
    const jobs = compileConceptJobs({ ...FIXED_BRIEF, shotRole: "seated-hero" }, "photoshoot")
    expect(jobs).toHaveLength(1)
    expect(jobs[0].passes.map(pass => `[input:${pass.input}]\n${pass.prompt}`).join("\n\n=== pass ===\n\n")).toMatchSnapshot()
  })

  it("keeps the shared visual-rule blocks frozen", () => {
    expect(SSELFIE_GRAPHIC_STYLE_PROMPT).toMatchSnapshot()
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toMatchSnapshot()
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toMatchSnapshot()
  })
})
