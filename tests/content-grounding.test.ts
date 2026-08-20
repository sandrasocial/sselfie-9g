// @vitest-environment node

import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

import {
  BANNED_WORDS,
  findGroundingViolations,
  groundingSystemPrompt,
  hasGroundingViolations,
  purposeMessagingBlock,
  sandraContentIdentityBlock,
  sanitizeGroundedText,
} from "@/lib/content/grounding"

const read = (path: string) => readFileSync(path, "utf8")

describe("CONTENT-GROUNDING-01 canonical grounding", () => {
  it("locks the banned language and signature promise", () => {
    expect(BANNED_WORDS).toContain("elevate")
    expect(BANNED_WORDS).toContain("elevated")
    expect(groundingSystemPrompt()).toContain("Look like yourself, at your best.")
  })

  it("locks Sandra's story and selling anchors for content generation", () => {
    const block = sandraContentIdentityBlock()

    expect(block).toContain("generic content strategist")
    expect(block).toContain("SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md")
    expect(block).toContain("two-bedroom apartment")
    expect(block).toContain("bathroom studio")
    expect(block).toContain("The photo gets attention")
    expect(block).toContain("capable, overwhelmed woman")
    expect(block).toContain("hairdresser who taught herself to code with AI at 39")
  })

  it("locks the purpose/category message that all content must ladder back to", () => {
    const block = purposeMessagingBlock()

    expect(block).toContain("SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md")
    expect(block).toContain("This was never just about selfies")
    expect(block).toContain("stop hiding")
    expect(block).toContain("build something of their own")
    expect(block).toContain("Low-ticket offers are bridges")
    expect(block).toContain("private buyer-specific channels")
    expect(block).toContain("does not automatically pitch a private service")
    expect(groundingSystemPrompt()).toContain("PURPOSE MESSAGING LOCK SOURCE")
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

  it("wires the live drift points to the shared grounding module", () => {
    const corePersonality = read("lib/maya/core-personality.ts")
    const contentKitLlm = read("lib/content-kit/llm.ts")

    expect(corePersonality).toContain("@/lib/content/grounding")
    expect(contentKitLlm).toContain("groundingSystemPrompt")
  })

  it("grounds every admin content generator", () => {
    const carousel = read("lib/content-kit/carousel-generator.ts")
    const story = read("lib/content-kit/story-generator.ts")
    const shoot = read("lib/content-kit/shoot-generator.ts")
    const corePersonality = read("lib/maya/core-personality.ts")

    expect(carousel).toContain("purposeMessagingBlock()")
    expect(carousel).toContain("audienceBlock()")
    expect(carousel).toContain("proofBlock()")
    expect(carousel).toContain("sandraContentIdentityBlock()")
    expect(carousel).toContain("getCarouselDesignGuide()")
    expect(story).toContain("purposeMessagingBlock()")
    expect(story).toContain("NO-FAKE REMINDER")
    expect(story).toContain("proofBlock()")
    expect(story).toContain("sandraContentIdentityBlock()")
    expect(shoot).toContain("AUDIENCE CONTEXT FOR whenToUse ONLY")
    expect(shoot).toContain("PROOF CONTEXT FOR SHOT UTILITY ONLY")
    expect(corePersonality).toContain("purposeMessagingBlock()")
  })

  it("documents the purpose lock in the canonical brand sources", () => {
    const lockPath = "docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md"
    const lock = read(lockPath)
    const sourceOfTruth = read("docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md")
    const repositoryInstructions = read("AGENTS.md")

    expect(lock).toContain("SSELFIE is Sandra's category")
    expect(lock).toContain("This was never just about selfies")
    expect(lock).toContain("Entry products are bridges")
    expect(lock).toContain("technology-enabled reinvention")
    expect(sourceOfTruth).toContain(lockPath)
    expect(repositoryInstructions).toContain("Use an old source only when Sandra names it")
    expect(repositoryInstructions).toContain("Never send, publish, charge, refund, contact a customer")
  })

  it("keeps generated grounding in sync with canonical docs", () => {
    const before = read("lib/content/grounding.ts")

    execFileSync("pnpm", ["-s", "sync:grounding"], { stdio: "pipe" })

    expect(read("lib/content/grounding.ts")).toBe(before)
  })
})
