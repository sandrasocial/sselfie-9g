import { describe, expect, it } from "vitest"

import { ALLOWED_ANALYTICS_EVENTS, isAllowedAnalyticsEventName } from "@/lib/analytics/event-contract"

describe("analytics event contract", () => {
  it("includes guided activation and onboarding lifecycle events", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("first_generation_guided_start")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("first_generation_guided_complete")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("first_image_generated")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("onboarding_complete")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("credits_used")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("mode_selected")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("onboarding_step_complete")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("onboarding_abandoned")
  })

  it("rejects unknown event names", () => {
    expect(isAllowedAnalyticsEventName("wizard_step_3_complete")).toBe(false)
    expect(isAllowedAnalyticsEventName("totally_unknown_event")).toBe(false)
  })

  it("accepts known event names", () => {
    expect(isAllowedAnalyticsEventName("studio_opened")).toBe(true)
    expect(isAllowedAnalyticsEventName("mode_selected")).toBe(true)
    expect(isAllowedAnalyticsEventName("first_image_generated")).toBe(true)
  })
})
