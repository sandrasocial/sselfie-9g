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
  conceptOpenAISize,
  stripStructuralHeading,
  validateCustomerCarouselBrief,
} from "@/lib/app-v3/prompt-compiler"
import { normalizeOpenAIImageSize } from "@/lib/app-v3/openai-image-size"
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

function storySequenceBrief(count = 5, planOverrides: Record<string, unknown> = {}): CreativeBrief {
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

  it("finds a concepts array buried under a wrapper key (invalid story-sequence shape, 2026-07-03)", () => {
    const wrapped = { input: { format: "story-sequence", concepts: [concept(1), concept(2)] } }
    const salvaged = salvageConceptsPayload(wrapped)
    expect(salvaged?.concepts).toHaveLength(2)
    expect(salvaged?.format).toBe("story-sequence")

    const doubleWrapped = {
      format: "story-sequence",
      plan: { data: { concepts: [concept(1)] } },
    }
    const salvaged2 = salvageConceptsPayload(doubleWrapped)
    expect(salvaged2?.concepts).toHaveLength(1)
    // Format inherited from the outer object when the inner one has none.
    expect(salvaged2?.format).toBe("story-sequence")
  })

  it("recovers concepts the model JSON-stringified instead of nesting", () => {
    // Plausible cause of the 2026-07-03 invalid story-sequence calls: complete JSON,
    // schema-invalid, and NO top-level concepts array - because concepts arrived as a string.
    const stringified = {
      format: "story-sequence",
      concepts: JSON.stringify([concept(1), concept(2), concept(3)]),
    }
    const salvaged = salvageConceptsPayload(stringified)
    expect(salvaged?.concepts).toHaveLength(3)
    expect(salvaged?.format).toBe("story-sequence")

    // Same, but the stringified array itself was cut mid-stream.
    const full = JSON.stringify([concept(1), concept(2)])
    const cutStringified = {
      format: "story-slide",
      concepts: full.slice(0, full.length - 10),
    }
    expect(salvageConceptsPayload(cutStringified)?.concepts).toHaveLength(1)
  })

  it("recovers concepts sent as an index-keyed object map instead of an array", () => {
    const mapShape = {
      format: "story-sequence",
      concepts: { "1": concept(1), "2": concept(2) },
    }
    const salvaged = salvageConceptsPayload(mapShape)
    expect(salvaged?.concepts).toHaveLength(2)
    expect((salvaged?.concepts[0] as any).title).toBe("Story 1")
  })

  it("recovers a payload hidden inside a JSON-string wrapper value", () => {
    const wrapper = {
      data: JSON.stringify({ format: "story-slide", concepts: [concept(1)] }),
    }
    expect(salvageConceptsPayload(wrapper)?.concepts).toHaveLength(1)
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
    // 2026-07-03: the extractor must not discard story concepts missing a photo brief
    // field - it coerces the brief instead of filtering on brief.outfit.
    expect(concierge).not.toContain('typeof c.brief.outfit === "string"')
    expect(concierge).toContain("cameraSpec: str(brief.cameraSpec)")
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
    expect(slides[0].title.toLowerCase()).toBe("the day i stopped hiding online")
    expect(slides.map(slide => slide.title).join(" ")).not.toMatch(
      /\b(slide|beat|hook|doubt|invitation)\b/i
    )
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
    expect(route).toContain('mode: format === "story-sequence" ? "story_sequence" : "carousel"')
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
    expect(route).not.toMatch(
      /if \(format === "reel-cover"\) return "reel-cover"\s*\n\s*return "story-sequence"/
    )
    // Style refs still come from the story-sequence anchors via fallback (no reel-cover rows).
    expect(route).toContain(
      'format === "reel-cover" || format === "story-slide" ? "story-sequence" : undefined'
    )
  })

  it("renders every graphic format at its concept size so clean render and bake match", () => {
    // The redesign call passes the shared route-level `size` (9:16 for story formats).
    expect(route).not.toContain(
      'format === "story-sequence"\n                ? process.env.APP_V3_PORTRAIT_SIZE'
    )
    expect(route).toMatch(/inspirationReferenceUrl,\s*\/\/ STORY-GENERATION fix[\s\S]{0,400}?size,/)
  })

  it("skips the auto-bake leg when the 300s ceiling can't fit it, instead of dying mid-bake", () => {
    expect(route).toContain("AUTO_BAKE_TIME_BUDGET_MS")
    expect(route).toContain("requestStartedAt")
    expect(route).toContain('autoBakeSkipped = "time_budget"')
    expect(route).toContain('reason: "time_budget_skipped"')
    expect(route).toContain("...(autoBakeSkipped ? { autoBakeSkipped } : {})")
  })

  it("uses the explicit graphic text mode for story slides and sequences", () => {
    expect(route).toContain("function shouldBakeGraphicText")
    expect(route).toContain("normalizeGraphicTextMode(body.textOverlayMode)")
    expect(route).toContain("const cleanGraphicBackground")
    expect(route).toContain('textMode: cleanGraphicBackground ? "clean-background" : "baked"')
    expect(route).toContain("textSuggestionEnabled: Boolean(requestedTextOverlayMode)")
  })

  it("keeps the graceful credit paths: 402 with code + current balance before any charge", () => {
    expect(route).toContain('code: "insufficient_credits"')
    expect(route).toContain("required: totalCost")
    expect(route).toContain("current,")
    // Auto-bake stays optional: without bake credits the clean render still returns.
    expect(route).toContain("const canBake = await checkCredits(neonUser.id, bakeCost)")
  })
})

