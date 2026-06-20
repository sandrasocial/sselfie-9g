// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import { buildContentSlideRedesignPrompt } from "@/lib/content-kit/slide-redesign-generator"
import { SSELFIE_GRAPHIC_STYLE_PROMPT } from "@/lib/app-v3/maya/visual-rules"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

vi.mock("server-only", () => ({}))

const retiredAccentTerms = [/oxblood/i, /burgundy/i, /#6E2A35/i]

function expectNoRetiredAccentTerms(text: string) {
  for (const term of retiredAccentTerms) {
    expect(text).not.toMatch(term)
  }
}

describe("Maya June 11 restoration guardrails", () => {
  it("keeps shared graphic prompts out of the retired red accent language", () => {
    expectNoRetiredAccentTerms(SSELFIE_GRAPHIC_STYLE_PROMPT)

    const prompt = buildContentSlideRedesignPrompt({
      category: "photoshoot-carousel",
      topic: "How to prep your brand photoshoot",
      styleLabel: "approved SSELFIE reference",
      referenceMode: "identity-scene",
      slide: {
        kind: "hook",
        title: "Prep Like This",
        body: "The small choices that make it feel like you.",
        visualConcept: "same woman at a clean studio desk with wardrobe notes",
        imagePromptDirection: "editorial planning moment, neutral palette, calm negative space",
      },
    })

    expect(prompt).toContain("Premium SSELFIE editorial slide")
    expect(prompt).toContain("neutral palette")
    expectNoRetiredAccentTerms(prompt)
  })

  it("applies the shared graphic rules to user-facing reel covers", () => {
    const brief: CreativeBrief = {
      outfit: "Toteme ivory knit and tailored black trousers",
      setting: "quiet Copenhagen apartment with morning window light",
      mood: "calm, direct, editorial",
      pose: "seated at a table, looking slightly off-camera",
      cameraSpec: "Canon EOS R5, 50mm f/1.8",
      lighting: "soft north-facing window light",
      graphic: {
        headline: "Stop Waiting",
        subline: "Your brand can look like you now.",
      },
    }

    const prompt = compileConceptJobs(brief, "reel-cover")[0]?.passes[0]?.prompt ?? ""
    expect(prompt).toContain("Premium SSELFIE editorial slide")
    expect(prompt).toContain("No red accent palette")
    expectNoRetiredAccentTerms(prompt)
  })

  it("keeps inspiration handling close to the June 11 prompting plan", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    expect(route).toContain("SSELFIE_INSPIRATION_CLOSE_RECREATE")
    expect(route).toContain("close-recreation")
    expect(route).toContain("set-variation")
    expect(route).toContain("isHero ? \"close-recreation\" : \"set-variation\"")
  })

  it("gates admin prompt inspection on the server and reads the stored ai_images prompt", () => {
    const route = readFileSync("app/api/admin/app-v3/generation-prompt/route.ts", "utf8")
    expect(route).toContain("isAdminEmail")
    expect(route).toContain('return NextResponse.json({ error: "Forbidden" }, { status: 403 })')
    expect(route).toContain("FROM ai_images")
    expect(route).toContain("generated_prompt")
    expect(route).toContain("modelProvider: \"openai\"")
  })

  it("uses a reel-cover style category before falling back to story references", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    const references = readFileSync("lib/content-kit/slide-redesign-generator.ts", "utf8")

    expect(references).toContain('"reel-cover"')
    expect(route).toContain('return "reel-cover"')
    expect(route).toContain('return format === "reel-cover" ? "story-sequence" : undefined')
  })

  it("stores prompt metadata with model and reference urls for admin inspection", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")

    expect(route).toContain("Model provider: openai")
    expect(route).toContain("Model: ${OPENAI_IMAGE_MODEL}")
    expect(route).toContain("Reference URLs used:")
    expect(route).toContain("Style reference URL used:")
  })
})
