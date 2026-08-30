import { describe, expect, it } from "vitest"

import {
  getAppV3MayaSystemPrompt,
  MAYA_FASHION_CREATIVE_DIRECTION,
} from "@/lib/app-v3/maya/persona"
import { extractRecentWardrobe } from "@/lib/app-v3/maya/recent-wardrobe"

describe("Maya fashion creative direction", () => {
  it("directs current personal styling without the repetitive beige founder uniform", () => {
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("camel coat")
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("blazer")
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("photo-dump")
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("Vault")
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("off-duty")
    expect(MAYA_FASHION_CREATIVE_DIRECTION).toContain("Do not copy a celebrity")
  })

  it("shows Maya recent wardrobe separately so she can avoid accidental repetition", () => {
    const system = getAppV3MayaSystemPrompt({
      aestheticName: "SSELFIE editorial",
      aestheticIntent: "realistic city photo-dump",
      format: "photo",
      recentWardrobe: [
        "camel wool coat over a black blazer",
        "oversized white shirt with indigo stovepipe jeans",
      ],
    })

    expect(system).toContain("RECENT WARDROBE")
    expect(system).toContain("camel wool coat over a black blazer")
    expect(system).toContain("Do not repeat these by default")
  })

  it("extracts, normalizes, and deduplicates outfit lines without carrying whole prompts", () => {
    expect(
      extractRecentWardrobe([
        {
          generated_prompt:
            "Scene: café.\nOutfit: Black leather bomber, silk skirt.\nPose: walking.",
        },
        { generated_prompt: "**Outfit:** Black leather bomber, silk skirt.\nLighting: daylight." },
        { prompt: "Outfit: Vintage track jacket, poplin trousers, slim trainers." },
      ])
    ).toEqual([
      "Black leather bomber, silk skirt",
      "Vintage track jacket, poplin trousers, slim trainers",
    ])
  })
})
