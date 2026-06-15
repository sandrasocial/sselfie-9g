// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  BANNED_WORDS,
  findGroundingViolations,
  groundingSystemPrompt,
  hasGroundingViolations,
  sanitizeGroundedText,
} from "@/lib/content/grounding"

const read = (path: string) => readFileSync(path, "utf8")

describe("CONTENT-GROUNDING-01 canonical grounding", () => {
  it("locks the banned language and signature promise", () => {
    expect(BANNED_WORDS).toContain("elevate")
    expect(BANNED_WORDS).toContain("elevated")
    expect(groundingSystemPrompt()).toContain("Look like yourself, at your best.")
  })

  it("flags banned wording and m-dashes through one shared guard", () => {
    const violations = findGroundingViolations("Let's elevate your brand — no one will know.")

    expect(violations).toEqual(
      expect.arrayContaining([
        { type: "banned-word", value: "elevate" },
        { type: "banned-word", value: "no one will know" },
        { type: "m-dash", value: "—" },
      ])
    )
    expect(hasGroundingViolations("Look like yourself, at your best.")).toBe(false)
    expect(sanitizeGroundedText("one — two")).toBe("one : two")
  })

  it("wires the former drift points to the shared grounding module", () => {
    const brief = read("lib/content-engine/brief-generator.ts")
    const adminPersona = read("lib/app-v3/maya/admin-persona.ts")
    const corePersonality = read("lib/maya/core-personality.ts")
    const contentKitLlm = read("lib/content-kit/llm.ts")

    expect(brief).not.toContain("export const SANDRA_VOICE_RULES")
    expect(brief).toContain("@/lib/content/grounding")
    expect(adminPersona).toContain("@/lib/content/grounding")
    expect(corePersonality).toContain("@/lib/content/grounding")
    expect(contentKitLlm).toContain("groundingSystemPrompt")
  })

  it("grounds every admin content generator", () => {
    const carousel = read("lib/content-kit/carousel-generator.ts")
    const story = read("lib/content-kit/story-generator.ts")
    const shoot = read("lib/content-kit/shoot-generator.ts")

    expect(carousel).toContain("audienceBlock()")
    expect(carousel).toContain("proofBlock()")
    expect(carousel).toContain("getCarouselDesignGuide()")
    expect(story).toContain("NO-FAKE REMINDER")
    expect(story).toContain("proofBlock()")
    expect(shoot).toContain("AUDIENCE CONTEXT FOR whenToUse ONLY")
    expect(shoot).toContain("PROOF CONTEXT FOR SHOT UTILITY ONLY")
  })
})
