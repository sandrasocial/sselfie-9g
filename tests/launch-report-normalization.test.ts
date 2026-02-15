import { describe, expect, it } from "vitest"

import { getSafeLaunchConversionOps } from "@/lib/analytics/launch-report"

describe("getSafeLaunchConversionOps", () => {
  it("returns defaults when conversionOps is missing", () => {
    const result = getSafeLaunchConversionOps({})

    expect(result).toEqual({
      applications90d: 0,
      qualified90d: 0,
      callsBooked90d: 0,
      offersSent90d: 0,
      closedWon90d: 0,
      cashCollected90dCents: "0",
      newMemberships30d: 0,
      churnedMemberships30d: 0,
      churn30dPct: 0,
      activeMembershipsNow: 0,
    })
  })

  it("coerces partial payload to safe numeric/string defaults", () => {
    const result = getSafeLaunchConversionOps({
      conversionOps: {
        applications90d: 22,
        cashCollected90dCents: "10500",
        churn30dPct: "4.2",
      },
    })

    expect(result).toEqual({
      applications90d: 22,
      qualified90d: 0,
      callsBooked90d: 0,
      offersSent90d: 0,
      closedWon90d: 0,
      cashCollected90dCents: "10500",
      newMemberships30d: 0,
      churnedMemberships30d: 0,
      churn30dPct: 4.2,
      activeMembershipsNow: 0,
    })
  })
})
