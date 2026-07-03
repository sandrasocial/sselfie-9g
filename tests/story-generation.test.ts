// @vitest-environment node

// STORY-GENERATION fix (2026-07-03) - Sandra's live report: "Maya is failing on generating
// story sequences and story slides."
//
// Root causes pinned here:
// 1. emit_concepts tool JSON truncated mid-stream (8192 output-token ceiling vs 3 full
//    creative plans) -> AI SDK marks the call invalid -> every concept card vanished ->
//    generation never reached (live: suite_concepts_emitted count:null, zero deductions).
// 2. Story sequences were validated with carousel-only teaching rules (hard-coded
//    mode: "carousel"), so a valid 5-beat emotional story could 400 "too thin" - silently.
// 3. A member story SLIDE used the overlay-only "story-sequence" grounding ("preserve the
//    original photo exactly") on her raw selfie instead of building an editorial scene.
// 4. Auto-bake added a third serial OpenAI leg; a 5-slide sequence could blow the 300s
//    function ceiling with no response, no refund, and no telemetry.

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { salvageConceptsPayload } from "@/lib/app-v3/concept-salvage"
import {
  buildGraphicRedesignSlides,
  validateCustomerCarouselBrief,
} from "@/lib/app-v3/prompt-compiler"
import { makeTextOverlaySpec } from "@/lib/app-v3/text-overlay"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const read = (path: string) => readFileSync(path, "utf8")

// ─── A realistic Maya story-sequence brief: creativePlan outputs ONLY (no mirrored slides) ──

