// @vitest-environment node

// MAYA-COPY-PREVIEW-01 (2026-07-20) - Sandra's live ask: let the member see and edit the
// exact words about to bake onto a slide/cover before spending a credit on generation.
// These tests pin the pure get/apply contract that makes that safe: getEditableConceptCopy
// must mirror the compiler's real precedence (so the preview never lies about what would
// currently render), and applyEditedConceptCopy must touch ONLY the baked text, never the
// visual plan (imagePromptDirection, purpose, referenceImageStrategy, textSafeArea).

import { describe, expect, it } from "vitest"
import {
  applyEditedConceptCopy,
  getEditableConceptCopy,
  isTextBakingFormat,
  type EditableConceptCopy,
} from "@/lib/app-v3/maya/concept-copy-edit"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

function baseBrief(graphic: CreativeBrief["graphic"]): CreativeBrief {
  return {
    outfit: "black ribbed turtleneck",
    setting: "moody bedroom with an arched mirror",
    mood: "calm, assured",
    pose: "seated on the edge of the bed",
    cameraSpec: "Leica Q3, 28mm f/1.7",
    lighting: "low warm window light",
    graphic,
  }
}

describe("isTextBakingFormat", () => {
  it("is true only for formats where the image model bakes literal words", () => {
    expect(isTextBakingFormat("reel-cover")).toBe(true)
    expect(isTextBakingFormat("story-slide")).toBe(true)
    expect(isTextBakingFormat("story-sequence")).toBe(true)
    expect(isTextBakingFormat("carousel")).toBe(true)
    expect(isTextBakingFormat("photo")).toBe(false)
    expect(isTextBakingFormat("photoshoot")).toBe(false)
    expect(isTextBakingFormat("video")).toBe(false)
  })
})

describe("getEditableConceptCopy", () => {
  it("never surfaces edit fields for formats with no baked text", () => {
    const brief = baseBrief({ headline: "Should never show up" })
    expect(getEditableConceptCopy(brief, "photo")).toEqual([])
    expect(getEditableConceptCopy(brief, "photoshoot")).toEqual([])
    expect(getEditableConceptCopy(brief, "video")).toEqual([])
  })

  it("reads a single cover from headline/subline", () => {
    const brief = baseBrief({
      headline: "Tired of this hot mess?",
      subline: "There is a simpler way",
    })
    expect(getEditableConceptCopy(brief, "reel-cover")).toEqual([
      { index: 0, heading: "Tired of this hot mess?", body: "There is a simpler way" },
    ])
  })

  it("returns nothing for a cover with no headline yet (never a dangling empty field)", () => {
    expect(getEditableConceptCopy(baseBrief({}), "story-slide")).toEqual([])
  })

  it("reads carousel slides straight from creativePlan.outputs (the collapsed, no-mirror shape)", () => {
    const brief = baseBrief({
      creativePlan: {
        mode: "carousel",
        userIntent: "the messy middle",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "moody bedroom world",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 2,
        outputs: [
          {
            title: "The part nobody shows",
            body: "It's messier than the highlight reel",
            purpose: "open with honesty",
            visualConcept: "her on the bed, phone in hand",
            imagePromptDirection: "same woman on the bed with her phone, moody light",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "names the real feeling",
          },
          {
            title: "Save this for later",
            body: "",
            purpose: "invite the next step",
            visualConcept: "her walking toward the light",
            imagePromptDirection: "same woman walking toward the window light",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "invites the next step",
          },
        ],
        validationRules: [],
      } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
    })

    expect(getEditableConceptCopy(brief, "carousel")).toEqual([
      { index: 0, heading: "The part nobody shows", body: "It's messier than the highlight reel" },
      { index: 1, heading: "Save this for later", body: "" },
    ])
  })

  it("prefers a slide's own heading/body over the matching plan output when both exist", () => {
    const brief = baseBrief({
      slides: [{ heading: "Slide override", body: "Slide body override" }],
      creativePlan: {
        mode: "carousel",
        userIntent: "topic",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "world",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 2,
        outputs: [
          {
            title: "Plan title (should lose to slide)",
            body: "Plan body (should lose to slide)",
            purpose: "p",
            visualConcept: "v",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "r",
          },
          {
            title: "Second slide from the plan",
            body: "no matching slide entry, falls back to the plan",
            purpose: "p2",
            visualConcept: "v2",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "r2",
          },
        ],
        validationRules: [],
      } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
    })

    expect(getEditableConceptCopy(brief, "carousel")).toEqual([
      { index: 0, heading: "Slide override", body: "Slide body override" },
      {
        index: 1,
        heading: "Second slide from the plan",
        body: "no matching slide entry, falls back to the plan",
      },
    ])
  })
})

