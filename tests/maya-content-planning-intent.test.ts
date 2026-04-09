import { describe, expect, it } from "vitest"
import { isContentPlanningIntent, isMayaImageGenerationIntent } from "@/lib/maya/auto-select-mode"

describe("isMayaImageGenerationIntent", () => {
  it("detects explicit photo requests", () => {
    expect(isMayaImageGenerationIntent("Please generate 3 photos for my next posts")).toBe(true)
    expect(isMayaImageGenerationIntent("Create images from this idea")).toBe(true)
    expect(isMayaImageGenerationIntent("Show me concept cards for Monday")).toBe(true)
  })

  it("does not treat full feed creation as image-only", () => {
    expect(isMayaImageGenerationIntent("Create a 9-post Instagram feed for my brand")).toBe(false)
    expect(isMayaImageGenerationIntent("Build a new feed grid in minimal style")).toBe(false)
  })
})

describe("isContentPlanningIntent", () => {
  it("does not treat strategy follow-ups with photo asks as feed planning", () => {
    expect(isContentPlanningIntent("Love this — now generate photos from this strategy")).toBe(false)
    expect(isContentPlanningIntent("Create images for each post in the plan")).toBe(false)
  })

  it("still detects feed planning phrases without bare strategy", () => {
    expect(isContentPlanningIntent("I need a feed plan for April")).toBe(true)
    expect(isContentPlanningIntent("Help me with my content strategy for Instagram")).toBe(true)
  })

  it("bare strategy word alone is not enough (avoids sticky feed-planner routing)", () => {
    expect(isContentPlanningIntent("this strategy looks great")).toBe(false)
  })
})
