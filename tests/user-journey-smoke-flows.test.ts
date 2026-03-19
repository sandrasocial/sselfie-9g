import { describe, expect, it } from "vitest"

import { USER_JOURNEY_SMOKE_FLOWS } from "@/lib/automation/user-journey-smoke-flows"

describe("user journey smoke flows", () => {
  it("checks the membership plan picker via its CTA instead of assuming an immediate redirect", () => {
    const membershipFlow = USER_JOURNEY_SMOKE_FLOWS.find((flow) => flow.name === "Studio Membership")

    expect(membershipFlow).toBeDefined()
    expect(membershipFlow?.landingPath).toBe("/checkout/membership")
    expect(membershipFlow?.trigger.type).toBe("button")

    if (membershipFlow?.trigger.type === "button") {
      expect(membershipFlow.trigger.name).toBe("Continue to checkout")
    }
  })
})
