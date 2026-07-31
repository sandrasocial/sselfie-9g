// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import type { OutputFormat } from "@/components/app-v3/types"
import {
  isHookLedFormat,
  SSELFIE_HOOK_INTELLIGENCE,
} from "@/lib/content/hook-intelligence"
import { getAppV3MayaSystemPrompt } from "@/lib/app-v3/maya/persona"

vi.mock("server-only", () => ({}))

const TEXT_LED_FORMATS: OutputFormat[] = [
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
]

const VISUAL_ONLY_FORMATS: OutputFormat[] = ["photo", "photoshoot", "video"]

function promptFor(format: OutputFormat) {
  return getAppV3MayaSystemPrompt({
    aestheticName: "Quiet Editorial Morning",
    aestheticIntent: "Warm, candid editorial content with honest identity.",
    format,
    brandContext:
      "She helps women build visible personal brands. Her audience wants a simpler way to create content that feels like them.",
  })
}

describe("SSELFIE Hook Intelligence", () => {
  it.each(TEXT_LED_FORMATS)("guides every text-led Maya format: %s", format => {
    expect(isHookLedFormat(format)).toBe(true)
    expect(promptFor(format)).toContain(SSELFIE_HOOK_INTELLIGENCE)
  })

  it.each(VISUAL_ONLY_FORMATS)("does not burden visual-only format prompts: %s", format => {
    expect(isHookLedFormat(format)).toBe(false)
    expect(promptFor(format)).not.toContain("## HOOK INTELLIGENCE")
  })

  it("keeps the six hook families flexible and invisible", () => {
    for (const family of [
      "Problem",
      "Curiosity",
      "Contrarian",
      "Story",
      "Result",
      "Question",
    ]) {
      expect(SSELFIE_HOOK_INTELLIGENCE).toContain(`- ${family}:`)
    }

    expect(SSELFIE_HOOK_INTELLIGENCE).toContain(
      "Do not force every family or expose these labels to the member."
    )
    expect(SSELFIE_HOOK_INTELLIGENCE).toContain("Do not add a questionnaire.")
    expect(SSELFIE_HOOK_INTELLIGENCE).toContain("Do not show a scorecard")
  })

  it("requires honest proof and delivery of the opening promise", () => {
    expect(SSELFIE_HOOK_INTELLIGENCE).toContain(
      "Never invent numbers, income, results, urgency, experience, or customer proof."
    )
    expect(SSELFIE_HOOK_INTELLIGENCE).toContain(
      "The content after the opening must fulfill the exact promise it creates."
    )
    expect(SSELFIE_HOOK_INTELLIGENCE).toContain("No bait-and-switch")
  })

  it("keeps Maya's assembled prompts free of em dashes", () => {
    for (const format of TEXT_LED_FORMATS) {
      expect(promptFor(format)).not.toContain("—")
    }
  })
})
