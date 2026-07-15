import { describe, expect, it } from "vitest"

import {
  deliveredMonthEnabled,
  parseCalendarPregenWeeklyCap,
  remainingWeeklyPregenAllowance,
} from "@/lib/feed-planner/delivered-month"

describe("delivered month guardrails", () => {
  it("is disabled unless the production flag is exactly true", () => {
    expect(deliveredMonthEnabled(undefined)).toBe(false)
    expect(deliveredMonthEnabled("false")).toBe(false)
    expect(deliveredMonthEnabled("TRUE")).toBe(false)
    expect(deliveredMonthEnabled("true")).toBe(true)
  })

  it("defaults to ten and clamps unsafe weekly caps", () => {
    expect(parseCalendarPregenWeeklyCap(undefined)).toBe(10)
    expect(parseCalendarPregenWeeklyCap("nope")).toBe(10)
    expect(parseCalendarPregenWeeklyCap("0")).toBe(1)
    expect(parseCalendarPregenWeeklyCap("400")).toBe(31)
    expect(parseCalendarPregenWeeklyCap("7")).toBe(7)
  })

  it("never lets the automatic weekly allowance go negative", () => {
    expect(remainingWeeklyPregenAllowance(10, 0)).toBe(10)
    expect(remainingWeeklyPregenAllowance(10, 4)).toBe(6)
    expect(remainingWeeklyPregenAllowance(10, 10)).toBe(0)
    expect(remainingWeeklyPregenAllowance(10, 12)).toBe(0)
  })
})
