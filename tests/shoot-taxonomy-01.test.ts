// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const baseBrief: CreativeBrief = {
  outfit: "cream linen blazer, black trousers, oval sunglasses",
  setting: "a quiet marble cafe terrace in morning light",
  mood: "calm, editorial, real",
  pose: "natural pause beside the table",
  cameraSpec: "Canon EOS R5, 50mm lens",
  lighting: "soft open shade",
}

describe("SHOOT-TAXONOMY-01 shot roles", () => {
  it("adds concrete role direction to user-facing photo prompts", () => {
    const detailPrompt = compileConceptJobs({ ...baseBrief, shotRole: "true-detail" }, "photo")[0]
      .passes[0].prompt
    const fullBodyPrompt = compileConceptJobs(
      { ...baseBrief, shotRole: "establishing-full-body" },
      "photo"
    )[0].passes[0].prompt

    expect(detailPrompt).toContain("Shot role: true detail")
    expect(detailPrompt).toContain("Do NOT show the full face or full body")
    expect(fullBodyPrompt).toContain("Shot role: establishing full-body")
    expect(fullBodyPrompt).toContain("complete outfit")
  })

  it("pins the admin Shoot Studio as taste-first, not forced-detail taxonomy", () => {
    const source = readFileSync("lib/content-kit/shoot-generator.ts", "utf8")

    expect(source).toContain('"shotRole"')
    expect(source).toContain('"true-detail"')
    expect(source).toContain("true-detail is optional")
    expect(source).toContain("Do not force a faceless detail shot")
    expect(source).toContain("validateShotSet")
    expect(source).not.toContain("Shoot plan must include 1-2 true-detail shots")
    expect(source).toContain("shotRoleRenderInstruction(input.shotRole)")
    expect(source).toContain("Safety retry:")

    // 2026-07-05: the wardrobe/setting safety-retry sanitizer moved into a shared module
    // (lib/ai/image-safety.ts) so Content Kit's slide redesigner and app-v3's generate route
    // get the same, single, incident-tuned list instead of three independent, drifting copies.
    const safetySource = readFileSync("lib/ai/image-safety.ts", "utf8")
    expect(safetySource).toContain("off[-\\s]?shoulder")
  })
})
