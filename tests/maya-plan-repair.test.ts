// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import {
  validateEmittedConceptPlan,
  validatePhotoshootBriefs,
  validateStorySequenceOutputCount,
} from "@/lib/app-v3/maya/semantic-plan-validation"
import { repairSemanticPlan } from "@/lib/app-v3/maya/semantic-plan-repair"

function shootBrief(role?: CreativeBrief["shotRole"]): CreativeBrief {
  return {
    outfit: "Toteme camel blazer",
    setting: "Oslo cafe",
    mood: "quiet confidence",
    pose: "caught mid-step",
    cameraSpec: "Leica Q3, 28mm f/1.7",
    lighting: "north-facing window light",
    ...(role ? { shotRole: role } : {}),
  }
}

function shootConcept(role?: CreativeBrief["shotRole"], index = 0) {
  return {
    id: `concept-${index + 1}`,
    title: `Shot ${index + 1}`,
    description: "A cohesive campaign shot.",
    brief: shootBrief(role),
  }
}

function validShootConcepts() {
  const roles: NonNullable<CreativeBrief["shotRole"]>[] = [
    "establishing-full-body",
    "movement-lifestyle-action",
    "seated-hero",
    "close-portrait",
    "cover-safe-hero",
    "true-detail",
  ]
  return roles.map((role, index) => shootConcept(role, index))
}

describe("shared Maya semantic plan validation", () => {
  it("keeps the photoshoot rules in one shared validator", () => {
    const fiveShots = validShootConcepts()
      .slice(0, 5)
      .map(concept => concept.brief)
    expect(validatePhotoshootBriefs(fiveShots)).toContain(
      "photoshoot needs at least 6 shots, got 5"
    )

    const withoutDetail = validShootConcepts().map(concept => ({
      ...concept.brief,
      shotRole:
        concept.brief.shotRole === "true-detail" ? ("profile" as const) : concept.brief.shotRole,
    }))
    expect(validatePhotoshootBriefs(withoutDetail)).toContain(
      "photoshoot needs 1-2 true-detail shots, got 0"
    )
    expect(validatePhotoshootBriefs(validShootConcepts().map(concept => concept.brief))).toEqual([])
  })

  it("keeps the story count rule shared and exact", () => {
    expect(validateStorySequenceOutputCount({ outputCount: 1 })).toEqual([
      "story_sequence outputCount must be 3, 5, or 7, got 1",
    ])
    expect(validateStorySequenceOutputCount({ outputCount: 5 })).toEqual([])
  })

  it("validates emitted photoshoot and story plans before cards can render", () => {
    expect(
      validateEmittedConceptPlan({
        format: "photoshoot",
        concepts: validShootConcepts().slice(0, 5),
      })
    ).toContain("photoshoot needs at least 6 shots, got 5")

    const story = shootConcept(undefined, 0)
    story.brief.graphic = {
      creativePlan: {
        mode: "story_sequence",
        userIntent: "My story",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "one Oslo world",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 1,
        outputs: [
          {
            title: "I started again",
            purpose: "hook",
            visualConcept: "walking outside",
            imagePromptDirection: "vertical editorial walking shot",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "it is her real opening",
          },
        ],
        validationRules: [],
      },
    }
    expect(validateEmittedConceptPlan({ format: "story-sequence", concepts: [story] })).toContain(
      "story_sequence outputCount must be 3, 5, or 7, got 1"
    )
  })
})

describe("Maya semantic plan repair loop", () => {
  it("feeds exact errors into one corrective attempt and accepts the valid repair", async () => {
    const invalid = { format: "photoshoot", concepts: validShootConcepts().slice(0, 5) }
    const valid = { format: "photoshoot", concepts: validShootConcepts() }
    const requestRepair = vi.fn(async () => valid)

    const result = await repairSemanticPlan({
      initial: invalid,
      validate: validateEmittedConceptPlan,
      requestRepair,
      maxAttempts: 2,
    })

    expect(requestRepair).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        errors: expect.arrayContaining(["photoshoot needs at least 6 shots, got 5"]),
      })
    )
    expect(result).toMatchObject({ value: valid, attemptCount: 1 })
    expect(result?.errorsFixed).toContain("photoshoot needs at least 6 shots, got 5")
  })

  it("stops after two failed repairs and returns the graceful fallback", async () => {
    const invalid = { format: "photoshoot", concepts: validShootConcepts().slice(0, 5) }
    const requestRepair = vi.fn(async () => invalid)

    await expect(
      repairSemanticPlan({
        initial: invalid,
        validate: validateEmittedConceptPlan,
        requestRepair,
        maxAttempts: 2,
      })
    ).resolves.toBeNull()
    expect(requestRepair).toHaveBeenCalledTimes(2)
  })
})
