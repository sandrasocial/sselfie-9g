import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  deliveredMonthAdminOnly,
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

  it("keeps the first activation limited to Sandra unless rollout is explicit", () => {
    expect(deliveredMonthAdminOnly(undefined)).toBe(true)
    expect(deliveredMonthAdminOnly("true")).toBe(true)
    expect(deliveredMonthAdminOnly("TRUE")).toBe(true)
    expect(deliveredMonthAdminOnly("false")).toBe(false)
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

  it("fails soft when the optional Today enhancement cannot query production data", () => {
    const route = readFileSync("app/api/feed-planner/today/route.ts", "utf8")
    expect(route).toContain('return NextResponse.json({ enabled: false, error: "today_unavailable" })')
  })
})
