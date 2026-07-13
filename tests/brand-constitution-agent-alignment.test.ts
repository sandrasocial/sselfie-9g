// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { BRAND_CONSTITUTION, brandConstitutionBlock, groundingSystemPrompt } from "@/lib/content/grounding"

const read = (path: string) => readFileSync(path, "utf8")
const constitutionPath = "docs/brand/SSELFIE_BRAND_CONSTITUTION.md"

describe("SSELFIE Brand Constitution", () => {
  it("locks the freedom-first hierarchy without promising income", () => {
    expect(BRAND_CONSTITUTION).toMatchObject({
      destination: "Freedom",
      bridge: "Visibility",
      startingTool: "Selfies",
      accelerator: "AI",
    })

    const block = brandConstitutionBlock()
    expect(block).toContain(constitutionPath)
    expect(block).toContain("earn her own money")
    expect(block).toContain("more choices")
    expect(block).toContain("No income guarantees")
    expect(groundingSystemPrompt()).toContain("SSELFIE BRAND CONSTITUTION")
  })

  it("derives the machine grounding from the Constitution instead of a second manual copy", () => {
    const constitution = read(constitutionPath)
    const match = constitution.match(
      /<!-- BRAND_CONSTITUTION_JSON_START\s*([\s\S]*?)\s*BRAND_CONSTITUTION_JSON_END -->/,
    )
    expect(match?.[1]).toBeTruthy()
    expect(BRAND_CONSTITUTION).toEqual(JSON.parse(match![1]))

    const grounding = read("lib/content/grounding.ts")
    expect(grounding).toContain("BRAND_CONSTITUTION_GENERATED_START")
    expect(grounding).toContain("Do not edit this block by hand")
    expect(read("scripts/sync-grounding.ts")).toContain("JSON.parse(sourceMatch[1])")
  })

  it("makes the constitution the first brand pointer for every agent entrypoint", () => {
    expect(existsSync(constitutionPath)).toBe(true)
    const constitution = read(constitutionPath)

    expect(constitution).toContain("Destination: Freedom")
    expect(constitution).toContain("Bridge: Visibility")
    expect(constitution).toContain("Starting tool: Selfies")
    expect(constitution).toContain("Accelerator: AI")

    for (const path of [
      "CLAUDE.md",
      "AGENTS.md",
      "README.md",
      "docs/CODEX_CONTEXT.md",
      "docs/README.md",
      "docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md",
      "docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md",
    ]) {
      expect(read(path), path).toContain(constitutionPath)
    }

    expect(read("scripts/sync-grounding.ts")).toContain(constitutionPath)
    expect(read("scripts/audit/sselfie-context-drift-scanner.ts")).toContain(constitutionPath)
  })
})

describe("Claude brand and revenue alignment", () => {
  it("tracks one read-only, research-first revenue campaign director template", () => {
    const path = ".agents/claude-templates/agents/revenue-campaign-director.md"
    expect(existsSync(path)).toBe(true)
    const agent = read(path)

    expect(agent).toContain(constitutionPath)
    expect(agent).toContain("READ-ONLY")
    expect(agent).toContain("primary sources")
    expect(agent).toContain("stripe_payments")
    expect(agent).toContain("Never send")
    expect(agent).toContain("P0")
    expect(agent).toContain("P1")
    expect(agent).toContain("P2")
  })

  it("gives Claude Desktop one complete internal alignment spec", () => {
    const path = "docs/operations/CLAUDE_DESKTOP_BRAND_ALIGNMENT_SPEC_2026-07-13.md"
    expect(existsSync(path)).toBe(true)
    const spec = read(path)

    expect(spec).toContain(constitutionPath)
    expect(spec).toContain("daily-email-draft")
    expect(spec).toContain("daily-story-sequence-draft")
    expect(spec).toContain("weekly-content-brief-draft")
    expect(spec).toContain("sselfie-brand")
    expect(spec).toContain("Do not create another scheduled task")
    expect(spec).toContain("Completion proof")
  })

  it("exposes the same canonical pointer to Claude and implementation agents", () => {
    const path = ".agents/skills/sselfie-brand-guardian/SKILL.md"
    expect(existsSync(path), path).toBe(true)
    const skill = read(path)
    expect(skill).toContain(constitutionPath)
    expect(skill).toContain("Do not copy the Constitution into another file")

    const spec = read("docs/operations/CLAUDE_DESKTOP_BRAND_ALIGNMENT_SPEC_2026-07-13.md")
    expect(spec).toContain(".agents/claude-templates/")
    expect(spec).toContain(".claude/agents/revenue-campaign-director.md")
  })

  it("removes stale facts from shared Claude marketing and audit agents", () => {
    const marketingContext = read(".agents/product-marketing-context.md")
    expect(marketingContext).toContain(constitutionPath)
    expect(marketingContext).toContain("contains no business facts")
    expect(marketingContext).not.toMatch(/180K|25[–-]45|\$27|custom-trained LoRA/)

    for (const path of [
      ".agents/claude-templates/skills/funnel-expert/SKILL.md",
      ".agents/claude-templates/skills/funnel-expert.md",
      ".agents/claude-templates/skills/resend-broadcast/SKILL.md",
    ]) {
      const funnelSkill = read(path)
      expect(funnelSkill).toContain(constitutionPath)
      expect(funnelSkill).toContain("current")
      expect(funnelSkill).not.toMatch(/180K|29 paying|\$47|€17|€27|\/freebie\/brand-strategy|\/studio\?tab=maya/)
    }

    const resendSkill = read(".agents/claude-templates/skills/resend-broadcast/SKILL.md")
    expect(resendSkill).toContain("Query Resend")
    expect(resendSkill).not.toMatch(/~2,965|3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd|Feb 28, 2026/)
    const driftScanner = read("scripts/audit/sselfie-context-drift-scanner.ts")
    expect(driftScanner).toContain(".agents/claude-templates/skills/funnel-expert/SKILL.md")
    expect(driftScanner).toContain(".agents/claude-templates/agents/revenue-campaign-director.md")
    expect(driftScanner).toContain(".agents/skills/sselfie-brand-guardian/SKILL.md")
    expect(driftScanner).toContain("claude_local_template_drift")
  })
})
