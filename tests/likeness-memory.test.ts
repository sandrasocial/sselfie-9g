// LIKENESS-MEMORY-01 — the likeness-memory loop (capture -> persist -> inject -> surface).
// Guards: the classifier catches the real corrections members made (2026-07 member pulse),
// never stores vanity asks, dedupes normalized notes, injects an accuracy block into the
// generation/edit prompts, is a no-op with the flag off, and its analytics event is allowed.

import { describe, expect, it, afterEach } from "vitest"
import { readFileSync } from "fs"
import path from "path"

import {
  buildLikenessPromptBlock,
  classifyLikenessCorrection,
  isLikenessMemoryEnabled,
  upsertLikenessNote,
  MAX_LIKENESS_NOTES,
  VANITY_DRIFT_PATTERN,
} from "@/lib/app-v3/likeness-memory"
import {
  ALLOWED_ANALYTICS_EVENTS,
  isAllowedAnalyticsEventName,
} from "@/lib/analytics/event-contract"
import { getAppV3MayaSystemPrompt } from "@/lib/app-v3/maya/persona"

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8")

describe("likeness correction classification", () => {
  // The real corrections from the 2026-07 member pulse audit must all be captured.
  it.each([
    ["head too big", "face"],
    ["my hair is dark brown not black", "hair"],
    ["add my mole", "marks"],
    ["remove dimple chin", "marks"],
    ["she looks too tall and stretched out", "proportions"],
  ])("captures the real member correction %j", (instruction, category) => {
    const result = classifyLikenessCorrection(instruction)
    expect(result.isLikeness).toBe(true)
    expect(result.category).toBe(category)
    expect(result.note).toBe(`${category}: ${instruction}`)
  })

  it("captures direct likeness complaints without a body-part word", () => {
    expect(classifyLikenessCorrection("this doesn't look like me").isLikeness).toBe(true)
    expect(classifyLikenessCorrection("that's not me").isLikeness).toBe(true)
  })

  it("captures identity facts like glasses and eye color", () => {
    expect(classifyLikenessCorrection("I wear glasses").isLikeness).toBe(true)
    expect(classifyLikenessCorrection("my eyes are blue not brown").isLikeness).toBe(true)
  })

  it("ignores ordinary styling and scene edits", () => {
    for (const instruction of [
      "make my blazer black",
      "brighter",
      "change the background to a cafe",
      "make my hair blonde for this shot",
      "add a coffee cup",
    ]) {
      expect(classifyLikenessCorrection(instruction).isLikeness).toBe(false)
    }
  })

  it("does not turn identity-preservation clauses into lasting likeness memory", () => {
    for (const instruction of [
      "Soften the café background slightly while keeping the window light natural and unchanged. Do not change her face, hair, black blazer, pose, framing, hands, or identity.",
      "Change the wall to charcoal; preserve my face and hair unchanged.",
      "Warm the color grade, but don't alter my face, body, or hair.",
    ]) {
      expect(classifyLikenessCorrection(instruction)).toMatchObject({
        isLikeness: false,
        note: null,
      })
    }
  })

  it("still captures a real hair correction rather than stripping it as preservation", () => {
    expect(classifyLikenessCorrection("keep my hair dark brown, not black")).toMatchObject({
      isLikeness: true,
      category: "hair",
    })
  })

  it("NEVER stores a vanity ask as a likeness note (No-Fake doctrine)", () => {
    for (const instruction of [
      "make me thinner",
      "make my skin flawless",
      "make me look younger",
      "slimmer face please",
      "airbrush my arms",
    ]) {
      const result = classifyLikenessCorrection(instruction)
      expect(result.isVanity).toBe(true)
      expect(result.isLikeness).toBe(false)
      expect(result.note).toBeNull()
    }
  })

  it("shares the exact vanity pattern the edit route's doctrine guard uses", () => {
    expect(VANITY_DRIFT_PATTERN.test("flawless")).toBe(true)
    const editRoute = read("app/api/app-v3/maya/edit/route.ts")
    expect(editRoute).toContain("VANITY_DRIFT_PATTERN")
    expect(editRoute).toContain('from "@/lib/app-v3/likeness-memory"')
  })

  it("normalizes notes: trims, collapses whitespace, strips trailing punctuation, caps length", () => {
    const result = classifyLikenessCorrection("  my hair   is dark brown not black!!  ")
    expect(result.note).toBe("hair: my hair is dark brown not black")
    const long = classifyLikenessCorrection(`my hair is ${"very ".repeat(80)}dark not black`)
    expect(long.note!.length).toBeLessThanOrEqual("hair: ".length + 160)
  })
})

describe("likeness note dedupe", () => {
  it("never stores the same normalized note twice; a repeat refreshes instead", () => {
    const first = upsertLikenessNote([], "hair: my hair is dark brown not black")
    expect(first.notes).toEqual(["hair: my hair is dark brown not black"])
    expect(first.added).toBe(true)

    const repeat = upsertLikenessNote(first.notes, "hair: MY HAIR IS DARK BROWN NOT BLACK")
    expect(repeat.notes).toHaveLength(1)
    expect(repeat.added).toBe(false)
    expect(repeat.updated).toBe(true)
  })

  it("keeps distinct notes and caps the list at the most recent MAX_LIKENESS_NOTES", () => {
    let notes: string[] = []
    for (let i = 0; i < MAX_LIKENESS_NOTES + 5; i++) {
      notes = upsertLikenessNote(notes, `face: correction number ${i}`).notes
    }
    expect(notes).toHaveLength(MAX_LIKENESS_NOTES)
    expect(notes[notes.length - 1]).toBe(`face: correction number ${MAX_LIKENESS_NOTES + 4}`)
    expect(notes).not.toContain("face: correction number 0")
  })
})

