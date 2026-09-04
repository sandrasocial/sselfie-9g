// @vitest-environment node

import { describe, expect, it } from "vitest"

import type { OutputFormat } from "@/components/app-v3/types"
import type { CaptureStyle, CreativeBrief, PolishLevel } from "@/lib/app-v3/maya/concept-types"
import { OUTPUT_FORMAT_CONTRACT } from "@/lib/app-v3/output-format-contract"
import { compileConceptJobs, conceptOpenAISize } from "@/lib/app-v3/prompt-compiler"

const SCENARIOS: Array<{
  name: string
  captureStyle: CaptureStyle
  polishLevel: PolishLevel
  setting: string
}> = [
  { name: "messy Sunday morning", captureStyle: "candid-phone", polishLevel: "everyday", setting: "real kitchen table with cold coffee and breakfast dishes" },
  { name: "coffee and work", captureStyle: "friend-took-it", polishLevel: "everyday", setting: "corner cafe table with laptop and half-finished coffee" },
  { name: "walking through Marbella", captureStyle: "street", polishLevel: "refined", setting: "sunlit Marbella side street with real pedestrians in the distance" },
  { name: "phone selfie", captureStyle: "candid-phone", polishLevel: "everyday", setting: "apartment hallway mirror before leaving home" },
  { name: "dinner photo", captureStyle: "friend-took-it", polishLevel: "everyday", setting: "busy restaurant table during dinner" },
  { name: "founder working", captureStyle: "documentary", polishLevel: "refined", setting: "home desk during a real working afternoon" },
  { name: "personal story", captureStyle: "lifestyle", polishLevel: "everyday", setting: "sofa beside a stack of laundry and an open notebook" },
  { name: "travel", captureStyle: "documentary", polishLevel: "refined", setting: "airport gate beside carry-on luggage" },
  { name: "brand portrait", captureStyle: "polished-brand", polishLevel: "refined", setting: "simple window-lit workspace" },
  { name: "product launch", captureStyle: "cinematic", polishLevel: "campaign", setting: "dark launch-night room with product screen glow" },
  { name: "fashion image", captureStyle: "editorial", polishLevel: "campaign", setting: "minimal city location with directional afternoon light" },
  { name: "full shoot", captureStyle: "photoshoot", polishLevel: "campaign", setting: "cohesive on-location campaign set" },
]

function briefFor(scenario: (typeof SCENARIOS)[number]): CreativeBrief {
  return {
    captureStyle: scenario.captureStyle,
    polishLevel: scenario.polishLevel,
    vaultCollectionId: "benchmark-vault-world",
    outfit: "white cotton shirt, straight dark denim, worn naturally",
    setting: scenario.setting,
    mood: "present and believable",
    pose: "doing the ordinary action described by the scene",
    cameraSpec:
      scenario.captureStyle === "candid-phone" || scenario.captureStyle === "friend-took-it"
        ? "iPhone back camera"
        : "Fujifilm X-T5, 35mm lens",
    lighting: "available light that exists in the scene",
  }
}

describe("Maya capture-treatment benchmark", () => {
  it.each(SCENARIOS)("keeps $name in its chosen visual treatment", scenario => {
    const prompt = compileConceptJobs(briefFor(scenario), "photo")[0].passes[0].prompt

    expect(prompt).toContain(`Capture treatment:`)
    expect(prompt).toContain(`Creative polish: ${scenario.polishLevel}.`)
    expect(prompt).not.toContain("Create an ultra-realistic editorial brand photograph")
    expect(prompt).not.toContain("Hasselblad X2D 100C")
  })

  it("does not force an everyday phone moment into a shoot", () => {
    const prompt = compileConceptJobs(briefFor(SCENARIOS[0]), "photo")[0].passes[0].prompt
    expect(prompt).toContain("believable recent phone-camera photo")
    expect(prompt).toContain("Do not make it look like a brand shoot or campaign")
  })

  it("still allows a deliberate editorial request", () => {
    const prompt = compileConceptJobs(briefFor(SCENARIOS[10]), "photo")[0].passes[0].prompt
    expect(prompt).toContain("editorial fashion photograph")
    expect(prompt).toContain("Creative polish: campaign")
  })
})

describe("shared Maya output format contract", () => {
  const expected: Array<[OutputFormat, string, string]> = [
    ["photo", "4:5", "1024x1280"],
    ["photoshoot", "4:5", "1024x1280"],
    ["carousel", "4:5", "1024x1280"],
    ["reel-cover", "9:16", "1008x1792"],
    ["story-slide", "9:16", "1008x1792"],
    ["story-sequence", "9:16", "1008x1792"],
  ]

  it.each(expected)("maps %s to %s and %s", (format, aspect, size) => {
    expect(OUTPUT_FORMAT_CONTRACT[format].aspect).toBe(aspect)
    expect(conceptOpenAISize(format)).toBe(size)
  })
})