describe("applyEditedConceptCopy", () => {
  it("is a no-op when there is nothing to edit or no graphic spec", () => {
    const brief = baseBrief(undefined)
    expect(applyEditedConceptCopy(brief, [])).toBe(brief)
    const withGraphic = baseBrief({ headline: "x" })
    expect(applyEditedConceptCopy(withGraphic, [])).toBe(withGraphic)
  })

  it("writes edits into creativePlan.outputs without touching the visual plan fields", () => {
    const brief = baseBrief({
      creativePlan: {
        mode: "carousel",
        userIntent: "topic",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "world",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 1,
        outputs: [
          {
            title: "Original title",
            body: "Original body",
            purpose: "open the carousel",
            visualConcept: "her at the mirror",
            imagePromptDirection: "same woman at the arched mirror, moody light",
            textSafeArea: "lower_third",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "names the pain",
          },
        ],
        validationRules: [],
      } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
    })

    const edits: EditableConceptCopy[] = [
      { index: 0, heading: "Her rewritten headline", body: "Her rewritten support line" },
    ]
    const result = applyEditedConceptCopy(brief, edits)
    const output = result.graphic!.creativePlan!.outputs[0]
    expect(output.title).toBe("Her rewritten headline")
    expect(output.body).toBe("Her rewritten support line")
    // Every visual/plan field is untouched - only the words changed.
    expect(output.purpose).toBe("open the carousel")
    expect(output.visualConcept).toBe("her at the mirror")
    expect(output.imagePromptDirection).toBe("same woman at the arched mirror, moody light")
    expect(output.textSafeArea).toBe("lower_third")
    expect(output.referenceImageStrategy).toBe("selfie_identity_anchor")
    expect(output.reasonThisMatchesUserIntent).toBe("names the pain")
    // The original brief object is never mutated in place.
    expect(brief.graphic!.creativePlan!.outputs[0].title).toBe("Original title")
  })

  it("writes edits into a legacy slides array without touching its visual fields", () => {
    const brief = baseBrief({
      slides: [
        {
          heading: "Original heading",
          body: "Original body",
          purpose: "invite the next step",
          visualConcept: "her walking toward the light",
          referenceImageStrategy: "selfie_identity_anchor",
        },
      ],
    })
    const result = applyEditedConceptCopy(brief, [
      { index: 0, heading: "New heading", body: "New body" },
    ])
    expect(result.graphic!.slides![0]).toMatchObject({
      heading: "New heading",
      body: "New body",
      purpose: "invite the next step",
      visualConcept: "her walking toward the light",
      referenceImageStrategy: "selfie_identity_anchor",
    })
  })

  it("only edits the slides the member actually touched, leaving the rest exactly as Maya wrote them", () => {
    const brief = baseBrief({
      creativePlan: {
        mode: "carousel",
        userIntent: "topic",
        useCase: "trust",
        audienceEmotion: "seen",
        contentGoal: "build trust",
        visualDirection: "world",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: 2,
        outputs: [
          {
            title: "Slide one",
            body: "",
            purpose: "p1",
            visualConcept: "v1",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "r1",
          },
          {
            title: "Slide two",
            body: "",
            purpose: "p2",
            visualConcept: "v2",
            referenceImageStrategy: "selfie_identity_anchor",
            reasonThisMatchesUserIntent: "r2",
          },
        ],
        validationRules: [],
      } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
    })
    const result = applyEditedConceptCopy(brief, [{ index: 1, heading: "Edited slide two", body: "" }])
    expect(result.graphic!.creativePlan!.outputs[0].title).toBe("Slide one")
    expect(result.graphic!.creativePlan!.outputs[1].title).toBe("Edited slide two")
  })

  it("falls back to headline/subline for a single cover with no plan yet", () => {
    const brief = baseBrief({ headline: "Original headline", subline: "Original subline" })
    const result = applyEditedConceptCopy(brief, [
      { index: 0, heading: "New headline", body: "New subline" },
    ])
    expect(result.graphic!.headline).toBe("New headline")
    expect(result.graphic!.subline).toBe("New subline")
  })

  it("clears subline to undefined (not an empty string) when the member removes it", () => {
    const brief = baseBrief({ headline: "Headline", subline: "Will be removed" })
    const result = applyEditedConceptCopy(brief, [{ index: 0, heading: "Headline", body: "" }])
    expect(result.graphic!.subline).toBeUndefined()
  })
})