describe("prompt injection", () => {
  it("builds an accuracy block that carries every note, framed as accuracy not beautification", () => {
    const block = buildLikenessPromptBlock([
      "hair: my hair is dark brown not black",
      "marks: add my mole",
    ])
    expect(block).toContain("hair: my hair is dark brown not black")
    expect(block).toContain("marks: add my mole")
    expect(block).toContain("always honor")
    expect(block).toContain("accuracy, not beautification")
    expect(block).toContain("recognizable")
    expect(block).not.toContain("—")
  })

  it("returns an empty block for no notes", () => {
    expect(buildLikenessPromptBlock([])).toBe("")
    expect(buildLikenessPromptBlock(["  "])).toBe("")
  })

  it("the generate route injects the block into every render path, flag-gated", () => {
    const src = read("app/api/app-v3/maya/generate/route.ts")
    expect(src).toContain("isLikenessMemoryEnabled()")
    expect(src).toContain("buildLikenessPromptBlock")
    // Both non-streaming and streaming OpenAI calls wrap the prompt (the argument now
    // carries an optional reference-role label, so match the call site, not the exact arg).
    expect(src.match(/withLikeness\(/g)?.length).toBeGreaterThanOrEqual(2)
    // The graphic/slide pipeline carries the notes too.
    expect(src).toContain("extraIdentityInstruction: likenessBlock || undefined")
  })

  it("the edit route captures corrections and injects stored notes, flag-gated", () => {
    const src = read("app/api/app-v3/maya/edit/route.ts")
    expect(src).toContain("isLikenessMemoryEnabled()")
    expect(src).toContain("classifyLikenessCorrection(instruction)")
    expect(src).toContain("addLikenessNote")
    expect(src).toContain("suite_likeness_note_captured")
    // The prompt builder takes both the visual edit reference and the likeness block on the first
    // try and the safer retry. Allow formatter whitespace so this asserts semantics, not layout.
    expect(
      src.match(
        /buildEditPrompt\(\s*instruction,\s*(?:false|true),\s*hasIdentityReference,\s*hasEditReference,\s*likenessBlock\s*\)/g
      )?.length
    ).toBe(2)
  })

  it("Maya's chat persona sees the notes so she never re-asks", () => {
    const system = getAppV3MayaSystemPrompt({
      aestheticName: "SSELFIE editorial",
      aestheticIntent: "Editorial brand-shoot look.",
      format: "photo",
      memory: {
        agentName: "Aria",
        brandNotes: null,
        preferences: null,
        likenessNotes: ["hair: my hair is dark brown not black"],
      },
    })
    expect(system).toContain("hair: my hair is dark brown not black")
    expect(system).toContain("Likeness corrections she already made")
  })
})

describe("kill switch (APP_V3_LIKENESS_MEMORY_ENABLED, house style: default OFF)", () => {
  const original = process.env.APP_V3_LIKENESS_MEMORY_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.APP_V3_LIKENESS_MEMORY_ENABLED
    else process.env.APP_V3_LIKENESS_MEMORY_ENABLED = original
  })

  it("is OFF by default and OFF on explicit false", () => {
    delete process.env.APP_V3_LIKENESS_MEMORY_ENABLED
    expect(isLikenessMemoryEnabled()).toBe(false)
    process.env.APP_V3_LIKENESS_MEMORY_ENABLED = "false"
    expect(isLikenessMemoryEnabled()).toBe(false)
    process.env.APP_V3_LIKENESS_MEMORY_ENABLED = ""
    expect(isLikenessMemoryEnabled()).toBe(false)
  })

  it("turns on only with an explicit true/1/on", () => {
    process.env.APP_V3_LIKENESS_MEMORY_ENABLED = "true"
    expect(isLikenessMemoryEnabled()).toBe(true)
    process.env.APP_V3_LIKENESS_MEMORY_ENABLED = "1"
    expect(isLikenessMemoryEnabled()).toBe(true)
    process.env.APP_V3_LIKENESS_MEMORY_ENABLED = "on"
    expect(isLikenessMemoryEnabled()).toBe(true)
  })

  it("flag off = capture and injection are both no-ops (guarded at every entry point)", () => {
    // Every capture/injection site sits behind the flag; with it off, nothing runs.
    for (const rel of [
      "app/api/app-v3/maya/edit/route.ts",
      "app/api/app-v3/maya/generate/route.ts",
      "app/api/app-v3/maya/chat/route.ts",
    ]) {
      expect(read(rel)).toContain("isLikenessMemoryEnabled()")
    }
  })
})

describe("analytics contract", () => {
  it("allows suite_likeness_note_captured (new events are rejected unless allowed)", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("suite_likeness_note_captured")
    expect(isAllowedAnalyticsEventName("suite_likeness_note_captured")).toBe(true)
  })
})

describe("member surface (Memory modal)", () => {
  it("shows likeness notes and lets the member remove a wrong one", () => {
    const modal = read("components/app-v3/memory-modal.tsx")
    expect(modal).toContain("likenessNotes")
    expect(modal).toContain("removeLikenessNote")
    expect(modal).toContain("What Maya keeps true about you")
    const api = read("app/api/app-v3/maya/memory/route.ts")
    expect(api).toContain("removeLikenessNote")
  })
})
