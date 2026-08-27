// @vitest-environment node

import { describe, expect, it } from "vitest"
import { normalizeConceptBriefPlanOutputs } from "@/lib/app-v3/maya/concept-brief-normalization"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

function briefWithGraphic(graphic: CreativeBrief["graphic"]): CreativeBrief {
  return {
    outfit: "black blazer",
    setting: "editorial studio",
    mood: "assured",
    pose: "standing",
    cameraSpec: "Leica Q3",
    lighting: "soft window light",
    graphic,
  }
}

describe("normalizeConceptBriefPlanOutputs", () => {
  it("treats an empty plan output list as absent when complete slides are available", () => {
    const brief = briefWithGraphic({
      slides: [
        { heading: "First" },
        { heading: "Second" },
        { heading: "Third" },
      ],
      creativePlan: {
        mode: "carousel",
        userIntent: "three-part story",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "editorial",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 3,
        outputs: [],
        validationRules: [],
      },
    })

    const normalized = normalizeConceptBriefPlanOutputs(brief)

    expect(normalized.graphic?.creativePlan?.outputs).toBeUndefined()
    expect(normalized.graphic?.slides).toHaveLength(3)
    expect(JSON.stringify(normalized)).not.toContain('"outputs"')
  })

  it("preserves a populated plan output list", () => {
    const brief = briefWithGraphic({
      slides: [{ heading: "Legacy slide" }],
      creativePlan: {
        mode: "carousel",
        userIntent: "one thought",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "editorial",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 1,
        outputs: [
          {
            title: "Planned slide",
            purpose: "open",
            visualConcept: "portrait",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "matches the thought",
          },
        ],
        validationRules: [],
      },
    })

    expect(normalizeConceptBriefPlanOutputs(brief)).toBe(brief)
  })
})