// ─── 4. OpenAI size env safety ────────────────────────────────────────────────

describe("OpenAI image size env normalization", () => {
  it("trims hidden whitespace before sending custom sizes to OpenAI", () => {
    expect(normalizeOpenAIImageSize("1024x1824\r\n", "1024x1536")).toBe("1024x1824")
    expect(normalizeOpenAIImageSize(" 1024x1280 ", "1024x1536")).toBe("1024x1280")
  })

  it("falls back instead of sending malformed sizes to OpenAI", () => {
    expect(normalizeOpenAIImageSize("1024 x 1824", "1024x1536")).toBe("1024x1536")
    expect(normalizeOpenAIImageSize("1024x1825", "1024x1536")).toBe("1024x1536")
  })

  it("uses normalized portrait and carousel env sizes in the Suite generate route", () => {
    const originalPortrait = process.env.APP_V3_PORTRAIT_SIZE
    const originalCarousel = process.env.APP_V3_CAROUSEL_SIZE
    try {
      process.env.APP_V3_PORTRAIT_SIZE = "1024x1824\r\n"
      process.env.APP_V3_CAROUSEL_SIZE = "1024x1280\n"
      expect(conceptOpenAISize("photo")).toBe("1024x1824")
      expect(conceptOpenAISize("story-sequence")).toBe("1024x1824")
      expect(conceptOpenAISize("carousel")).toBe("1024x1280")
    } finally {
      if (originalPortrait === undefined) delete process.env.APP_V3_PORTRAIT_SIZE
      else process.env.APP_V3_PORTRAIT_SIZE = originalPortrait
      if (originalCarousel === undefined) delete process.env.APP_V3_CAROUSEL_SIZE
      else process.env.APP_V3_CAROUSEL_SIZE = originalCarousel
    }
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
    expect(route).toContain("invalid: true,")
  })

  it("repairs malformed emit_concepts calls server-side before validation fails", () => {
    // Round 3 (2026-07-03): client salvage still left the member a dead end because the
    // SDK dropped the invalid call. experimental_repairToolCall salvages + coerces +
    // re-validates against the real tool schema, so the cards render normally.
    expect(route).toContain("experimental_repairToolCall")
    expect(route).toContain("emitConceptsInputSchema.safeParse(candidate)")
    expect(route).toContain('logBehavior("suite_concepts_repaired"')
    // Silent stream deaths (the "no event at all" failure mode) are now visible too.
    expect(route).toContain("onAbort")
    expect(route).toContain('logBehavior("suite_chat_aborted"')
    const contract = read("lib/analytics/event-contract.ts")
    expect(contract).toContain('"suite_concepts_repaired"')
    expect(contract).toContain('"suite_chat_aborted"')
  })

  it("persists the failure shape into analytics_events, not just Vercel console logs", () => {
    // 2026-07-03: two live story-sequence failures were undiagnosable because the payload
    // head only went to console.error and Vercel runtime logs expire within the hour.
    expect(route).toContain('from "@/lib/app-v3/concept-salvage"')
    expect(route).toContain("errorHead: cause.slice(0, 400)")
    expect(route).toContain("payloadHead: payloadHead.slice(0, 1200)")
    expect(route).toContain("salvaged: salvaged ?? 0")
  })
})

