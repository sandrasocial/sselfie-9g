import { describe, expect, it } from "vitest"

import { buildActivationKpiFromWindow } from "@/lib/analytics/activation-kpi"

describe("buildActivationKpiFromWindow", () => {
  it("calculates rates and median from valid completion samples", () => {
    const result = buildActivationKpiFromWindow({
      windowDays: 7,
      newSignups: 20,
      starts: 10,
      completes: 6,
      completesWithin5m: 2,
      completesWithin60m: 4,
      ttfiSecondsSamples: [120, 240, 360, 480, 600, 900],
      periodStart: "2026-02-21T00:00:00.000Z",
      periodEnd: "2026-02-28T00:00:00.000Z",
    })

    expect(result.metrics.medianTtfiSeconds).toBe(420)
    expect(result.metrics.medianTtfiMinutes).toBe(7)
    expect(result.rates.activation5mFromStartsPct).toBe(20)
    expect(result.rates.activation60mFromStartsPct).toBe(40)
    expect(result.rates.activation60mFromSignupsPct).toBe(20)
    expect(result.rates.completionFromStartsPct).toBe(60)
    expect(result.rates.startCoveragePct).toBe(50)
  })

  it("returns zero-safe rates when denominators are zero", () => {
    const result = buildActivationKpiFromWindow({
      windowDays: 7,
      newSignups: 0,
      starts: 0,
      completes: 0,
      completesWithin5m: 0,
      completesWithin60m: 0,
      ttfiSecondsSamples: [],
      periodStart: "2026-02-21T00:00:00.000Z",
      periodEnd: "2026-02-28T00:00:00.000Z",
    })

    expect(result.metrics.medianTtfiSeconds).toBeNull()
    expect(result.metrics.medianTtfiMinutes).toBeNull()
    expect(result.rates.activation5mFromStartsPct).toBe(0)
    expect(result.rates.activation60mFromStartsPct).toBe(0)
    expect(result.rates.activation60mFromSignupsPct).toBe(0)
    expect(result.rates.completionFromStartsPct).toBe(0)
    expect(result.rates.startCoveragePct).toBe(0)
  })
})