function storyOutputs(count: number, withImageDirection = true) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Beat ${index + 1}`,
    purpose: `emotional beat ${index + 1}`,
    visualConcept: `vertical story moment ${index + 1}, same world`,
    ...(withImageDirection
      ? { imagePromptDirection: `same woman, vertical editorial story moment ${index + 1}` }
      : {}),
    textSafeArea: "lower_third" as const,
    referenceImageStrategy: "selfie_identity_anchor" as const,
    reasonThisMatchesUserIntent: `carries the story arc, beat ${index + 1}`,
  }))
}

function storySequenceBrief(
  count = 5,
  planOverrides: Record<string, unknown> = {}
): CreativeBrief {
  return {
    outfit: "Toteme tailored camel coat",
    setting: "a quiet Oslo street at golden hour",
    mood: "honest, reflective",
    pose: "walking, glancing away",
    cameraSpec: "Leica Q3, 28mm f/1.7",
    lighting: "low golden-hour sun with soft shadow",
    graphic: {
      headline: "The day I stopped hiding online",
      creativePlan: {
        mode: "story_sequence",
        userIntent: "the day I stopped hiding online",
        useCase: "trust",
        audienceEmotion: "she gets me, I could do this too",
        contentGoal: "build trust through a real story",
        visualDirection: "one cohesive golden-hour street world, quiet luxury",
        vaultStyleReferences: [],
        referenceHandling: { identityStrategy: "selfie_identity_anchor" },
        outputCount: count,
        outputs: storyOutputs(count),
        validationRules: [],
        ...planOverrides,
      } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
    },
  }
}

// ─── 1. Truncated emit_concepts salvage (the vanished-cards killer) ─────────────

describe("salvageConceptsPayload (truncated emit_concepts tool JSON)", () => {
  const concept = (n: number) => ({
    id: `concept-${n}`,
    title: `Story ${n}`,
    description: "In her voice.",
    brief: { outfit: `outfit ${n}`, setting: `setting ${n}`, mood: "calm" },
  })

  it("rescues every COMPLETE concept from a mid-stream truncated payload", () => {
    const full = JSON.stringify({
      format: "story-sequence",
      concepts: [concept(1), concept(2), concept(3)],
    })
    // Cut inside the third concept, exactly like a token-ceiling truncation.
    const truncated = full.slice(0, full.lastIndexOf('"brief"') + 20)
    const salvaged = salvageConceptsPayload(truncated)
    expect(salvaged).not.toBeNull()
    expect(salvaged?.format).toBe("story-sequence")
    expect(salvaged?.concepts).toHaveLength(2)
    expect((salvaged?.concepts[0] as any).title).toBe("Story 1")
    expect((salvaged?.concepts[1] as any).brief.outfit).toBe("outfit 2")
  })

  it("passes through a parsed-but-schema-invalid object payload", () => {
    const payload = { format: "story-slide", concepts: [concept(1)] }
    expect(salvageConceptsPayload(payload)).toEqual({
      format: "story-slide",
      concepts: payload.concepts,
    })
  })

  it("parses a complete JSON string payload", () => {
    const salvaged = salvageConceptsPayload(
      JSON.stringify({ format: "story-slide", concepts: [concept(1), concept(2)] })
    )
    expect(salvaged?.concepts).toHaveLength(2)
    expect(salvaged?.format).toBe("story-slide")
  })

  it("is not fooled by braces and quotes inside string values", () => {
    const tricky = {
      format: "story-sequence",
      concepts: [
        { ...concept(1), description: 'She said: "it\'s {finally} me" and } smiled [' },
        concept(2),
      ],
    }
    const full = JSON.stringify(tricky)
    const truncated = full.slice(0, full.length - 15)
    const salvaged = salvageConceptsPayload(truncated)
    expect((salvaged?.concepts[0] as any).description).toContain("{finally}")
  })

  it("returns null for garbage, empty, and concept-free inputs", () => {
    expect(salvageConceptsPayload(null)).toBeNull()
    expect(salvageConceptsPayload(undefined)).toBeNull()
    expect(salvageConceptsPayload("")).toBeNull()
    expect(salvageConceptsPayload("Maya prose without any tool payload")).toBeNull()
    expect(salvageConceptsPayload({ notConcepts: true })).toBeNull()
    expect(salvageConceptsPayload('{"format":"story-sequence","concepts":[')).toBeNull()
  })

  it("is wired into the concierge concept extractors (client salvage path)", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain('from "@/lib/app-v3/concept-salvage"')
    expect(concierge).toContain("salvageConceptsPayload(part.rawInput ?? part.input)?.concepts")
    expect(concierge).toContain("salvageConceptsPayload(part.rawInput ?? part.input)?.format")
  })
})

// ─── 2. Story-sequence plan validation (no more carousel teaching rules) ────────

describe("story-sequence plan validation", () => {
  it("accepts a 5-beat emotional story planned with outputs only (no mirrored slides)", () => {
    const errors = validateCustomerCarouselBrief(
      storySequenceBrief(5),
      "The day I stopped hiding online",
      { mode: "story_sequence" }
    )
    expect(errors).toEqual([])
  })

  it("no longer applies the 6-slide educational carousel rule to a story sequence", () => {
    const brief = storySequenceBrief(5, { useCase: "educational" })
    const asCarousel = validateCustomerCarouselBrief(brief, "My story", { mode: "carousel" })
    expect(asCarousel.join(" ")).toContain("educational carousel needs at least 6 slides")

    const asStory = validateCustomerCarouselBrief(brief, "My story", { mode: "story_sequence" })
    expect(asStory.join(" ")).not.toContain("educational carousel needs at least 6 slides")
    expect(asStory).toEqual([])
  })

  it("still rejects impossible story counts (3, 5, or 7 beats)", () => {
    const errors = validateCustomerCarouselBrief(storySequenceBrief(4), "My story", {
      mode: "story_sequence",
    })
    expect(errors.join(" ")).toContain("must be 3, 5, or 7")
  })

  it("backfills a missing imagePromptDirection instead of hard-failing the whole set", () => {
    const brief = storySequenceBrief(5)
    brief.graphic!.creativePlan!.outputs = storyOutputs(5, false) as any
    const errors = validateCustomerCarouselBrief(brief, "My story", { mode: "story_sequence" })
    expect(errors.join(" ")).not.toContain("imagePromptDirection")
    expect(errors).toEqual([])
  })

  it("builds 5 renderable slides from creativePlan outputs alone", () => {
    const slides = buildGraphicRedesignSlides(storySequenceBrief(5), "story-sequence", "My story")
    expect(slides).toHaveLength(5)
    expect(slides[0].title).toBe("Beat 1")
    expect(slides.every(slide => slide.visualConcept)).toBe(true)
    // Every slide can carry a text overlay spec (autoBake requires specs.length === slides.length).
    const specs = slides.map(slide =>
      makeTextOverlaySpec({
        heading: slide.title,
        body: slide.body,
        role: slide.kind === "hook" ? "hook" : slide.kind === "cta" ? "cta" : "value",
        format: "story-sequence",
      })
    )
    expect(specs).toHaveLength(5)
    expect(specs.every(spec => spec.format === "story-sequence" && spec.headline)).toBe(true)
  })

  it("keeps existing carousel validation behavior unchanged when no mode is passed", () => {
    // Same call shape the carousel path uses - defaults to carousel mode.
    const brief = storySequenceBrief(5, { useCase: "educational", mode: "carousel" })
    const errors = validateCustomerCarouselBrief(brief, "My story")
    expect(errors.join(" ")).toContain("educational carousel needs at least 6 slides")
  })
})

// ─── 3. Generate route wiring (static contract) ─────────────────────────────────

describe("generate route story wiring (app/api/app-v3/maya/generate)", () => {
  const route = read("app/api/app-v3/maya/generate/route.ts")

  it("validates story sequences as story sequences, not carousels", () => {
    expect(route).toContain(
      'mode: format === "story-sequence" ? "story_sequence" : "carousel"'
    )
  })

  it("logs a suite_generation_failed event on the (formerly silent) plan-validation 400s", () => {
    expect(route).toContain("function logPlanInvalid")
    expect(route).toContain('eventName: "suite_generation_failed"')
    expect(route).toContain('reason: "plan_invalid"')
    // Both silent 400 paths are covered: multi-slide graphic + photoshoot.
    expect(route.match(/logPlanInvalid\(format, validationErrors\)/g)).toHaveLength(2)
  })

  it("grounds a member story slide as an identity scene (reel-cover), never overlay-only", () => {
    // The overlay-only "story-sequence" grounding preserves the input photo exactly - on a
    // selfie that returns the raw selfie. Story slides now share the reel-cover grounding.
    expect(route).toContain('return "reel-cover"')
    expect(route).not.toMatch(/if \(format === "reel-cover"\) return "reel-cover"\s*\n\s*return "story-sequence"/)
    // Style refs still come from the story-sequence anchors via fallback (no reel-cover rows).
    expect(route).toContain('format === "reel-cover" || format === "story-slide" ? "story-sequence" : undefined')
  })

  it("renders every graphic format at its concept size so clean render and bake match", () => {
    // The redesign call passes the shared route-level `size` (9:16 for story formats).
    expect(route).not.toContain('format === "story-sequence"\n                ? process.env.APP_V3_PORTRAIT_SIZE')
    expect(route).toMatch(/inspirationReferenceUrl,\s*\/\/ STORY-GENERATION fix[\s\S]{0,400}?size,/)
  })

  it("skips the auto-bake leg when the 300s ceiling can't fit it, instead of dying mid-bake", () => {
    expect(route).toContain("AUTO_BAKE_TIME_BUDGET_MS")
    expect(route).toContain("requestStartedAt")
    expect(route).toContain('autoBakeSkipped = "time_budget"')
    expect(route).toContain('reason: "time_budget_skipped"')
    expect(route).toContain("...(autoBakeSkipped ? { autoBakeSkipped } : {})")
  })

  it("keeps the graceful credit paths: 402 with code + current balance before any charge", () => {
    expect(route).toContain('code: "insufficient_credits"')
    expect(route).toContain("required: totalCost")
    expect(route).toContain("current,")
    // Auto-bake stays optional: without bake credits the clean render still returns.
    expect(route).toContain("const canBake = await checkCredits(neonUser.id, bakeCost)")
  })
})

// ─── 4. Chat route + persona (concept turns can't be silently cut anymore) ─────

describe("chat route concept-turn headroom (app/api/app-v3/maya/chat)", () => {
  const route = read("app/api/app-v3/maya/chat/route.ts")

  it("gives concept turns enough output tokens for 3 full story-sequence plans", () => {
    expect(route).toContain("const APP_V3_MAX_OUTPUT_TOKENS = 16384")
  })

  it("logs invalid/truncated emit_concepts calls instead of losing them silently", () => {
    expect(route).toContain("emit_concepts input did not parse")
    expect(route).toContain("invalid: true, truncated")
  })
})

describe("persona story-sequence contract (lib/app-v3/maya/persona)", () => {
  const persona = read("lib/app-v3/maya/persona.ts")

  it("keeps the story-sequence tool payload compact (no mirrored slides duplication)", () => {
    expect(persona).toContain(
      "do NOT copy the outputs into brief.graphic.slides for a story sequence"
    )
  })

  it("requires imagePromptDirection on every story output", () => {
    expect(persona).toContain("Every output MUST include imagePromptDirection")
  })
})