describe("persona carousel copy contract (lib/app-v3/maya/persona)", () => {
  const persona = read("lib/app-v3/maya/persona.ts")

  it("keeps the carousel tool payload compact (no mirrored slides duplication)", () => {
    expect(persona).toContain(
      "do NOT copy the outputs into brief.graphic.slides: the creativePlan outputs alone are enough"
    )
    expect(persona).not.toContain("mirror the Creative Plan output into brief.graphic.slides")
  })

  it("declares output titles and bodies as the literal baked slide copy", () => {
    expect(persona).toContain("CAROUSEL COPY RULES")
    expect(persona).toContain(
      "Each creativePlan output title IS the exact line baked onto that slide"
    )
    expect(persona).toContain("must never appear in a title, heading, or body")
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

  it("bans planning labels on images and demands HER real story (premium copy, 2026-07-03)", () => {
    // Live failure: a paying member's story sequence baked "Slide 1: The Hook" as the
    // actual headline with generic placeholder copy. Titles ARE the baked text.
    expect(persona).toContain("the title of every output IS the literal text baked onto that slide")
    expect(persona).toContain("must NEVER appear in a title or on an image")
    expect(persona).toContain(
      "her transformation story, her niche, her brand voice, her memory notes"
    )
    expect(persona).toContain("do not invent a generic story for a paying member")
  })

  it("uses exact user-provided story text as the source copy, not generic suggestions", () => {
    expect(persona).toContain("If she gives a specific line, quote, phrase")
    expect(persona).toContain("If she gives exact story text, lines, phrases")
    expect(persona).toContain("use it as source copy and build the sequence around it")
  })
})

describe("story text stays in Maya planning, not legacy Text Studio", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")
  const card = read("components/app-v3/concept-card.tsx")
  const lightbox = read("components/app-v3/image-lightbox.tsx")

  it("does not intercept story text requests as direct overlay edits", () => {
    expect(concierge).toContain("function isStoryGraphicFormat")
    expect(concierge).toContain("if (isStoryGraphicFormat(target.spec.format)) return false")
    expect(concierge).toContain("Story slides/sequences are content-planning surfaces")
  })

  it("removes the old Text Studio entry points for every graphic format", () => {
    expect(concierge).not.toContain("<TextStudio")
    expect(concierge).not.toContain("setTextStudio")
    expect(card).not.toContain("onOpenTextStudio")
    expect(card).not.toContain("TextOverlayLayer")
    expect(lightbox).not.toContain("onOpenTextStudio")
    expect(lightbox).not.toContain("TextOverlayLayer")
  })
})

describe("baked-slide structural label backstop (lib/app-v3/prompt-compiler)", () => {
  it("strips Maya's internal beat labels from headings at bake time", () => {
    expect(stripStructuralHeading("Slide 5: The Invitation")).toBe("")
    expect(stripStructuralHeading("Slide 1 - The Hook")).toBe("")
    expect(stripStructuralHeading("The Hook")).toBe("")
    expect(stripStructuralHeading("The Doubt")).toBe("")
    expect(stripStructuralHeading("The Shift")).toBe("")
    expect(stripStructuralHeading("The Truth")).toBe("")
    expect(stripStructuralHeading("The Invitation")).toBe("")
    expect(stripStructuralHeading("Soft CTA")).toBe("")
    expect(stripStructuralHeading("slide 2. I almost quit this year")).toBe(
      "I almost quit this year"
    )
    expect(stripStructuralHeading("Hook: your first line matters")).toBe("your first line matters")
    // Real story lines pass through untouched.
    expect(stripStructuralHeading("Nobody knew I was starting over")).toBe(
      "Nobody knew I was starting over"
    )
    expect(stripStructuralHeading("The shift that changed my business")).toBe(
      "The shift that changed my business"
    )
  })

  it("strips the label variants that baked onto a live member carousel (2026-07-20)", () => {
    expect(stripStructuralHeading("The Callout Hook")).toBe("")
    expect(stripStructuralHeading("Soft CTA into the Membership")).toBe("")
    expect(stripStructuralHeading("The Turn")).toBe("")
    expect(stripStructuralHeading("The Big Reveal")).toBe("")
    expect(stripStructuralHeading("Slide 3 of 7")).toBe("")
    expect(stripStructuralHeading("The Turn: What If One Thing Actually Knew You?")).toBe(
      "What If One Thing Actually Knew You?"
    )
    // Real copy that merely contains a beat word still passes untouched.
    expect(stripStructuralHeading("The truth about pricing")).toBe("The truth about pricing")
    expect(stripStructuralHeading("Turn your selfies into a brand")).toBe(
      "Turn your selfies into a brand"
    )
  })

  it("never bakes planning fields or beat labels on customer carousel slides", () => {
    const brief: CreativeBrief = {
      outfit: "black ribbed turtleneck, tailored trousers",
      setting: "moody bedroom with an arched mirror",
      mood: "honest, a little tired, then lighter",
      pose: "sitting on the bed with her phone",
      cameraSpec: "Leica Q3, 28mm f/1.7",
      lighting: "low warm window light",
      graphic: {
        designSystem: "full-bleed-editorial",
        creativePlan: {
          mode: "carousel",
          userIntent: "Tired of juggling five tools just to post once",
          useCase: "trust",
          audienceEmotion: "she feels seen, then relieved",
          contentGoal: "build trust and invite the next step",
          visualDirection: "one moody editorial bedroom world",
          vaultStyleReferences: [],
          referenceHandling: { identityStrategy: "selfie_identity_anchor" },
          outputCount: 3,
          outputs: [
            {
              title: "The Callout Hook",
              body: "Tired of this hot mess?",
              purpose: "call out the overwhelm",
              visualConcept: "her on the bed, phone in hand",
              imagePromptDirection: "same woman on the bed with her phone, moody light",
              referenceImageStrategy: "selfie_identity_anchor",
              reasonThisMatchesUserIntent: "names the pain",
            },
            {
              title: "The Turn: What If One Thing Actually Knew You?",
              purpose: "introduce the shift",
              visualConcept: "her standing at the mirror",
              imagePromptDirection: "same woman at the arched mirror",
              referenceImageStrategy: "selfie_identity_anchor",
              reasonThisMatchesUserIntent: "creates the turn",
            },
            {
              title: "Soft CTA into the Membership",
              body: "Soft CTA",
              purpose: "soft CTA into the membership",
              visualConcept: "her walking toward the light",
              imagePromptDirection: "same woman walking toward the window light",
              referenceImageStrategy: "selfie_identity_anchor",
              reasonThisMatchesUserIntent: "invites the next step",
            },
          ],
          validationRules: [],
        } as NonNullable<CreativeBrief["graphic"]>["creativePlan"],
      },
    }

    const slides = buildGraphicRedesignSlides(brief, "carousel", "Tired of the hot mess")
    expect(slides.map(slide => slide.title)).toEqual([
      "Tired of juggling five tools just to post once",
      "What If One Thing Actually Knew You?",
      "Save this one for later",
    ])
    // Outputs-only briefs (no mirrored slides array) carry the supporting line through the
    // plan output's body, and body copy is label-sanitized exactly like headlines.
    expect(slides[0].body).toBe("Tired of this hot mess?")
    expect(slides[2].body).toBe("")
    for (const slide of slides) {
      expect(slide.title).not.toMatch(/\b(hook|cta|the turn|the truth|slide \d+)\b/i)
      expect(slide.title).not.toBe(slide.purpose)
    }
  })

  it("replaces pure story beat labels with usable story copy before building overlay specs", () => {
    const brief = storySequenceBrief(5)
    brief.graphic!.creativePlan!.userIntent = "The messy middle of becoming the woman I am"
    brief.graphic!.creativePlan!.outputs = [
      {
        title: "Slide 1: The Hook",
        purpose: "Open the emotional story",
        visualConcept: "quiet coffee shop profile moment",
        imagePromptDirection: "same woman in a quiet coffee shop",
      },
      {
        title: "The Doubt",
        purpose: "show the doubt",
        visualConcept: "looking down at her phone",
        imagePromptDirection: "same woman looking down at her phone",
      },
      {
        title: "The Shift",
        purpose: "show the shift",
        visualConcept: "soft window light, calmer posture",
        imagePromptDirection: "same woman in soft window light",
      },
      {
        title: "The Truth",
        purpose: "show the realization",
        visualConcept: "walking with coffee in hand",
        imagePromptDirection: "same woman walking with coffee in hand",
      },
      {
        title: "Slide 5: The Invitation",
        purpose: "invite the viewer",
        visualConcept: "quiet final frame with negative space",
        imagePromptDirection: "same woman in a quiet final frame",
      },
    ] as any

    const slides = buildGraphicRedesignSlides(brief, "story-sequence", "My story")
    expect(slides).toHaveLength(5)
    for (const slide of slides) {
      expect(slide.title).not.toMatch(
        /^(slide|beat|the hook|hook|the doubt|doubt|the shift|shift|the truth|truth|the invitation|invitation|cta)/i
      )
    }
    const specs = slides.map(slide =>
      makeTextOverlaySpec({
        heading: slide.title,
        body: slide.body,
        role: slide.kind === "hook" ? "hook" : slide.kind === "cta" ? "cta" : "value",
        format: "story-sequence",
      })
    )
    expect(specs.map(spec => spec.headline).join(" ")).not.toMatch(
      /\b(The Hook|The Doubt|The Shift|The Truth|The Invitation|Slide \d+)\b/i
    )
  })

  it("keeps single story slides from baking pure planning labels", () => {
    const brief = storySequenceBrief(1)
    brief.graphic = {
      headline: "The Doubt",
      subline: "The part before it made sense",
      creativePlan: {
        mode: "story_sequence",
        userIntent: "The day I stopped hiding online",
        useCase: "trust",
        audienceEmotion: "she sees herself in this",
        contentGoal: "make the first story slide feel personal",
        visualDirection: "quiet editorial morning",
        outputCount: 1,
        outputs: [
          {
            title: "Slide 1: The Hook",
            purpose: "open the story",
            visualConcept: "quiet morning with phone in hand",
            imagePromptDirection: "same woman in a quiet morning story frame",
          },
        ],
        validationRules: [],
      } as any,
    }

    const slide = buildGraphicRedesignSlides(brief, "story-slide", "My story")[0]
    expect(slide.title).not.toMatch(/^(slide|the hook|hook|the doubt|doubt)$/i)
    expect(
      makeTextOverlaySpec({ heading: slide.title, role: "hook", format: "story-slide" }).headline
    ).not.toMatch(/The Hook|The Doubt|Slide 1/i)
  })

  it("is applied at every heading composition point", () => {
    const compiler = read("lib/app-v3/prompt-compiler.ts")
    const applications = compiler.match(/stripStructuralHeading\(/g) || []
    // 1 definition + outputFromSlide + outputAsSlide + plan outputs + multi-slide title
    // + single-slide title (headline + planOutput).
    expect(applications.length).toBeGreaterThanOrEqual(7)
  })
})
