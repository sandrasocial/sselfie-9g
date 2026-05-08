// @vitest-environment node
import { describe, expect, it } from "vitest"

describe("monthly usage recap wiring", () => {
  it("keeps only the active onboarding segments in the live config", async () => {
    const { MARKETING_SEGMENTS } = await import("@/lib/email/config")

    expect(Object.keys(MARKETING_SEGMENTS)).toEqual([
      "onboardingDay0",
      "onboardingDay2",
      "onboardingDay7",
      "paidBlueprintDay1",
      "paidBlueprintDay3",
      "paidBlueprintDay7",
    ])
  })
})
