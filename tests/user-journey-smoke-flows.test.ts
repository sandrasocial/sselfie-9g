import { describe, expect, it } from "vitest"

import { USER_JOURNEY_SMOKE_FLOWS } from "@/lib/automation/user-journey-smoke-flows"

describe("user journey smoke flows", () => {
  it("checks the membership checkout through the server checkout route", () => {
    const membershipFlow = USER_JOURNEY_SMOKE_FLOWS.find((flow) => flow.name === "Studio Membership")

    expect(membershipFlow).toBeDefined()
    expect(membershipFlow?.landingPath).toBe("/checkout/membership")
    expect(membershipFlow?.trigger.type).toBe("goto")

    if (membershipFlow?.trigger.type === "goto") {
      expect(membershipFlow.trigger.href).toBe("/checkout/membership?interval=month")
    }
  })
})
