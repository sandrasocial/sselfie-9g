import { describe, expect, it } from "vitest"

import {
  shouldApplyBlueprintFallbackRouting,
  shouldRouteMemberToFeedPlannerOnMissingOnboarding,
} from "@/lib/onboarding/studio-onboarding-routing"

describe("studio onboarding routing policy", () => {
  it("does not auto-route free blueprint users to feed planner fallback", () => {
    expect(
      shouldApplyBlueprintFallbackRouting({
        isBlueprintUser: true,
        isMember: false,
        onboardingCompleted: false,
      }),
    ).toBe(false)
  })

  it("routes members via fallback when blueprint onboarding is incomplete", () => {
    expect(
      shouldApplyBlueprintFallbackRouting({
        isBlueprintUser: true,
        isMember: true,
        onboardingCompleted: false,
      }),
    ).toBe(true)
  })

  it("does not route free users to feed planner when onboarding data is missing", () => {
    expect(
      shouldRouteMemberToFeedPlannerOnMissingOnboarding({
        isMember: false,
        blueprintWelcomeShown: false,
        hasBaseWizardData: false,
        hasExtensionData: false,
      }),
    ).toBe(false)
  })

  it("routes member users to feed planner when onboarding data is missing after welcome", () => {
    expect(
      shouldRouteMemberToFeedPlannerOnMissingOnboarding({
        isMember: true,
        blueprintWelcomeShown: true,
        hasBaseWizardData: true,
        hasExtensionData: false,
      }),
    ).toBe(true)
  })
})
