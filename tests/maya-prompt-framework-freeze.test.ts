// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import { getAppV3MayaSystemPrompt } from "@/lib/app-v3/maya/persona"
import {
  applyMayaReasoningDisabled,
  getMayaRoutingSnapshot,
  MAYA_REASONING_DISABLED,
} from "@/lib/maya/openrouter"
import {
  SSELFIE_GRAPHIC_STYLE_PROMPT,
  SSELFIE_INSPIRATION_CLOSE_RECREATE,
  SSELFIE_INSPIRATION_SET_VARIATION,
} from "@/lib/app-v3/maya/visual-rules"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

vi.mock("server-only", () => ({}))

// MAYA CREATIVE FREEZE (2026-07-15): these snapshots ARE the frozen prompt framework.
// Context: docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md. After a member reported output
// that "felt off", forensics proved the compiled prompts were byte-identical across days -
// the fear was variance, not regression. This test makes that proof permanent: the same
// brief must always compile to the same prompt. If this test fails, someone changed Maya's
// creative pipeline. That is allowed ONLY as a deliberate, Sandra-approved prompt change,
// with the snapshot updated in the same commit and the change named in the commit message.
// It must never fail as a side effect of UX, routing, credits, or cleanup work.

const FIXED_BRIEF: CreativeBrief = {
  outfit: "The Row cream cashmere turtleneck, tailored charcoal trousers",
  setting: "north-facing London apartment, marble console, soft morning haze",
  mood: "calm, assured, caught mid-thought",
  pose: "seated at the edge of a linen sofa, looking off-camera",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light, gentle falloff",
}

const FIXED_GRAPHIC_BRIEF: CreativeBrief = {
  ...FIXED_BRIEF,
  graphic: {
    headline: "Freedom Looks Like This",
    subline: "A brand that finally feels like you.",
    designSystem: "cutout-editorial",
    slides: [
      {
        heading: "Freedom Looks Like This",
        body: "A brand that finally feels like you.",
        role: "hook",
        purpose: "open with the emotional promise",
        visualConcept: "same woman stepping into calm morning light",
        imagePrompt: "same woman, linen apartment, calm morning light, editorial movement",
        visualReason: "the open doorway makes freedom visible",
      },
      {
        heading: "Create Without Performing",
        body: "Still your face. Still your story.",
        role: "value",
        purpose: "make the product truth tangible",
        visualConcept: "same woman reviewing her own editorial portraits",
        imagePrompt: "same woman at marble console reviewing editorial portraits",
        visualReason: "the portraits connect identity to creation",
      },
      {
        heading: "Start With One Selfie",
        body: "Maya helps with the rest.",
        role: "cta",
        purpose: "give one clear next step",
        visualConcept: "same woman holding her phone beside a finished brand image",
        imagePrompt: "same woman holding phone beside finished editorial brand image",
        visualReason: "the phone makes the first action obvious",
      },
    ],
  },
}

describe("Maya prompt framework freeze", () => {
  it("compiles the frozen photo prompt", () => {
    const jobs = compileConceptJobs(FIXED_BRIEF, "photo")
    expect(jobs).toHaveLength(1)
    expect(
      jobs[0].passes
        .map(pass => `[input:${pass.input}]\n${pass.prompt}`)
        .join("\n\n=== pass ===\n\n")
    ).toMatchSnapshot()
  })

  it("compiles the frozen photoshoot prompt (hero role)", () => {
    const jobs = compileConceptJobs({ ...FIXED_BRIEF, shotRole: "seated-hero" }, "photoshoot")
    expect(jobs).toHaveLength(1)
    expect(
      jobs[0].passes
        .map(pass => `[input:${pass.input}]\n${pass.prompt}`)
        .join("\n\n=== pass ===\n\n")
    ).toMatchSnapshot()
  })

  it("compiles the frozen photoshoot scene-foundation prompt", () => {
    const jobs = compileConceptJobs(
      {
        ...FIXED_BRIEF,
        shotRole: "seated-hero",
        sceneTemplate:
          "Low seated editorial portrait beside a tall north-facing window, quiet linen textures, natural posture, medium-wide crop.",
      },
      "photoshoot"
    )
    expect(jobs).toHaveLength(1)
    expect(
      jobs[0].passes
        .map(pass => `[input:${pass.input}]\n${pass.prompt}`)
        .join("\n\n=== pass ===\n\n")
    ).toMatchSnapshot()
  })

  it.each([
    ["carousel", FIXED_GRAPHIC_BRIEF],
    ["reel-cover", FIXED_GRAPHIC_BRIEF],
    ["story-slide", FIXED_GRAPHIC_BRIEF],
  ] as const)("compiles the frozen %s prompt", (format, brief) => {
    const jobs = compileConceptJobs(brief, format)
    expect(
      jobs.map(job =>
        job.passes.map(pass => `[input:${pass.input}]\n${pass.prompt}`).join("\n\n=== pass ===\n\n")
      )
    ).toMatchSnapshot()
  })

  it("assembles the frozen Stage-1 prompt through Maya's production builder", () => {
    const system = getAppV3MayaSystemPrompt({
      aestheticName: "Quiet Editorial Morning",
      aestheticIntent:
        "A calm editorial founder portrait world with natural movement, refined light, and honest identity.",
      format: "photo",
      brandKit: {
        colors: ["warm ivory", "charcoal", "soft stone"],
        fonts: ["Cormorant Garamond", "Inter"],
        vibe: "quietly premium, human, free",
      },
      memory: {
        agentName: "Maya",
        brandNotes: "She helps women build visible personal brands without losing themselves.",
        preferences: "Natural movement, honest skin, no stiff studio poses.",
        likenessNotes: ["hair: dark brown, not black", "keep natural smile lines"],
      },
      recentActivity: ["Founder freedom story", "One-selfie tutorial"],
      brandContext:
        "Founder: Sandra. Audience: women rebuilding visibility and income. Core promise: freedom through a brand that feels like you.",
      selectedShotGuide:
        "Seated three-quarter portrait beside a tall window, hands relaxed, gaze off-camera.",
      vaultStyleGuide:
        "Quiet Luxury Morning: cream knit, charcoal tailoring, soft window light, lived-in apartment, candid editorial movement.",
    })

    expect(system).toMatchSnapshot()
  })

  it("pins Maya's model routing and reasoning-disabled request settings", () => {
    expect(getMayaRoutingSnapshot()).toMatchSnapshot()
    expect(MAYA_REASONING_DISABLED).toEqual({
      openrouter: { enabled: false },
      anthropic: { type: "disabled" },
    })
    expect(
      applyMayaReasoningDisabled({ model: "anthropic/claude-sonnet-5" }, "openrouter")
    ).toEqual({
      model: "anthropic/claude-sonnet-5",
      reasoning: { enabled: false },
    })
    expect(applyMayaReasoningDisabled({ model: "claude-sonnet-4-6" }, "anthropic")).toEqual({
      model: "claude-sonnet-4-6",
      thinking: { type: "disabled" },
    })
  })

  it("keeps the shared visual-rule and inspiration-mode blocks frozen", () => {
    expect(SSELFIE_GRAPHIC_STYLE_PROMPT).toMatchSnapshot()
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toMatchSnapshot()
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toMatchSnapshot()
  })
})
