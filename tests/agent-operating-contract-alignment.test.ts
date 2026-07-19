// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

const CONTRACT = "docs/business/SANDRA_AI_TEAM_BRAIN_PACK_2026-07-16.md"
const VOICE = "docs/brand/SANDRA_VOICE_OS_2026-07-16.md"
const SOURCE = "docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md"

describe("Sandra AI team operating contract", () => {
  it("gives every agent permission to think without granting an accidental launch", () => {
    expect(existsSync(CONTRACT)).toBe(true)
    const contract = read(CONTRACT)

    expect(contract).toContain("not a ban on imagination")
    expect(contract).toContain("A specialist skill is a lens")
    expect(contract).toContain("Think freely")
    expect(contract).toContain("Change external reality deliberately")
    expect(contract).toContain("Drafting, analysis, local implementation, tests, and internal artifacts")
  })

  it("is loaded by the shared implementation entrypoints", () => {
    for (const path of ["AGENTS.md", "CLAUDE.md", "docs/CODEX_CONTEXT.md", "README.md", "docs/README.md"]) {
      expect(read(path), path).toContain(CONTRACT)
    }
  })

  it("uses Sandra's approved voice without a mandatory scorecard", () => {
    const voice = read(VOICE)

    for (const phrase of [
      "Honest before impressive",
      "Specific before inspirational",
      "Simple before clever",
      "Hopeful without pretending",
      "Beside her, not above her",
    ]) {
      expect(voice).toContain(phrase)
    }

    expect(voice).toContain("Do not show Sandra a numeric voice score unless she asks")

    for (const path of [
      ".agents/skills/sandra-writing-style/SKILL.md",
      ".agents/skills/sandra-writing-style/references/sandra-voice-contract.md",
      ".agents/skills/sandra-writing-style/agents/openai.yaml",
      ".agents/claude-templates/skills/sselfie-brand/SKILL.md",
    ]) {
      expect(read(path), path).not.toContain("9/10")
    }
  })

  it("grounds the niche in reinvention and Sandra's lived edge", () => {
    const source = read(SOURCE)

    expect(source).toContain("technology-enabled reinvention")
    expect(source).toContain("Maybe I am not finished")
    expect(source).toContain("hairdresser")
    expect(source).toContain("teaching herself to code with AI at 39")
    expect(source).toContain("Tutorials are the reach engine")
    expect(source).toContain("real story is the trust engine")
  })

  it("keeps specialist skills useful instead of turning them into vetoes", () => {
    for (const path of [
      ".agents/skills/sselfie-company-os/SKILL.md",
      ".agents/skills/sselfie-business-architect/SKILL.md",
      ".agents/skills/offer-architecture/SKILL.md",
      ".agents/skills/sselfie-brand-guardian/SKILL.md",
      ".claude/agents/offer-architect.md",
      ".claude/agents/revenue-campaign-director.md",
    ]) {
      const skill = read(path)
      expect(skill, path).toMatch(/explor|hypothesis|new idea/i)
      expect(skill, path).not.toContain("Do not invent another product")
    }
  })
})
