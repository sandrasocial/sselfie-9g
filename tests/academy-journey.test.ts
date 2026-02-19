import { describe, expect, it } from "vitest"

import { getAcademyJourneyState } from "@/lib/onboarding/academy-journey"

describe("getAcademyJourneyState", () => {
  it("shows first-generation prompt after first generation", () => {
    const result = getAcademyJourneyState({
      generationCount: 1,
      hasContentPlan: false,
      hoursSinceLastActive: 2,
    })

    expect(result.showAfterFirstGenerationPrompt).toBe(true)
    expect(result.showAfterThreeGenerationsPrompt).toBe(false)
    expect(result.shouldSendInactive48hEmail).toBe(false)
  })

  it("shows three-generations prompt when user has no content plan", () => {
    const result = getAcademyJourneyState({
      generationCount: 3,
      hasContentPlan: false,
      hoursSinceLastActive: 5,
    })

    expect(result.showAfterFirstGenerationPrompt).toBe(false)
    expect(result.showAfterThreeGenerationsPrompt).toBe(true)
  })

  it("does not show three-generations prompt when content plan exists", () => {
    const result = getAcademyJourneyState({
      generationCount: 4,
      hasContentPlan: true,
      hoursSinceLastActive: 8,
    })

    expect(result.showAfterThreeGenerationsPrompt).toBe(false)
  })

  it("flags inactive 48h email when user is inactive and has no content plan", () => {
    const result = getAcademyJourneyState({
      generationCount: 2,
      hasContentPlan: false,
      hoursSinceLastActive: 52,
    })

    expect(result.shouldSendInactive48hEmail).toBe(true)
  })
})
