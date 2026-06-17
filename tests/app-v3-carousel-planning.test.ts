// @vitest-environment node

import { describe, expect, it } from "vitest"
import {
  buildCustomerCarouselCreativePlan,
  compileConceptJobs,
  MAX_CAROUSEL_SLIDES,
  validateCustomerCarouselBrief,
} from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

function baseBrief(slides: NonNullable<NonNullable<CreativeBrief["graphic"]>["slides"]>): CreativeBrief {
  return {
    outfit: "The Row cream cashmere turtleneck",
    setting: "a marble cafe table by a tall window in Paris morning light",
    mood: "calm, assured",
    pose: "seated, mid-thought, looking out the window",
    cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
    lighting: "soft north-facing window light",
    graphic: { designSystem: "cutout-editorial", slides },
  }
}

describe("app-v3 customer carousel planning", () => {
  it("keeps planned 9-slide carousels instead of slicing them to 6", () => {
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
    expect(jobs.every(job => job.passes[0]?.input === "selfie")).toBe(true)
  })

  it("feeds slide-specific visual plans into customer image prompts", () => {
    const jobs = compileConceptJobs(
      baseBrief([
        {
          heading: "Denim Street",
          body: "The casual one that still looks expensive.",
          purpose: "teach the first Vault style",
          visualConcept: "same woman in a denim street-style scene",
          imagePrompt: "same woman, light denim, soft blazer, street corner, natural daylight",
          visualReason: "the street scene matches the Denim Street style",
        },
      ]),
      "carousel"
    )

    const prompt = jobs[0]?.passes[0]?.prompt ?? ""
    expect(prompt).toContain("Slide-specific creative plan")
    expect(prompt).toContain("same woman in a denim street-style scene")
    expect(prompt).toContain("light denim")
  })

  it("rejects a thin five-style Vault carousel before rendering", () => {
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

    const errors = validateCustomerCarouselBrief(brief, "5 AI photo styles you already own")
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("educational carousel needs at least 6 slides"),
        expect.stringContaining("five-style carousel must include five distinct style outputs"),
      ])
    )
  })

  it("builds the shared Creative Plan from the customer carousel brief", () => {
    const brief = baseBrief(
      Array.from({ length: 9 }, (_, index) => ({
        heading: index >= 2 && index <= 6 ? `Style ${index - 1}` : `Slide ${index + 1}`,
        purpose: index >= 2 && index <= 6 ? `teach Vault style ${index - 1}` : `purpose ${index + 1}`,
        visualConcept: `unique visual world ${index + 1}`,
        imagePrompt: `same woman in unique visual world ${index + 1}`,
        visualReason: `matches the slide meaning ${index + 1}`,
        textSafeArea: "upper_third",
        referenceImageStrategy: "selfie_identity_anchor",
      }))
    )
    brief.graphic = {
      ...brief.graphic,
      carouselTitle: "5 AI photo styles you already own",
      creativePlan: {
        mode: "carousel",
        userIntent: "5 AI photo styles you already own",
        useCase: "vault_product",
        audienceEmotion: "I already have looks I can use",
        contentGoal: "teach the user's top Vault styles",
        visualDirection: "luxury editorial, varied per style",
        vaultStyleReferences: [
          { name: "Denim Street" },
          { name: "Marble Cafe" },
          { name: "90s Supermodel" },
          { name: "Clean Girl" },
          { name: "Coastal White" },
        ],
        referenceHandling: {
          identityStrategy: "selfie_identity_anchor",
          inspirationStrategy: "inspiration_style_only",
        },
        outputCount: 9,
        outputs: Array.from({ length: 9 }, (_, index) => ({
          title: index >= 2 && index <= 6 ? `Style ${index - 1}` : `Slide ${index + 1}`,
          purpose: index >= 2 && index <= 6 ? `teach Vault style ${index - 1}` : `purpose ${index + 1}`,
          visualConcept: `planned visual world ${index + 1}`,
          imagePromptDirection: `same woman in planned visual world ${index + 1}`,
          textSafeArea: "upper_third",
          referenceImageStrategy: "selfie_identity_anchor",
          reasonThisMatchesUserIntent: `reason ${index + 1}`,
        })),
        validationRules: [],
      },
    }

    const plan = buildCustomerCarouselCreativePlan(brief, "5 AI photo styles you already own")
    expect(plan.mode).toBe("carousel")
    expect(plan.useCase).toBe("vault_product")
    expect(plan.outputCount).toBe(9)
    expect(plan.outputs).toHaveLength(9)
    expect(validateCustomerCarouselBrief(brief, "5 AI photo styles you already own")).toEqual([])
  })
})
