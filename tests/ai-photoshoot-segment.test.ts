import { describe, expect, it } from "vitest"

import {
  AI_PHOTOSHOOT_AUDIENCE,
  AI_PHOTOSHOOT_INTENT_TAGS,
  buildAiPhotoshootEmailTags,
  buildAiPhotoshootResendTags,
  isAiPhotoshootAudienceTag,
} from "@/lib/audience/ai-photoshoot-segment"

describe("AI Photoshoot Audience segment", () => {
  it("keeps existing email tags while adding the canonical audience and intent tags", () => {
    const tags = buildAiPhotoshootEmailTags(["freebie-subscriber", "ai-photoshoot-audience"], [
      "curious",
      "buyer",
    ])

    expect(tags).toContain("freebie-subscriber")
    expect(tags).toContain(AI_PHOTOSHOOT_AUDIENCE.canonicalTag)
    expect(tags).toContain(AI_PHOTOSHOOT_INTENT_TAGS.curious)
    expect(tags).toContain(AI_PHOTOSHOOT_INTENT_TAGS.buyer)
    expect(tags.filter((tag) => tag === AI_PHOTOSHOOT_AUDIENCE.canonicalTag)).toHaveLength(1)
  })

  it("builds stable Resend tags for business segmentation", () => {
    expect(buildAiPhotoshootResendTags("abandoned")).toEqual({
      audience: "ai-photoshoot",
      segment: "ai-photoshoot-audience",
      product: "ai-photoshoot-prompts",
      ai_photoshoot_audience: "true",
      ai_photoshoot_intent: "abandoned",
    })
  })

  it("identifies only AI Photoshoot Audience tags", () => {
    expect(isAiPhotoshootAudienceTag("ai-photoshoot-audience")).toBe(true)
    expect(isAiPhotoshootAudienceTag("ai-photoshoot-power-user")).toBe(true)
    expect(isAiPhotoshootAudienceTag("freebie-subscriber")).toBe(false)
    expect(isAiPhotoshootAudienceTag("selfie-guide-subscriber")).toBe(false)
  })
})
