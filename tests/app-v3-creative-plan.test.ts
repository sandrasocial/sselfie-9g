// @vitest-environment node

import { describe, expect, it } from "vitest"
import {
  buildDefaultCreativePlanValidationRules,
  inferCreativeUseCase,
  normalizeCreativeMode,
  recommendCreativeOutputCount,
  validateCreativePlan,
  type CreativePlan,
  type CreativePlanOutput,
} from "@/lib/app-v3/maya/creative-plan"

function output(partial: Partial<CreativePlanOutput> = {}): CreativePlanOutput {
  const visualConcept = partial.visualConcept ?? "Sandra in editorial window light"

  return {
    title: partial.title ?? "Hook",
    purpose: partial.purpose ?? "Introduce the idea",
    visualConcept,
    imagePromptDirection:
      partial.imagePromptDirection ??
      `same woman, ${visualConcept}, editorial portrait, mobile-safe composition`,
    videoPromptDirection: partial.videoPromptDirection,
    textSafeArea: partial.textSafeArea ?? "upper_third",
    referenceImageStrategy: partial.referenceImageStrategy ?? "selfie_identity_anchor",
    reasonThisMatchesUserIntent:
      partial.reasonThisMatchesUserIntent ?? "It matches the requested educational angle.",
  }
}

function plan(partial: Partial<CreativePlan> = {}): CreativePlan {
  const base: CreativePlan = {
    mode: "carousel",
    userIntent: "5 AI photo styles you already own",
    useCase: "vault_product",
    audienceEmotion: "I already have more looks than I thought",
    contentGoal: "teach and bridge to the Vault",
    visualDirection: "luxury editorial, warm, mobile-first",
    vaultStyleReferences: [
      { name: "Denim Street", reason: "style slide" },
      { name: "Marble Cafe", reason: "style slide" },
      { name: "90s Supermodel", reason: "style slide" },
      { name: "Clean Girl", reason: "style slide" },
      { name: "Coastal White", reason: "style slide" },
    ],
    inspirationInterpretation: {
      lighting: "soft daylight",
      colorGrade: "warm neutral",
      avoidCopying: ["face"],
    },
    referenceHandling: {
      identityStrategy: "selfie_identity_anchor",
      inspirationStrategy: "inspiration_style_only",
    },
    outputCount: 9,
    outputs: [
      output({ title: "Hook", purpose: "name the promise", visualConcept: "editorial hook portrait" }),
      output({ title: "Context", purpose: "explain the problem", visualConcept: "phone and saved prompts" }),
      output({ title: "Denim Street", purpose: "teach style 1", visualConcept: "Denim Street look" }),
      output({ title: "Marble Cafe", purpose: "teach style 2", visualConcept: "Marble Cafe look" }),
      output({ title: "90s Supermodel", purpose: "teach style 3", visualConcept: "90s Supermodel look" }),
      output({ title: "Clean Girl", purpose: "teach style 4", visualConcept: "Clean Girl look" }),
      output({ title: "Coastal White", purpose: "teach style 5", visualConcept: "Coastal White look" }),
      output({ title: "Choose", purpose: "help the user choose", visualConcept: "style decision moment" }),
      output({ title: "CTA", purpose: "bridge to action", visualConcept: "Vault on phone" }),
    ],
    validationRules: [],
  }

  return {
    ...base,
    ...partial,
    outputs: partial.outputs ?? base.outputs,
    validationRules: partial.validationRules ?? buildDefaultCreativePlanValidationRules(base),
  }
}

describe("app-v3 Maya Creative Plan contract", () => {
  it("normalizes current customer modes without adding UI behavior", () => {
    expect(normalizeCreativeMode("photo")).toBe("photo")
    expect(normalizeCreativeMode("reel-cover")).toBe("reel_cover")
    expect(normalizeCreativeMode("carousel")).toBe("carousel")
    expect(normalizeCreativeMode("story-slide")).toBe("story_sequence")
    expect(normalizeCreativeMode("motion")).toBe("video")
    expect(normalizeCreativeMode("unknown")).toBeNull()
  })

  it("recommends mode-aware output counts for the first planned phases", () => {
    expect(
      recommendCreativeOutputCount({
        mode: "carousel",
        useCase: "vault_product",
        userIntent: "5 AI photo styles you already own",
      })
    ).toBe(9)

    expect(
      recommendCreativeOutputCount({
        mode: "story_sequence",
        useCase: "sales",
        userIntent: "sell the Vault softly",
      })
    ).toBe(5)

    expect(
      recommendCreativeOutputCount({
        mode: "photo",
        useCase: "single_editorial",
        userIntent: "one profile photo",
      })
    ).toBe(1)
  })

  it("accepts a complete Vault-aware nine-slide carousel plan", () => {
    const result = validateCreativePlan(plan())
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("rejects thin educational carousels and lazy repeated visual directions", () => {
    const repeated = output({
      title: "same",
      visualConcept: "same beige cafe background",
      imagePromptDirection: "same beige cafe background",
    })
    const result = validateCreativePlan(
      plan({
        outputCount: 3,
        outputs: [repeated, repeated, repeated],
        vaultStyleReferences: [],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "educational carousel needs at least 6 slides, got 3",
        "five-style carousel must include five distinct style outputs",
        "Vault-related plan is missing vaultStyleReferences",
      ])
    )
  })

  it("validates story sequence counts before story is wired to generation", () => {
    const result = validateCreativePlan(
      plan({
        mode: "story_sequence",
        userIntent: "soft CTA story sequence",
        useCase: "soft_cta",
        outputCount: 4,
        outputs: [output(), output(), output(), output()],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain("story_sequence outputCount must be 3, 5, or 7, got 4")
  })

  it("keeps video as a planned mode but requires video prompt direction", () => {
    const result = validateCreativePlan(
      plan({
        mode: "video",
        userIntent: "animate this portrait with natural movement",
        useCase: "motion",
        outputCount: 1,
        outputs: [
          output({
            imagePromptDirection: undefined,
            videoPromptDirection: "gentle hair movement, natural blink, subtle camera push",
            referenceImageStrategy: "existing_generated_image",
          }),
        ],
      })
    )

    expect(result.ok).toBe(true)
  })

  it("infers use cases without depending on routes or renderers", () => {
    expect(inferCreativeUseCase("5 AI photo styles you already own", "carousel")).toBe("vault_product")
    expect(inferCreativeUseCase("how to set depth on iphone", "carousel")).toBe("tutorial")
    expect(inferCreativeUseCase("animate this image", "video")).toBe("motion")
  })
})
