import { describe, expect, it } from "vitest"
import { buildVideoAuthorityPrompt } from "@/lib/generation/prompt/video-authority"

describe("video authority prompt builder", () => {
  it("keeps motion prompt as base and ensures camera direction", () => {
    const result = buildVideoAuthorityPrompt({
      motionPrompt: "Head turns toward window with subtle breeze in hair",
    })

    expect(result.prompt).toContain("Head turns toward window with subtle breeze in hair")
    expect(result.prompt.toLowerCase()).toContain("camera")
  })

  it("adds contextual directives from category and style notes", () => {
    const result = buildVideoAuthorityPrompt({
      motionPrompt: "Model adjusts jacket while walking slowly",
      category: "fashion",
      styleNotes: ["No smile please", "Keep it cinematic"],
      recommendedSource: "custom_model",
      uploadsTotal: 12,
      offerBriefPrefill: {
        offerType: "Coaching",
        transformation: "Scale premium offers",
        idealClient: "Women founders",
      },
    })

    expect(result.builder).toBe("video-authority-contextual-v1")
    expect(result.prompt.toLowerCase()).toContain("neutral and natural")
    expect(result.prompt.toLowerCase()).toContain("cinematic")
    expect(result.prompt.toLowerCase()).toContain("preserve identity consistency")
    expect(result.prompt.toLowerCase()).toContain("brand promise")
  })

  it("falls back to image description when motion prompt is missing", () => {
    const result = buildVideoAuthorityPrompt({
      imageDescription: "Elegant founder in cafe during golden hour",
      category: "lifestyle",
    })

    expect(result.prompt).toContain("Elegant founder in cafe during golden hour")
  })

  it("returns safe default when no usable input exists", () => {
    const result = buildVideoAuthorityPrompt({})

    expect(result.prompt).toContain("Standing naturally")
    expect(result.prompt.toLowerCase()).toContain("camera")
  })
})

